@echo off
cd /d "%~dp0"
node "%~dp0sync-server.js"
if errorlevel 1 pause
