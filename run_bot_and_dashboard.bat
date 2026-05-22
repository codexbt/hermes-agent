@echo off
REM ============================================================
REM HermesClaw Bot + 3D Dashboard (Unified Launcher)
REM Run both bot and dashboard simultaneously with one command
REM ============================================================
REM Usage: run_bot_and_dashboard.bat
REM        OR: cmd /c run_bot_and_dashboard.bat
REM
REM This script:
REM 1. Sets up Python virtual environment
REM 2. Installs Python dependencies
REM 3. Sets up Node.js dependencies for dashboard
REM 4. Starts FastAPI backend on port 8001 (new window)
REM 5. Starts React dashboard dev server on port 3000 (new window)
REM 6. Starts bot/swarm orchestrator (new window)
REM ============================================================

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo HermesClaw: Bot + Dashboard Unified Launcher
echo ============================================================
echo.

REM Create .env from .env.example if it doesn't exist
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo ^[INFO^] .env created. Please edit it with your API keys!
    echo.
)

REM Create venv if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate venv
echo Activating Python virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate venv
    pause
    exit /b 1
)

REM Install Python dependencies
echo Installing Python dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python packages
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Starting Services...
echo ============================================================
echo.
echo ^[1/3^] Starting FastAPI Backend (http://localhost:8001)...
start "HermesClaw Backend" cmd /k "python -m uvicorn backend.dashboard_api:app --host 0.0.0.0 --port 8001 --reload"

echo ^[2/3^] Starting React Dashboard (http://localhost:3000)...
timeout /t 2 /nobreak

REM Check if node_modules exists, if not install
if not exist "dashboard\node_modules" (
    echo Installing Node dependencies (first time only)...
    cd dashboard
    call npm install
    cd ..
)

start "HermesClaw Dashboard" cmd /k "cd dashboard && npm run dev"

echo ^[3/3^] Starting Bot/Swarm Orchestrator...
timeout /t 3 /nobreak
start "HermesClaw Bot" cmd /k "python bot_orchestrator.py"

echo.
echo ============================================================
echo ALL SERVICES STARTED!
echo ============================================================
echo.
echo Open your browser: http://localhost:3000
echo.
echo Services:
echo   - 3D Dashboard:  http://localhost:3000
echo   - FastAPI Docs: http://localhost:8001/docs
echo   - Bot Console:   Active in separate window
echo.
echo To stop services: Close each window or press Ctrl+C
echo.
echo ============================================================
echo.
pause
