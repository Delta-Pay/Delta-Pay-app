@echo off
echo Starting Delta Pay Application...
echo ================================

REM Check if Deno is installed
deno --version >nul 2>&1
if errorlevel 1 (
    echo Error: Deno is not installed. Please install Deno first.
    echo Visit: https://deno.land/#installation
    pause
    exit /b 1
)

REM Check if Node.js is installed (for frontend)
node --version >nul 2>&1
if errorlevel 1 (
    echo Warning: Node.js is not installed. Frontend may not work.
)

echo Starting backend server on port 3623...
echo Backend will be available at: http://localhost:3623
echo Default admin credentials: username=admin, password=admin123
echo.

REM Start the backend server
deno run --allow-net --allow-read --allow-write src/backend/server.ts

pause