# Resetear Contraseña de MySQL en macOS

## Pasos para resetear la contraseña de root

### 1. Detener MySQL si está corriendo

```bash
brew services stop mysql
```

O si usas ellaunchd de macOS:

```bash
sudo mysql.server stop
```

### 2. Iniciar MySQL en modo seguro (sin validación de contraseña)

```bash
mysqld_safe --skip-grant-tables &
```

Este comando iniciará MySQL sin pedir contraseña. El símbolo `&` lo ejecuta en segundo plano.

### 3. Conectarse a MySQL

```bash
mysql -u root
```

### 4. Ejecutar comandos SQL para resetear contraseña

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'rentalbiz123';
FLUSH PRIVILEGES;
EXIT;
```

### 5. Detener el modo seguro

Presiona `Ctrl + C` en la terminal donde ejecutaste `mysqld_safe`

### 6. Reiniciar MySQL normalmente

```bash
brew services start mysql
```

O:

```bash
sudo mysql.server start
```

### 7. Verificar que funciona

```bash
mysql -u root -prentalbiz123
```

Si todo salió bien, verás el prompt de MySQL:

```
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 8
Server version: 8.0.x Homebrew

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> 
```

### 8. Crear la base de datos

```sql
CREATE DATABASE IF NOT EXISTS rentalbiz_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

## Verificar estado de MySQL

```bash
# Ver si MySQL está corriendo
brew services list

# Ver proceso de MySQL
ps aux | grep mysql
```

## Solución de problemas

### Si `mysqld_safe` no se encuentra

```bash
# Encontrar dónde está MySQL
which mysqld_safe

# O usar el path completo
/usr/local/opt/mysql/bin/mysqld_safe --skip-grant-tables &
```

### Si hay otro proceso MySQL corriendo

```bash
# Matar todos los procesos MySQL
sudo killall mysql mysqld

# O matar proceso específico
sudo kill [PID]
```

### Si el puerto 3306 está ocupado

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3306

# Matar el proceso
sudo kill [PID]
```

## Configuración de la aplicación

Una vez establecida la contraseña `rentalbiz123`, la aplicación ya está configurada en:

- `.env.local`: `DB_PASSWORD=rentalbiz123`
- `backend/config/config.json`: `"password": "rentalbiz123"`
