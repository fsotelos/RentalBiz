@echo off
REM ============================================
REM Script de Despliegue en Producción - RentalBiz
REM Para servidor Windows
REM ============================================

setlocal

echo ============================================
echo   Desplegando RentalBiz en Producción
echo ============================================

REM Configurar directorio
set APP_DIR=%~dp0..
set BACKEND_DIR=%APP_DIR%\backend
set FRONTEND_DIR=%APP_DIR%\frontend

REM Cambiar al directorio de la aplicación
cd /d %APP_DIR%

echo.
echo Paso 1: Deteniendo servicios anteriores...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Paso 2: Instalando dependencias del backend...
cd %BACKEND_DIR%
echo Instalando dependencias de producción...
call npm install --production
if errorlevel 1 (
    echo ERROR: Fallo al instalar dependencias del backend
    pause
    exit /b 1
)

echo.
echo Paso 3: Compilando frontend...
cd %FRONTEND_DIR%
echo Limpiando build anterior...
if exist dist rmdir /s /q dist
echo Instalando dependencias...
call npm install
echo Construyendo aplicación...
call npm run build
if errorlevel 1 (
    echo ERROR: Fallo al compilar frontend
    pause
    exit /b 1
)

echo.
echo Paso 4: Copiando archivos al backend...
xcopy /E /I /Y "%FRONTEND_DIR%\dist" "%BACKEND_DIR%\public" >nul

echo.
echo Paso 5: Ejecutando migraciones de base de datos...
cd %BACKEND_DIR%
set NODE_ENV=production
echo Ejecutando migraciones...
call npx sequelize-cli db:migrate --env production
if errorlevel 1 (
    echo ERROR: Fallo en migraciones. Verificar conexión a base de datos.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Despliegue completado exitosamente!
echo ============================================
echo.
echo La aplicación está lista para iniciarse.
echo Para iniciar el servidor, ejecutar:
echo   cd %BACKEND_DIR%
echo   node server.js
echo.
echo O usar PM2 para gestión de procesos:
echo   pm2 start server.js --name rentalbiz
echo.
pause

endlocal
