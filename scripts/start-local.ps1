# Local development startup script for Windows PowerShell.
# Starts all four services in separate windows.

$root = Split-Path -Parent $PSScriptRoot

# Start ML Service
Start-Process powershell -ArgumentList @"
-NoExit
cd '$root\services\ml-service'
if (-not (Test-Path .venv)) { python -m venv .venv }
.venv\Scripts\activate
if (-not (Test-Path models\model.pkl)) { python train.py }
uvicorn main:app --host 0.0.0.0 --port 8001
"@

# Start Python Backend
Start-Process powershell -ArgumentList @"
-NoExit
cd '$root\services\python-backend'
if (-not (Test-Path .venv)) { python -m venv .venv }
.venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8002
"@

# Start Java Backend
Start-Process powershell -ArgumentList @"
-NoExit
cd '$root\services\java-backend'
mvn clean package -DskipTests
java -jar target\market-analysis-1.0.0.jar
"@

# Start Next.js Portal
Start-Process powershell -ArgumentList @"
-NoExit
cd '$root\portal'
npm install
$env:PYTHON_BACKEND_URL='http://localhost:8002'
$env:JAVA_BACKEND_URL='http://localhost:8080'
npm run dev
"@

Write-Host "Services starting in separate windows. Open http://localhost:3000 once ready."
