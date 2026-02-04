#!/bin/bash

# RentalBiz - Resetear contraseña de MySQL
# Resuelve el problema de ! en zsh usando archivo temporal

echo "=== Reseteando contraseña de MySQL ==="

# Detener MySQL
echo "Deteniendo MySQL..."
sudo mysql.server stop 2>/dev/null || sudo mysql stop 2>/dev/null || true
sleep 2

# Crear archivo SQL temporal
cat > /tmp/reset_pass.sql << 'EOF'
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'Ingphillip_8512';
FLUSH PRIVILEGES;
EOF

# Iniciar MySQL en modo seguro
echo "Iniciando MySQL en modo seguro..."
sudo mysqld_safe --skip-grant-tables &
sleep 5

# Ejecutar el SQL
echo "Ejecutando cambio de contraseña..."
mysql -u root < /tmp/reset_pass.sql

# Detener MySQL seguro
echo "Deteniendo MySQL seguro..."
pkill -f "mysqld_safe" 2>/dev/null || true
sleep 2

# Reiniciar MySQL normalmente
echo "Reiniciando MySQL normalmente..."
sudo mysql.server start 2>/dev/null || sudo mysql start 2>/dev/null || true
sleep 3

# Probar conexión
echo "Verificando conexión..."
if mysql -u root -p'Ingphillip_8512' -e "SELECT '¡Contraseña cambiada!' as Resultado;" 2>/dev/null; then
    echo ""
    echo "==================================="
    echo "  ✓ Contraseña reseteada"
    echo "  Nueva contraseña: Ingphillip_8512"
    echo "==================================="
    echo ""
    echo "NOTA: La contraseña cambió de Ingphillip!8512 a Ingphillip_8512"
    echo "      (Se cambió ! por _ por compatibilidad con zsh)"
    
    # Actualizar archivos de configuración
    sed -i '' 's/Ingphillip!8512/Ingphillip_8512/g' ../.env.local
    sed -i '' 's/Ingphillip!8512/Ingphillip_8512/g' ../backend/config/config.json
    
    echo ""
    echo "Archivos de configuración actualizados."
else
    echo "Error: No se pudo verificar la conexión."
    echo "Verifica que MySQL esté ejecutándose:"
    echo "  mysql.server start"
fi

# Limpiar
rm -f /tmp/reset_pass.sql
