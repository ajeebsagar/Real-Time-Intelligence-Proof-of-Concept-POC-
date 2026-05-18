@echo off
echo Starting Real-Time Intelligence Co-pilot...
echo.

echo Starting Backend...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to stop all servers...
pause > nul

taskkill /FI "WindowTitle eq Backend Server*" /T /F
taskkill /FI "WindowTitle eq Frontend Server*" /T /F
