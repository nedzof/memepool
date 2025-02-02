#!/bin/bash

# Exit on error and show commands
set -ex

# Get the absolute path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_INFERENCE_DIR="${PROJECT_ROOT}/ai_inference"

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

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "Docker is not running. Starting Docker..."
        sudo systemctl start docker
        sleep 5
    fi
}

# Function to check NVIDIA GPU availability
check_gpu() {
    if command -v nvidia-smi &> /dev/null && nvidia-smi &> /dev/null; then
        echo "NVIDIA GPU detected"
        return 0
    else
        echo "No NVIDIA GPU detected, will use CPU mode"
        return 1
    fi
}

# Function to check if AI inference container needs rebuild
check_ai_inference_rebuild() {
    local HASH_FILE="${AI_INFERENCE_DIR}/.ai_inference_hash"
    local current_hash=$(cd "${PROJECT_ROOT}" && find ai_inference -type f -exec md5sum {} \; | sort | md5sum)
    
    if [ ! -f "$HASH_FILE" ] || [ "$(cat $HASH_FILE 2>/dev/null)" != "$current_hash" ]; then
        echo "Changes detected in AI inference files, rebuilding container..."
        mkdir -p "$(dirname "$HASH_FILE")"
        echo "$current_hash" > "$HASH_FILE"
        return 0
    fi
    return 1
}

# Function to run docker-compose command
docker_compose_cmd() {
    local cmd=$1
    shift
    (cd "${AI_INFERENCE_DIR}" && docker-compose $cmd "$@")
}

# Function to manage AI inference container
setup_ai_inference() {
    echo "Setting up AI inference service..."
    
    # Create ai_inference directory if it doesn't exist
    mkdir -p "${AI_INFERENCE_DIR}"

    # Check if rebuild is needed
    if check_ai_inference_rebuild; then
        echo "Stopping existing containers..."
        docker_compose_cmd down
        echo "Building and starting containers..."
        
        # Check GPU availability and set compose file accordingly
        if check_gpu; then
            docker_compose_cmd up -d --build
        else
            # Use CPU-only configuration
            DOCKER_DEFAULT_PLATFORM=linux/amd64 docker_compose_cmd -f docker-compose.cpu.yml up -d --build
        fi
    else
        echo "No changes detected, ensuring containers are running..."
        if check_gpu; then
            docker_compose_cmd up -d
        else
            DOCKER_DEFAULT_PLATFORM=linux/amd64 docker_compose_cmd -f docker-compose.cpu.yml up -d
        fi
    fi
    
    # Wait for gRPC service to be ready
    echo "Waiting for gRPC service..."
    timeout=30
    while ! nc -z localhost 50051 && [ $timeout -gt 0 ]; do
        sleep 1
        ((timeout--))
    done
    
    if [ $timeout -eq 0 ]; then
        echo "Warning: gRPC service did not start in time"
    else
        echo "gRPC service is ready"
    fi
}

# Function to cleanup on script exit
cleanup() {
    echo "Cleaning up..."
    # Kill any remaining processes
    kill_port 3000
    kill_port 3001
    kill_port 8000
    
    # Stop AI inference containers gracefully
    echo "Stopping AI inference containers..."
    docker_compose_cmd down
    
    echo "Cleanup complete"
}

# Register cleanup function to run on script exit
trap cleanup EXIT

# Clear ports
sudo kill -9 $(sudo lsof -t -i:3000 -i:3001 -i:8000) 2>/dev/null || true

# Wait a moment to ensure ports are cleared
sleep 1

# Check and setup Docker
check_docker

# Setup AI inference service
setup_ai_inference

# Wait for services to initialize
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

# Start core services first
echo "Starting model server..."
ts-node src/backend/services/modelServing.service.ts start 2>&1 | tee logs/model-server.log &

echo "Waiting for model server..."
sleep 5
curl -v http://localhost:8000/health || echo "Model server not ready"

echo "Starting block state service..."
ts-node src/backend/services/blockState.service.ts 2>&1 | tee logs/block-state.log &

echo "Starting lightweight model service..."
ts-node src/backend/services/lightweightModel.service.ts &

# Start main server
echo "Starting main server..."
tsx watch src/backend/server.ts 2>&1 | tee logs/main-server.log &

# Start frontend
echo "Starting frontend..."
cd src/frontend && vite 2>&1 | tee -a logs/frontend.log 