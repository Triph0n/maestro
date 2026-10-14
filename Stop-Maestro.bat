@echo off
title Stop Maestro
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-Maestro.ps1"
pause
