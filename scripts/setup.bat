@echo off
REM ============================================
REM Script de Configuración Inicial - RentalBiz
REM Ejecutar una vez para configurar el proyecto
REM ============================================

echo ============================================
echo   Configuración Inicial de RentalBiz
echo ============================================

REM Verificar Node.js
echo Verificando Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js no está instalado. Por favor instalar Node.js 18.x LTS desde https://nodejs.org
    pause
    exit /b 1
)

REM Verificar MySQL
echo Verificando MySQL...
mysql --version
if errorlevel 1 (
    echo ERROR: MySQL no está instalado. Por favor instalar MySQL 8.0
    pause
    exit /b 1
)

echo Instalando dependencias del proyecto...

REM Instalar dependencias del proyecto raíz
echo Instalando dependencias principales...
npm install

REM Instalar dependencias del backend
echo Instalando dependencias del backend...
cd backend
npm install
cd ..

REM Instalar dependencias del frontend
echo Instalando dependencias del frontend...
cd frontend
npm install
cd ..

echo.
echo ============================================
echo   Configuración completada!
echo ============================================
echo.
echo Próximos pasos:
echo 1. Configurar la base de datos MySQL
echo 2. Copiar .env.local a .env y configurar credenciales
echo 3. Ejecutar migraciones: cd backend && npm run migrate
echo 4. Iniciar en desarrollo: npm run dev
echo.
pause
