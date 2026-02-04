#!/bin/bash

# RentalBiz - Iniciar MySQL y Backend
# Resuelve ECONNREFUSED iniciando MySQL primero

echo "=== RentalBiz - Iniciando servicios ==="

# Verificar si MySQL está corriendo
if ! mysqladmin ping -u root -p'Ingphillip_8512' &>/dev/null; then
    echo "MySQL no está corriendo. Iniciando MySQL..."
    
    # Intentar diferentes métodos para iniciar MySQL
    if command -v mysql.server &>/dev/null; then
        sudo mysql.server start
    elif command -v mysqld &>/dev/null; then
        sudo mysqld --user=mysql &
        sleep 3
    elif command -v mysql &>/dev/null; then
        # Intentar con launchctl en macOS
        sudo launchctl load /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist 2>/dev/null || \
        sudo mysql start 2>/dev/null || \
        echo "No se pudo iniciar MySQL automáticamente. Ejecuta:"
        echo "  sudo mysql.server start"
        echo "  o"
        echo "  brew services start mysql"
    fi
    
    # Esperar a que MySQL esté listo
    echo "Esperando que MySQL esté listo..."
    for i in {1..30}; do
        if mysqladmin ping -u root -p'Ingphillip_8512' &>/dev/null; then
            echo "✓ MySQL está listo!"
            break
        fi
        sleep 1
    done
else
    echo "✓ MySQL ya está corriendo"
fi

# Verificar conexión
if mysqladmin ping -u root -p'Ingphillip_8512' &>/dev/null; then
    echo ""
    echo "==================================="
    echo "  ✓ MySQL ejecutándose"
    echo "==================================="
    echo ""
    echo "Ahora inicia el backend en otra Terminal:"
    echo "  cd /Users/felipe.sotelo/RentalBiz/backend"
    echo "  npm run dev"
    echo ""
else
    echo ""
    echo "==================================="
    echo "  ⚠ Error: MySQL no pudo iniciarse"
    echo "==================================="
    echo ""
    echo "Por favor inicia MySQL manualmente:"
    echo "  sudo mysql.server start"
    echo ""
fi
