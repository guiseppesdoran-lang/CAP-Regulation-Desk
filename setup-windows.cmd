@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Install Python 3.12 or newer from https://www.python.org/downloads/windows/ then run this setup again.
  pause
  exit /b 1
)
py -3 -m venv .venv
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failed
echo Setup complete. Double-click start-chatbot.cmd.
pause
exit /b 0
:failed
echo Setup failed. See the error above.
pause
exit /b 1
