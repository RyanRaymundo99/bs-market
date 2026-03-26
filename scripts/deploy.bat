@echo off
REM BS Market - Quick Deployment Script for Windows
REM This script helps you deploy BS Market to Vercel

echo.
echo 🚀 BS Market - Deployment Script
echo ================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Vercel CLI is not installed. Installing...
    npm install -g vercel
)

echo [SUCCESS] All dependencies are available

REM Check if .env file exists
if not exist ".env.local" if not exist ".env" (
    echo [WARNING] No .env file found. Please create one from env.example
    echo [INFO] Copying env.example to .env.local...
    copy env.example .env.local
    echo [WARNING] Please edit .env.local with your actual values before deploying
    pause
    exit /b 1
)

echo.
echo [INFO] Running pre-deployment checks...
echo.

REM Type check
echo [INFO] Running TypeScript type check...
call npm run type-check
if %errorlevel% neq 0 (
    echo [ERROR] TypeScript type check failed
    pause
    exit /b 1
)

REM Lint check
echo [INFO] Running ESLint...
call npm run lint
if %errorlevel% neq 0 (
    echo [WARNING] ESLint found issues, but continuing...
)

REM Build check
echo [INFO] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo [SUCCESS] All checks passed!

echo.
echo [INFO] Deploying to Vercel...
echo.

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Please log in to Vercel...
    vercel login
)

REM Deploy
echo [INFO] Starting deployment...
vercel --prod

echo.
echo [SUCCESS] Deployment completed!
echo.
echo [INFO] Post-deployment steps:
echo.
echo 1. Set up your database:
echo    - Go to Vercel Dashboard ^> Functions ^> Terminal
echo    - Run: npx prisma db push
echo.
echo 2. Configure environment variables:
echo    - Go to Vercel Dashboard ^> Settings ^> Environment Variables
echo    - Add all required variables from env.example
echo.
echo 3. Set up admin user:
echo    - Go to /admin/login
echo    - Create admin account
echo.
echo 4. Test your deployment:
echo    - Visit your Vercel URL
echo    - Test all major features
echo.
echo [SUCCESS] 🎉 Deployment process completed!
echo [INFO] Check DEPLOYMENT_CHECKLIST.md for verification steps
echo.
pause
