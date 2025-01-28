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
        lsof -t -i:$port | xargs kill -9 2>/dev/null || {
            echo "Could not kill process with regular permissions, trying with sudo..."
            sudo kill -9 $(sudo lsof -t -i:$port) 2>/dev/null || true
        }
    fi
}

# Clear ports
kill_port 3000
kill_port 4000

# Wait a moment to ensure ports are cleared
sleep 1

# Start the development servers
echo "Starting development servers..."
npm run dev:all 