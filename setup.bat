@echo off
echo ========================================
echo Real-Time Intelligence Co-pilot Setup
echo ========================================
echo.

echo [1/5] Setting up Backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

echo.
echo [2/5] Setting up Frontend...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed
)

echo.
echo [3/5] Creating environment files...
cd ..
if not exist backend\.env (
    echo Creating backend .env file...
    copy backend\.env.example backend\.env
    echo Please edit backend\.env and add your OPENROUTER_API_KEY
)

if not exist frontend\.env (
    echo Creating frontend .env file...
    copy frontend\.env.example frontend\.env
)

echo.
echo [4/5] Creating necessary directories...
if not exist backend\uploads mkdir backend\uploads
if not exist backend\logs mkdir backend\logs
if not exist backend\vectorstore mkdir backend\vectorstore

echo.
echo [5/5] Setup complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Edit backend\.env and add your OPENROUTER_API_KEY
echo 2. Ensure PostgreSQL is running
echo 3. Run: cd backend ^&^& npm run prisma:migrate
echo 4. Start backend: cd backend ^&^& npm run dev
echo 5. Start frontend: cd frontend ^&^& npm run dev
echo.
echo Visit http://localhost:3000 to access the application
echo ========================================

pause
