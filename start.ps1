# AgriVision AI - Startup Script (Windows PowerShell)
# Run this script from the Agrivision root directory

Write-Host "AgriVision AI - Starting..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend (Flask)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python app.py"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "AgriVision AI is starting up!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend API: http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
