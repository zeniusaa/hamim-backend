@echo off
title HAMIM Admin - Launcher
cd /d D:\backend

echo ================================================
echo   HAMIM Admin Dashboard - Launcher
echo ================================================

rem --- 1. MySQL (cek port 3306) ---
netstat -ano | findstr /c:":3306" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto mysql_up
echo [1/3] MySQL belum jalan, menyalakan...
start "MySQL 8" /min "C:\laragon\bin\mysql\mysql-8.0.30-winx64\mysqld.exe" --defaults-file="C:\laragon\bin\mysql\mysql-8.0.30-winx64\my.ini"
:mysql_wait
netstat -ano | findstr /c:":3306" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto mysql_wait
)
:mysql_up
echo [1/3] MySQL siap.

rem --- 2. Backend (cek port 3000) ---
netstat -ano | findstr /c:":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto backend_up
echo [2/3] Menyalakan backend di :3000 ...
start "HAMIM Backend" cmd /k "cd /d D:\backend && node src/app.js"
timeout /t 4 /nobreak >nul
:backend_up
echo [2/3] Backend siap di :3000.

rem --- 3. Frontend (cek port 5173) ---
netstat -ano | findstr /c:":5173" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto frontend_up
echo [3/3] Menyalakan frontend di :5173 ...
start "HAMIM Admin Web" cmd /k "cd /d D:\backend\admin-web && npm run dev"
:frontend_up
echo [3/3] Frontend siap di :5173.

echo.
echo   Buka  : http://localhost:5173
echo   Login : admin.test@example.com / Admin12345
echo   (Jendela Backend / Admin Web jangan ditutup)
echo.
timeout /t 6 /nobreak >nul
start http://localhost:5173
