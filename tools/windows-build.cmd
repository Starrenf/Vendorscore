@echo off
setlocal
cd /d %~dp0\..

if not exist package.json (
  echo package.json not found. Please run this from the project folder.
  exit /b 1
)

echo Installing dependencies...
call npm install || exit /b 1

echo Building...
call npm run build || exit /b 1

echo Done. Build output is in .\dist
endlocal
