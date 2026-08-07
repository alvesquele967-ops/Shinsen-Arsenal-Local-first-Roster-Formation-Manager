@echo off
if "%~1"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0script\start_shinsen.ps1"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0script\start_shinsen.ps1" -Port "%~1"
)
if errorlevel 1 pause
