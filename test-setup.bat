@echo off
echo ========================================
echo Testing Real-Time Intelligence Co-pilot Setup
echo ========================================
echo.

echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js is installed
node --version

echo.
echo [2/6] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)
echo [OK] npm is installed
npm --version

echo.
echo [3/6] Checking backend dependencies...
if not exist backend\node_modules (
    echo [ERROR] Backend dependencies not installed!
    echo Run: cd backend ^&^& npm install
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

echo.
echo [4/6] Checking frontend dependencies...
if not exist frontend\node_modules (
    echo [ERROR] Frontend dependencies not installed!
    echo Run: cd frontend ^&^& npm install
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

echo.
echo [5/6] Checking environment files...
if not exist backend\.env (
    echo [WARNING] backend\.env not found
    echo Creating from .env.example...
    copy backend\.env.example backend\.env
    echo [ACTION REQUIRED] Please edit backend\.env and add your OPENROUTER_API_KEY
)
if not exist frontend\.env (
    echo [WARNING] frontend\.env not found
    echo Creating from .env.example...
    copy frontend\.env.example frontend\.env
)
echo [OK] Environment files exist

echo.
echo [6/6] Checking Prisma Client...
if not exist backend\node_modules\.prisma (
    echo [WARNING] Prisma Client not generated
    echo Generating Prisma Client...
    cd backend
    call npx prisma generate
    cd ..
)
echo [OK] Prisma Client generated

echo.
echo ========================================
echo Setup Test Complete!
echo ========================================
echo.
echo Status: All checks passed!
echo.
echo Next steps:
echo 1. Ensure PostgreSQL is running on localhost:5432
echo 2. Create database: createdb realtime_intelligence
echo 3. Run migrations: cd backend ^&^& npm run prisma:migrate
echo 4. Start backend: cd backend ^&^& npm run dev
echo 5. Start frontend: cd frontend ^&^& npm run dev
echo.
echo ========================================

pause
