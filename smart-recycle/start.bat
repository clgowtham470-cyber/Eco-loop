@echo off
REM EcoLoop one-click demo start (Windows). Run the setup in README.md first.
cd /d "%~dp0frontend"
echo Building website...
call npm run build || goto :error
cd /d "%~dp0backend"
if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
echo.
echo EcoLoop running at http://localhost:8000
echo For phones, run in another window:  ngrok http 8000
echo.
start "" http://localhost:8000
uvicorn main:app --port 8000
goto :eof
:error
echo Build failed. Run "npm install" inside the frontend folder first.
pause
