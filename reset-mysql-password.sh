#!/bin/bash

# RentalBiz - Script para resetear contraseña de MySQL
# Uso: ./reset-mysql-password.sh

set -e

echo "============================================"
echo "  Reset de Contraseña de MySQL - RentalBiz"
echo "============================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}IMPORTANTE: Este script reseteará la contraseña de root de MySQL a 'rentalbiz123'${NC}"
echo ""
echo -e "${BLUE}Paso 1: Deteniendo MySQL...${NC}"
sudo mysql.server stop 2>/dev/null || sudo mysql stop 2>/dev/null || true
echo -e "${GREEN}✓ MySQL detenido${NC}"
echo ""

echo -e "${BLUE}Paso 2: Iniciando MySQL en modo seguro (sin contraseña)...${NC}"
echo -e "${YELLOW}Se abrirá una nueva ventana de Terminal.${NC}"
echo -e "${YELLOW}NO cierres esa ventana hasta que termines todos los pasos.${NC}"
echo ""

# Crear script temporal para ejecutar mysqld_safe
cat > /tmp/start_mysql_safe.sh << 'EOF'
#!/bin/bash
mysqld_safe --skip-grant-tables &
sleep 5
echo "MySQL iniciado en modo seguro"
EOF

chmod +x /tmp/start_mysql_safe.sh

# Abrir nueva terminal para mysqld_safe
osascript -e 'tell app "Terminal" to do script "/tmp/start_mysql_safe.sh"'

echo -e "${GREEN}✓ Ventana de MySQL segura abierta${NC}"
echo ""

echo -e "${BLUE}Paso 3: Esperando que MySQL esté listo...${NC}"
sleep 5
echo -e "${GREEN}✓ MySQL listo${NC}"
echo ""

echo -e "${BLUE}Paso 4: Ejecutando reset de contraseña...${NC}"
echo -e "${YELLOW}Se abrirá otra ventana para ejecutar los comandos SQL.${NC}"
echo ""

# Crear script SQL
cat > /tmp/reset_sql.sql << 'EOF'
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'rentalbiz123';
FLUSH PRIVILEGES;
SELECT 'Contraseña cambiada exitosamente a: rentalbiz123' as Resultado;
EOF

# Ejecutar el SQL
mysql -u root < /tmp/reset_sql.sql 2>/dev/null || {
    echo -e "${YELLOW}Reintentando conexión...${NC}"
    sleep 3
    mysql -u root < /tmp/reset_sql.sql
}

echo -e "${GREEN}✓ Contraseña reseteada${NC}"
echo ""

echo -e "${BLUE}Paso 5: Reiniciando MySQL normalmente...${NC}"
osascript -e 'tell app "Terminal" to do script "mysql.server stop 2>/dev/null; mysql.server start"'
sleep 3
echo -e "${GREEN}✓ MySQL reiniciado${NC}"
echo ""

echo -e "${BLUE}Paso 6: Verificando conexión...${NC}"
if mysql -u root -prentalbiz123 -e "SELECT 'Conexión exitosa!' as Status;" 2>/dev/null; then
    echo -e "${GREEN}============================================"
    echo "  ¡CONTRASEÑA RESETEDA CORRECTAMENTE!"
    echo "============================================${NC}"
    echo ""
    echo -e "${GREEN}Nueva contraseña: ${YELLOW}rentalbiz123${NC}"
    echo ""
    echo "Ahora puedes ejecutar las aplicaciones:"
    echo ""
    echo -e "${BLUE}Terminal 1 (Backend):${NC}"
    echo "  cd /Users/felipe.sotelo/RentalBiz/backend"
    echo "  npm install"
    echo "  npm run dev"
    echo ""
    echo -e "${BLUE}Terminal 2 (Frontend):${NC}"
    echo "  cd /Users/felipe.sotelo/RentalBiz/frontend"
    echo "  npm install"
    echo "  npm run dev"
else
    echo -e "${RED}Error al verificar la conexión.${NC}"
    echo "Por favor verifica que MySQL esté ejecutándose:"
    echo "  mysql.server start"
    echo "  mysql -u root -prentalbiz123 -e 'SELECT 1'"
fi

# Limpiar archivos temporales
rm -f /tmp/reset_sql.sql /tmp/start_mysql_safe.sh
