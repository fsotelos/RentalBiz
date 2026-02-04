#!/bin/bash

# RentalBiz - Script para reparar MySQL y ejecutar la aplicación
# Uso: ./fix-mysql-and-start.sh

set -e

echo "============================================"
echo "  Reparando MySQL e iniciando RentalBiz"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar que estamos en el directorio correcto
if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}Error: Ejecuta este script desde /Users/felipe.sotelo/RentalBiz/${NC}"
    exit 1
fi

# Paso 1: Detener MySQL
echo -e "${BLUE}Paso 1: Deteniendo MySQL...${NC}"
sudo mysql.server stop 2>/dev/null || sudo mysql stop 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ MySQL detenido${NC}"

# Paso 2: Reparar archivos PID
echo ""
echo -e "${BLUE}Paso 2: Reparando archivos de MySQL...${NC}"
sudo rm -f /opt/homebrew/var/mysql/*.pid 2>/dev/null || true
sudo chown -R _mysql:_mysql /opt/homebrew/var/mysql 2>/dev/null || true
echo -e "${GREEN}✓ Archivos reparados${NC}"

# Paso 3: Iniciar MySQL
echo ""
echo -e "${BLUE}Paso 3: Iniciando MySQL...${NC}"
sudo mysql.server start
sleep 3

# Verificar que MySQL esté corriendo
if sudo mysql.server status | grep -q "SUCCESS"; then
    echo -e "${GREEN}✓ MySQL ejecutándose${NC}"
else
    echo -e "${YELLOW}⚠ Verificando estado de MySQL...${NC}"
fi

# Paso 4: Resetear contraseña
echo ""
echo -e "${BLUE}Paso 4: Reseteando contraseña de root...${NC}"
mysql -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'rentalbiz123'; FLUSH PRIVILEGES;" 2>/dev/null || {
    echo -e "${YELLOW}⚠ No se pudo resetear la contraseña automáticamente${NC}"
    echo -e "${YELLOW}Por favor ejecuta manualmente:${NC}"
    echo "  mysql -u root"
    echo "  FLUSH PRIVILEGES;"
    echo "  ALTER USER 'root'@'localhost' IDENTIFIED BY 'rentalbiz123';"
    echo "  FLUSH PRIVILEGES;"
    echo "  EXIT;"
}

# Paso 5: Crear base de datos
echo ""
echo -e "${BLUE}Paso 5: Verificando/Creando base de datos...${NC}"
mysql -u root -prentalbiz123 -e "CREATE DATABASE IF NOT EXISTS rentalbiz_local;" 2>/dev/null
echo -e "${GREEN}✓ Base de datos rentalbiz_local lista${NC}"

# Paso 6: Instalar dependencias del backend
echo ""
echo -e "${BLUE}Paso 6: Instalando dependencias del Backend...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ Dependencias del Backend ya instaladas${NC}"
fi
cd ..

# Paso 7: Instalar dependencias del frontend
echo ""
echo -e "${BLUE}Paso 7: Instalando dependencias del Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ Dependencias del Frontend ya instaladas${NC}"
fi
cd ..

echo ""
echo "============================================"
echo -e "${GREEN}  ¡Todo listo!${NC}"
echo "============================================"
echo ""
echo "Para ejecutar las aplicaciones, necesitas DOS Terminales:"
echo ""
echo -e "${BLUE}📌 Terminal 1 - Backend:${NC}"
echo "  cd /Users/felipe.sotelo/RentalBiz/backend"
echo "  npm run dev"
echo ""
echo -e "${BLUE}📌 Terminal 2 - Frontend:${NC}"
echo "  cd /Users/felipe.sotelo/RentalBiz/frontend"
echo "  npm run dev"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:3001"
echo ""
