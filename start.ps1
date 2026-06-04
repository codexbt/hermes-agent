#!/usr/bin/env powershell
param()

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path  
Set-Location $ScriptDir

Write-Host "====== Kairos Launcher ======"
Write-Host ""

# Setup venv
$VenvPath = ".venv"
if (-not (Test-Path $VenvPath)) {
    python -m venv ".venv"
}

$PythonExe = ".venv\Scripts\python.exe"

# Check packages  
Write-Host "Checking dependencies..."
. $PythonExe -c "import fastapi, pydantic, discord" 2>$null
if ($?) {
    Write-Host "Dependencies OK"
} else {
    Write-Host "Installing dependencies..."
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue  
    Start-Sleep -Milliseconds 500
    . $PythonExe -m pip install -r requirements.txt --upgrade
}

Write-Host ""
Write-Host "Starting services..."
Write-Host ""

# Backend
Write-Host "[1/3] FastAPI Backend..."
Start-Process powershell -Args "-NoExit -Command `"$PythonExe -m uvicorn backend.dashboard_api:app --host 0.0.0.0 --port 8001`""
Start-Sleep -Seconds 2

# Dashboard
Write-Host "[2/3] React Dashboard..."  
$DashboardDir = if (Test-Path "dashboard\package.json") { "dashboard" } else { "." }
Start-Process powershell -Args "-NoExit -Command `"cd $DashboardDir; npm run dev`""
Start-Sleep -Seconds 2

# Bot
Write-Host "[3/3] Bot Orchestrator..."
Start-Process powershell -Args "-NoExit -Command `"$PythonExe bot_orchestrator.py`""

Write-Host ""
Write-Host "All services started!"
Write-Host "Dashboard: http://localhost:3000"
Write-Host "API: http://localhost:8001/docs"
Write-Host ""
