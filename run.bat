@echo off
title Saraswati AI - Personal Study & PDF Summarizer
echo =======================================================
echo   Saraswati AI - Personal Study & PDF Summarizer
echo =======================================================
echo.

set PYTHON_CMD=python
where python >nul 2>nul
if %errorlevel% neq 0 (
  if exist "C:\Users\Acer\AppData\Local\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=C:\Users\Acer\AppData\Local\Python\pythoncore-3.14-64\python.exe"
  ) else (
    echo [ERROR] Python not found in PATH or standard location.
    pause
    exit /b 1
  )
)

echo Starting Saraswati AI local server...
start "" "http://127.0.0.1:8000"
"%PYTHON_CMD%" server.py 8000
pause
