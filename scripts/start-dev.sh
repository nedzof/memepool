#!/bin/bash

# Exit on error and show commands
set -ex

# Function to check if a port is in use
check_port() {
    lsof -i:$1 >/dev/null 2>&1
    return $?
}

# Function to kill process on a port
kill_port() {
    local port=$1
    if check_port $port; then
        echo "Killing process on port $port..."
        lsof -t -i:$port | xargs kill -9 2>/dev/null || {
            echo "Could not kill process with regular permissions, trying with sudo..."
            sudo kill -9 $(sudo lsof -t -i:$port) 2>/dev/null || true
        }
    fi
}

# Function to check GPU availability using nvidia-smi
check_gpu() {
    if command -v nvidia-smi &> /dev/null; then
        if nvidia-smi &> /dev/null; then
            return 0  # GPU is available
        fi
    fi
    return 1  # GPU is not available
}

# Function to setup SVD model
setup_svd_model() {
    echo "Setting up SVD model..."
    
    # Check if git-lfs is installed
    if ! command -v git-lfs &> /dev/null; then
        echo "Installing git-lfs..."
        sudo apt-get update
        sudo apt-get install -y git-lfs
    fi
    
    # Initialize git-lfs
    git lfs install
    
    # Check if SVD model exists
    if [ ! -d "ComfyUI/models/svd/stable-video-diffusion-img2vid-xt" ]; then
        echo "Downloading SVD model..."
        cd ComfyUI
        mkdir -p models/svd
        cd models/svd
        git clone https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt stable-video-diffusion-img2vid-xt
        cd ../..
        cd ..
    else
        echo "SVD model already exists"
    fi
}

# Function to start ComfyUI in the background
start_comfyui() {
    echo "Starting ComfyUI server..."
    cd ComfyUI
    source venv/bin/activate
    # Kill any process using port 8188
    kill -9 $(lsof -t -i:8188) 2>/dev/null || true
    
    # Check GPU availability and set appropriate flags
    if check_gpu; then
        echo "GPU detected, using CUDA acceleration"
        PYTHONPATH="." python main.py --listen --port 8188 &
    else
        echo "No GPU detected, falling back to CPU mode"
        PYTHONPATH="." python main.py --listen --port 8188 --cpu &
    fi
    
    # Wait for server to initialize
    echo "Waiting for ComfyUI server to initialize..."
    sleep 10
    cd ..
    echo "ComfyUI server started on port 8188"
}

# Clear ports
sudo kill -9 $(sudo lsof -t -i:3000 -i:3001 -i:8000) 2>/dev/null || true

# Wait a moment to ensure ports are cleared
sleep 1

# Add delay before starting servers
echo "Waiting for services to initialize..."
sleep 5

# Start the development servers
echo "Starting development servers..."
npm run dev:all

echo "Starting video worker..."
ts-node src/backend/workers/videoWorker.ts &

echo "Starting local model server..."
ts-node src/backend/services/modelServing.service.ts start &

echo "Activating default model version..."
ts-node src/backend/scripts/activateModel.ts

echo "Starting auto-scaling worker..."
ts-node src/backend/workers/scalingWorker.ts &

# Start the development servers
npm run dev:all

# Start core services first
echo "Starting model server..."
ts-node src/backend/services/modelServing.service.ts start 2>&1 | tee logs/model-server.log &

echo "Waiting for model server..."
sleep 5
curl -v http://localhost:8000/health || echo "Model server not ready"

echo "Starting block state service..."
ts-node src/backend/services/blockState.service.ts 2>&1 | tee logs/block-state.log &

echo "Waiting for block state initialization..."
sleep 3
curl -v http://localhost:3001/api/health || echo "Block state not ready"

# Start main server
echo "Starting main server..."
tsx watch src/backend/server.ts 2>&1 | tee logs/main-server.log &

# Start frontend
echo "Starting frontend..."
cd src/frontend && vite 2>&1 | tee -a logs/frontend.log 