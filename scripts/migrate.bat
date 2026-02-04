@echo off
REM ============================================
REM Script de Migraciones - RentalBiz
REM ============================================

setlocal

echo ============================================
echo   Migraciones de Base de Datos
echo ============================================

set APP_DIR=%~dp0..
set BACKEND_DIR=%APP_DIR%\backend
cd /d %BACKEND_DIR%

echo.
echo Ejecutando migraciones...
echo.

REM Preguntar si es producción
set /p env="¿Ejecutar en modo producción? (s/n): "
if "%env%"=="s" (
    set NODE_ENV=production
    echo Modo: PRODUCCIÓN
) else (
    set NODE_ENV=development
    echo Modo: DESARROLLO
)

echo.
echo Ejecutando migraciones...
npx sequelize-cli db:migrate --env %NODE_ENV%

if errorlevel 1 (
    echo ERROR: Fallo en migraciones
    pause
    exit /b 1
)

echo.
echo Migraciones completadas exitosamente.
echo.

endlocal
pause
