#!/bin/bash

echo "Starting Delta Pay Application..."
echo "================================"

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "Error: Deno is not installed. Please install Deno first."
    echo "Visit: https://deno.land/#installation"
    exit 1
fi

# Check if Node.js is installed (for frontend)
if ! command -v node &> /dev/null; then
    echo "Warning: Node.js is not installed. Frontend may not work."
fi

echo "Starting backend server on port 3623..."
echo "Backend will be available at: http://localhost:3623"


# Start the backend server
deno run --allow-net --allow-read --allow-write --allow-env src/backend/server.ts