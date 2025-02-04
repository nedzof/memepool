from fastapi import FastAPI, File, UploadFile, HTTPException
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
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Check if we should use CPU
USE_CPU = os.getenv('USE_CPU', '0') == '1'
DEVICE = "cpu" if USE_CPU else "cuda"

# Track model loading status
model_loading = True
model_loading_start = time.time()

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting AI Video Service on {DEVICE}")
    logger.info("Note: The service will be ready to handle requests after the model is loaded")
    logger.info("Model loading progress will be shown in the logs")

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
    logger.info(f"Loading Stable Video Diffusion model on {DEVICE}...")
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid-xt",
        torch_dtype=torch.float32,  # Always use float32 for CPU
        variant=None  # Don't use fp16 variant for CPU
    )
    
    # Move to device and optimize for CPU if needed
    pipe = pipe.to(DEVICE)
    if USE_CPU:
        # Enable attention slicing to reduce memory usage
        pipe.enable_attention_slicing()
        # Set smaller batch size for CPU
        pipe.batch_size = 1
    
    model_loading = False
    logger.info("Model loaded successfully!")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    raise

class VideoGeneratorServicer(video_pb2_grpc.VideoGeneratorServicer):
    def GenerateVideo(self, request, context):
        global model_loading, pipe
        try:
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
        except Exception as e:
            logger.error(f"Error in gRPC video generation: {e}")
            context.abort(grpc.StatusCode.INTERNAL, str(e))

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
    try:
        if model_loading or pipe is None:
            elapsed_minutes = int((time.time() - model_loading_start) / 60)
            raise HTTPException(
                status_code=503,
                detail=f"Model is still loading ({elapsed_minutes} minutes elapsed)"
            )
            
        # Process image
        img_data = await image.read()
        
        try:
            # Validate image
            img = Image.open(io.BytesIO(img_data))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")
        
        # Generate video frames
        try:
            result = pipe(
                image=img,
                fps=fps,
                motion_bucket_id=int(motion * 255),
                num_frames=frames,
                decode_chunk_size=8
            ).frames[0]
        except Exception as e:
            logger.error(f"Error generating video: {e}")
            raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")
        
        return {
            "video": result.tobytes(),
            "metadata": {
                "model": "svd-xt-1.1",
                "duration": frames/fps,
                "device": DEVICE
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in video generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import threading
    # Start gRPC server in background
    grpc_thread = threading.Thread(target=serve, daemon=True)
    grpc_thread.start()
    
    # Start HTTP server
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 