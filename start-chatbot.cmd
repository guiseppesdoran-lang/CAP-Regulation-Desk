@echo off
cd /d "%~dp0"
if exist "release\CAP-Regulation-Desk.exe" (
  start "" "release\CAP-Regulation-Desk.exe"
  exit /b
)
if not exist ".venv\Scripts\python.exe" (
  echo Run setup-windows.cmd once, or download the standalone EXE from GitHub Actions.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" desktop.py
echo.
echo The chatbot server stopped. Any error is shown above.
pause
