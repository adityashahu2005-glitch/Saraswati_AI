# Saraswati AI PowerShell Launcher
$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Saraswati AI - Personal Study & PDF Summarizer" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$pythonPath = "python"
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Users\Acer\AppData\Local\Python\pythoncore-3.14-64\python.exe") {
        $pythonPath = "C:\Users\Acer\AppData\Local\Python\pythoncore-3.14-64\python.exe"
    } else {
        Write-Error "Python executable not found."
        exit 1
    }
}

Write-Host "Starting Saraswati AI server at http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process "http://127.0.0.1:8000"
& $pythonPath server.py 8000
