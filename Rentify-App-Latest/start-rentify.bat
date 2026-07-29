@echo off
echo Starting Rentify System...

:: Navigate to the folder containing this batch file
cd /d "%~dp0"

if exist ".output\server\index.mjs" (
    echo Production build found! Starting high-performance server...
    
    :: Start the node server in the background
    start /b node .output/server/index.mjs
    
    :: Wait a second for the server to start
    timeout /t 2 >nul
    
    :: Open the default browser to the local server
    start http://localhost:3000
    
    echo Rentify is running. Keep this window open. Close it to stop the server.
    pause >nul
) else (
    echo System corrupted! Missing .output folder.
    pause >nul
)
