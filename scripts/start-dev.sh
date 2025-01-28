#!/bin/bash

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
        sudo kill -9 $(sudo lsof -t -i:$port) 2>/dev/null || true
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
kill_port 3000
kill_port 4000
kill_port 8188  # ComfyUI port

# Wait a moment to ensure ports are cleared
sleep 1

# Start ComfyUI server
start_comfyui

# Wait for ComfyUI to initialize
sleep 5

# Start the development servers
echo "Starting development servers..."
npm run dev:all 