#!/bin/bash

BACKEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down Delta Pay..."

  if [ -n "$BACKEND_PID" ]; then
    echo "Stopping backend server (PID: $BACKEND_PID)..."
    kill -TERM "$BACKEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
  fi

  echo "Shutdown complete."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting Delta Pay Application..."
echo "================================"

if ! command -v deno &> /dev/null; then
    echo "Error: Deno is not installed. Please install Deno first."
    echo "Visit: https://deno.land/#installation"
    exit 1
fi

echo "Starting backend server on port 3623..."
echo "Backend available at: http://localhost:3623"
echo "Press Ctrl+C to stop the server"
echo ""

deno run --allow-net --allow-read --allow-write --allow-env src/backend/server.ts &
BACKEND_PID=$!

wait "$BACKEND_PID"