@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai dat...
  call npm install
)
start "" http://localhost:4321
node server.mjs
pause
