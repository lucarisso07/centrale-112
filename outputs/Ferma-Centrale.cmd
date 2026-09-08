@echo off
node "%~dp0avvia-centrale.cjs" --stop
if errorlevel 1 pause
