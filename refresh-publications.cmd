@echo off
cd /d "%~dp0"
echo Downloading current official publications. This may take several minutes.
if not exist ".venv\Scripts\python.exe" (
  echo Run setup-windows.cmd first.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" collect_sources.py --refresh
echo Restart the chatbot after a successful refresh to load the new library.
pause
