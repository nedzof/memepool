from fastapi import FastAPI, File, UploadFile
import torch
from diffusers import StableVideoDiffusionPipeline
from concurrent import futures
import grpc
import video_pb2
import video_pb2_grpc
import io
from PIL import Image
import os
import time

app = FastAPI()

# Check if we should use CPU
USE_CPU = os.getenv('USE_CPU', '0') == '1'
DEVICE = "cpu" if USE_CPU else "cuda"

# Track model loading status
model_loading = True
model_loading_start = time.time()

@app.on_event("startup")
async def startup_event():
    print(f"Starting AI Video Service on {DEVICE}")
    print("Note: The service will be ready to handle requests after the model is loaded")
    print("Model loading progress will be shown in the logs")

@app.get("/health")
async def health_check():
    global model_loading, model_loading_start
    return {
        "status": "loading" if model_loading else "ready",
        "elapsed_seconds": int(time.time() - model_loading_start),
        "device": DEVICE
    }

# Initialize the pipeline with appropriate device
pipe = None
try:
    print("Loading Stable Video Diffusion model...")
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid-xt",
        torch_dtype=torch.float16 if not USE_CPU else torch.float32,
        variant="fp16" if not USE_CPU else None
    ).to(DEVICE)

    # If using CPU, enable memory efficient attention
    if USE_CPU:
        pipe.enable_model_cpu_offload()
        pipe.enable_attention_slicing()
    
    model_loading = False
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")

class VideoGeneratorServicer(video_pb2_grpc.VideoGeneratorServicer):
    def GenerateVideo(self, request, context):
        global model_loading, pipe
        if model_loading or pipe is None:
            context.abort(grpc.StatusCode.UNAVAILABLE, "Model is still loading")
            
        # Convert bytes to image
        image = Image.open(io.BytesIO(request.image))
        
        # Generate video
        result = pipe(
            image=image,
            fps=request.fps,
            motion_bucket_id=int(request.motion * 255),
            num_frames=request.frames
        )
        
        return video_pb2.VideoResponse(
            video=result.frames[0].tobytes(),
            metadata=video_pb2.VideoMetadata(
                model_version="svd-xt-1.1",
                duration=request.frames/request.fps,
                processing_time=result.latency
            )
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    video_pb2_grpc.add_VideoGeneratorServicer_to_server(
        VideoGeneratorServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

@app.post("/generate")
async def generate_video(
    image: UploadFile = File(...),
    fps: int = 6,
    frames: int = 14,
    motion: float = 0.5
):
    global model_loading, pipe
    if model_loading or pipe is None:
        elapsed_minutes = int((time.time() - model_loading_start) / 60)
        return {"error": f"Model is still loading ({elapsed_minutes} minutes elapsed)"}
        
    # Process image
    img_data = await image.read()
    
    # Generate video frames
    result = pipe(
        image=img_data,
        fps=fps,
        motion_bucket_id=int(motion * 255),
        num_frames=frames,
        decode_chunk_size=8
    ).frames[0]
    
    return {
        "video": result.tobytes(),
        "metadata": {
            "model": "svd-xt-1.1",
            "duration": frames/fps,
            "device": DEVICE
        }
    }

if __name__ == "__main__":
    import threading
    # Start gRPC server in background
    grpc_thread = threading.Thread(target=serve, daemon=True)
    grpc_thread.start()
    
    # Start HTTP server
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 