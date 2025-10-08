#!/bin/bash

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down Delta Pay..."

  if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping frontend server (PID: $FRONTEND_PID)..."
    kill -TERM "$FRONTEND_PID" 2>/dev/null
    wait "$FRONTEND_PID" 2>/dev/null
  fi

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

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Frontend cannot start."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

cd src/frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

cd ../..

echo ""
echo "Starting backend server on port 3623..."
deno run --allow-net --allow-read --allow-write --allow-env src/backend/server.ts &
BACKEND_PID=$!

sleep 2

echo "Starting frontend server on port 5173..."
cd src/frontend && npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "================================"
echo "Delta Pay is running!"
echo "Backend:  http://localhost:3623"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop all servers"
echo "================================"
echo ""

wait
