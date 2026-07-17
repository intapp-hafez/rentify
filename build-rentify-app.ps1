# PowerShell script to automate building and packaging the Rentify-App

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       Rentify App Packager              " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Running production build (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting packaging process." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n[2/4] Cleaning old output in Rentify-App folder..." -ForegroundColor Yellow
if (Test-Path ".\Rentify-App\.output") {
    Remove-Item -Recurse -Force ".\Rentify-App\.output" -ErrorAction SilentlyContinue
}

Write-Host "`n[3/4] Copying new production bundle into Rentify-App..." -ForegroundColor Yellow
Copy-Item -Recurse -Force ".\.output" ".\Rentify-App\.output"

Write-Host "`n[4/4] Compressing Rentify-App into ZIP file..." -ForegroundColor Yellow
if (Test-Path ".\Rentify-App-Latest.zip") {
    Remove-Item -Force ".\Rentify-App-Latest.zip"
}
Compress-Archive -Path ".\Rentify-App\*" -DestinationPath ".\Rentify-App-Latest.zip" -Force

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "  Success! Application Packaged!         " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Your distribution file is ready: Rentify-App-Latest.zip" -ForegroundColor White
Write-Host ""
