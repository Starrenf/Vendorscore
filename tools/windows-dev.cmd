@echo off
setlocal
cd /d %~dp0\..

if not exist package.json (
  echo package.json not found. Please run this from the project folder.
  exit /b 1
)

echo Installing dependencies (if needed)...
call npm install || exit /b 1

echo Starting dev server...
call npm run dev
endlocal
