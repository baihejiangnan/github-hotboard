@echo off
setlocal

cd /d %~dp0

if not exist .env (
  echo Creating .env from .env.example ...
  copy .env.example .env >nul
) else (
  echo .env already exists, skipping copy.
)

echo Installing dependencies...
npm install
if errorlevel 1 goto :fail

echo Generating Prisma client...
npm run prisma:generate
if errorlevel 1 goto :fail

echo Running Prisma migrate...
npm run prisma:migrate
if errorlevel 1 goto :fail

echo.
echo Setup complete.
echo Next:
echo   1. Fill in .env values if you have not done so yet.
echo   2. Run run-web.cmd to start the app.
echo   3. Run run-worker.cmd in another terminal for background jobs.
goto :eof

:fail
echo.
echo Setup failed. Read the error output above.
exit /b 1

