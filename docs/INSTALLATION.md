# Guía de Instalación - RentalBiz

## 1. Instalar Homebrew (Gestor de paquetes para macOS)

Abre la aplicación **Terminal** y ejecuta:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Esto descargará e instalará Homebrew. Te pedirán tu contraseña de usuario (para permisos de administrador).

## 2. Instalar Node.js con Homebrew

Una vez instalado Homebrew, ejecuta:

```bash
brew install node
```

Esto instalará Node.js y npm (el gestor de paquetes de Node).

## 3. Verificar instalación

```bash
# Verificar Node.js
node --version

# Verificar npm
npm --version
```

Deberías ver algo como:
```
v18.19.0
10.2.3
```

## 4. Instalar dependencias del proyecto

```bash
cd /Users/felipe.sotelo/RentalBiz

# Instalar todas las dependencias
npm install
```

## 5. Configurar MySQL

### Resetear contraseña de root (si no la recuerdas)

```bash
# Detener MySQL
brew services stop mysql

# Iniciar en modo seguro
mysqld_safe --skip-grant-tables &

# En otra terminal, conectarse
mysql -u root

# En MySQL, ejecutar:
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'rentalbiz123';
FLUSH PRIVILEGES;
EXIT;

# Detener el modo seguro (Ctrl+C)
# Reiniciar MySQL
brew services start mysql
```

### Crear base de datos

```bash
mysql -u root -prentalbiz123 -e "CREATE DATABASE rentalbiz_local;"
```

## 6. Ejecutar la aplicación

```bash
cd /Users/felipe.sotelo/RentalBiz
npm run dev
```

Esto iniciará:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

## Solución de problemas

### "Command not found: brew"

Homebrew no se instaló correctamente. Verifica que Pasteaste el comando completo de instalación.

### MySQL no está instalado

```bash
brew install mysql
brew services start mysql
```

### Puerto 3000 o 5173 ocupado

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3000
sudo lsof -i :5173

# Matar el proceso
sudo kill [PID]
```

### Error de permisos

Si hay errores de permisos, ejecuta:

```bash
sudo chown -R $USER /Users/felipe.sotelo/RentalBiz
```

## Verificación final

Abre tu navegador y visita:
- http://localhost:5173 (Frontend)
- http://localhost:3000/api/health (Backend - debe responder con JSON)
