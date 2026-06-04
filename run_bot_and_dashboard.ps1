# ============================================================
# Kairos Bot + Dashboard Unified Launcher
# ============================================================

param()

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ""
Write-Host "============================================================"
Write-Host "Kairos: Bot + Dashboard Unified Launcher" -ForegroundColor Cyan
Write-Host "============================================================"
Write-Host ""

$VenvPath = ".venv"
if (-not (Test-Path $VenvPath)) {
    Write-Host "Creating Python virtual environment..."
    python -m venv ".venv"
}

$PythonExe = ".venv\Scripts\python.exe"

Write-Host "Checking Python dependencies..."
. $PythonExe -c "import fastapi, pydantic, discord" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies OK"
} else {
    Write-Host "Installing dependencies (this may take a few minutes)..."
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    . $PythonExe -m pip install -r requirements.txt --upgrade
}

Write-Host ""
Write-Host "============================================================"
Write-Host "Starting Services..."
Write-Host "============================================================"
Write-Host ""

Write-Host "[1/3] FastAPI Backend (http://localhost:8001)..."
$cmd1 = "$PythonExe -m uvicorn backend.dashboard_api:app --host 0.0.0.0 --port 8001 --reload"
Start-Process powershell -Args "-NoExit -Command $cmd1"
Start-Sleep -Seconds 2

$DashboardDir = if (Test-Path "kairos") { "kairos" } else { "dashboard" }
Write-Host "[2/3] React Dashboard (http://localhost:3000)..."
$cmd2 = "cd $DashboardDir; npm run dev"
Start-Process powershell -Args "-NoExit -Command $cmd2"
Start-Sleep -Seconds 2

Write-Host "[3/3] Bot Orchestrator..."
$cmd3 = "$PythonExe bot_orchestrator.py"
Start-Process powershell -Args "-NoExit -Command $cmd3"

Write-Host ""
Write-Host "============================================================"
Write-Host "ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "============================================================"
Write-Host ""
Write-Host "Dashboard:  http://localhost:3000"
Write-Host "FastAPI:    http://localhost:8001/docs"
Write-Host ""
Write-Host "============================================================"
Write-Host ""
