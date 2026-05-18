@echo off
echo ========================================
echo Real-Time Intelligence Co-pilot
echo Starting Application
echo ========================================
echo.

echo [1/3] Stopping any existing processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend Server...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================
echo Application Starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo Health:   http://localhost:5000/health
echo.
echo Wait 10 seconds for servers to fully start...
echo Then open: http://localhost:3000
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo ========================================
echo Servers are running!
echo Close the terminal windows to stop.
echo ========================================
