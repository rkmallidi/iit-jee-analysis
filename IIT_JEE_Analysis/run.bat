@echo off
setlocal enabledelayedexpansion

title IIT JEE Analysis Platform - Startup
color 0A

echo.
echo  =========================================================
echo    IIT JEE Analysis Platform  ^|  Startup Script
echo  =========================================================
echo.

:: ---------------------------------------------------------------
:: Check prerequisites
:: ---------------------------------------------------------------
echo [1/6] Checking prerequisites...

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERROR] Python not found. Please install Python 3.11+ and add it to PATH.
    pause & exit /b 1
)
echo   [OK] Python found.

:: Resolve full python path so new windows invoke the same interpreter
for /f "delims=" %%p in ('where python 2^>nul') do set "PYTHON=%%p"
if not defined PYTHON set "PYTHON=python"

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERROR] Node.js not found. Please install Node 18+ and add it to PATH.
    pause & exit /b 1
)
echo   [OK] Node.js found.

echo.
echo [2/6] Running in LOCAL mode
echo.

cd /d "%~dp0"

:: ---------------------------------------------------------------
:: Backend setup
:: ---------------------------------------------------------------
echo [3/6] Setting up Python backend...

cd backend

:: Create .env from example if needed
if not exist ".env" (
    echo   Creating .env from .env.example ...
    copy ".env.example" ".env" >nul
)

:: Install dependencies
echo   Installing Python packages (this may take a minute)...
python -m pip install -r requirements.txt --quiet --break-system-packages 2>nul || python -m pip install -r requirements.txt --quiet

:: Clear Python bytecode cache to avoid stale migration code
echo   Clearing Python cache...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul

:: Run migrations
echo   Running Alembic migrations...
python -m alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] Migration failed.
    echo.
    echo   Common causes and fixes:
    echo.
    echo   1. PostgreSQL not running — start it and re-run this script.
    echo.
    echo   2. Wrong credentials — edit backend\.env and set DATABASE_URL
    echo      to match your PostgreSQL user/password/database.
    echo.
    echo   3. Partial previous run left orphaned DB objects — run this
    echo      command to clean up, then re-run this script:
    echo.
    echo        cd backend
    echo        python reset_db.py
    echo.
    pause & exit /b 1
)

:: Seed database
echo   Seeding database (roles + admin user)...
python seed.py

:: Start backend in new window
echo   Starting FastAPI backend on 0.0.0.0:8000...
start "JEE Backend" cmd /k "cd /d %~dp0backend && "%PYTHON%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

cd ..

:: ---------------------------------------------------------------
:: Frontend setup
:: ---------------------------------------------------------------
echo.
echo [4/6] Setting up React frontend...

cd /d "%~dp0frontend"

if exist "node_modules\.bin\vite" goto :fe_ready
echo   Installing npm packages (first run may take a few minutes)...
npm install --registry https://registry.npmjs.org/
if ERRORLEVEL 1 echo   [WARN] npm install had warnings, continuing...

:fe_ready
echo   Starting Vite dev server on 0.0.0.0:5173...
start "JEE Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0"

cd /d "%~dp0"

:: ---------------------------------------------------------------
:: Done
:: ---------------------------------------------------------------
echo.
echo [5/6] Waiting for services to start...
timeout /t 6 /nobreak >nul

echo.
echo [6/6] Opening the app in your browser...
start http://localhost:5173

echo.
echo  =========================================================
echo    IIT JEE Analysis is running!
echo.
echo    Frontend  : http://localhost:5173
echo    Backend   : http://localhost:8000
echo    API Docs  : http://localhost:8000/docs
echo.
echo    Network access:
echo      Open http://YOUR-LAN-IP:5173 from another device on the same network.
echo      Find YOUR-LAN-IP with: ipconfig
echo.
echo    Default Admin Login:
echo      Username : admin
echo      Password : Admin@12345
echo.
echo    Close the Backend/Frontend terminal windows to stop.
echo  =========================================================
echo.

endlocal
pause
