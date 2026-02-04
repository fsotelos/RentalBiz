#!/bin/bash

# RentalBiz - Script para ejecutar Backend y Frontend
# Uso: ./run-dev.sh

set -e

echo "=================================="
echo "  RentalBiz - Entorno de Desarrollo"
echo "=================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -e "${YELLOW}Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js no está instalado.${NC}"
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm no está instalado.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) encontrado${NC}"
echo -e "${GREEN}✓ npm $(npm --version) encontrado${NC}"
echo ""

# Verificar MySQL
echo -e "${YELLOW}Verificando MySQL...${NC}"
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}Error: MySQL no está instalado o no está en PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✓ MySQL encontrado${NC}"
echo ""

# Verificar base de datos
echo -e "${YELLOW}Verificando base de datos rentalbiz_local...${NC}"
DB_EXISTS=$(mysql -u root -prentalbiz123 -e "SHOW DATABASES LIKE 'rentalbiz_local';" 2>/dev/null | grep rentalbiz_local || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo -e "${YELLOW}Creando base de datos rentalbiz_local...${NC}"
    mysql -u root -prentalbiz123 -e "CREATE DATABASE IF NOT EXISTS rentalbiz_local;" 2>/dev/null
    echo -e "${GREEN}✓ Base de datos creada${NC}"
else
    echo -e "${GREEN}✓ Base de datos existente${NC}"
fi
echo ""

# Instalar dependencias del Backend
echo -e "${YELLOW}Instalando dependencias del Backend...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ Dependencias del Backend ya instaladas${NC}"
fi
cd ..
echo ""

# Instalar dependencias del Frontend
echo -e "${YELLOW}Instalando dependencias del Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ Dependencias del Frontend ya instaladas${NC}"
fi
cd ..
echo ""

echo "=================================="
echo -e "${GREEN}¡Configuración completada!${NC}"
echo "=================================="
echo ""
echo "Para iniciar el entorno de desarrollo, abre DOS Terminales:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd /Users/felipe.sotelo/RentalBiz/backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd /Users/felipe.sotelo/RentalBiz/frontend"
echo "  npm run dev"
echo ""
echo "El Backend estará en: http://localhost:3001"
echo "El Frontend estará en: http://localhost:5173"
echo ""
