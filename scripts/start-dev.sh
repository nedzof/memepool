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

# Function to start ComfyUI in the background
start_comfyui() {
    echo "Starting ComfyUI server..."
    cd ComfyUI
    source venv/bin/activate
    python main.py --listen &
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