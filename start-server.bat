@echo off
cd /d "%~dp0"

set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
) else if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" server.js
) else (
  echo Node.js was not found on this computer.
  echo.
  echo Install Node.js from https://nodejs.org/ or ask Codex to install the bundled workspace runtime.
  echo.
)

pause
