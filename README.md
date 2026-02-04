# RentalBiz - Sistema de Gestión Integral de Propiedades en Renta

Sistema web completo para la gestión de propiedades en renta, incluyendo autenticación, propiedades, contratos, pagos y notificaciones.

## 🚀 Características

- **Autenticación Segura**: Registro y login con validación JWT
- **Gestión de Propiedades**: Apartamentos, casas y bodegas
- **Gestión de Contratos**: Contratos de arrendamiento con fechas y condiciones
- **Sistema de Pagos**: Seguimiento de pagos de renta y servicios
- **Notificaciones**: Recordatorios automáticos por email
- **Roles**: Arrendador y Arrendatario

## 📋 Requisitos

- Node.js 18.x o superior
- MySQL 8.0
- npm o yarn

## 🛠️ Instalación

### 1. Configuración Inicial

Ejecutar el script de configuración:
```batch
scripts\setup.bat
```

### 2. Configurar Base de Datos

Crear la base de datos en MySQL:
```sql
CREATE DATABASE rentalbiz_local;
```

### 3. Configurar Variables de Entorno

Copiar y editar el archivo `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rentalbiz_local
DB_USER=root
DB_PASSWORD=tu_password
```

### 4. Ejecutar Migraciones

```batch
scripts\migrate.bat
```

## 🏃 Ejecución en Desarrollo

```batch
npm run dev
```

Esto iniciará:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## 🚀 Despliegue en Producción

### 1. Configurar Variables de Producción

Copiar `.env.production` y configurar:
- Credenciales de base de datos
- JWT Secret (mínimo 32 caracteres)
- Configuración de email SMTP

### 2. Ejecutar Despliegue

```batch
scripts\deploy.bat
```

### 3. Iniciar Servidor

```batch
cd backend
node server.js
```

O usando PM2:
```batch
pm2 start server.js --name rentalbiz
```

## 📁 Estructura del Proyecto

```
RentalBiz/
├── .env.local              # Variables locales
├── .env.production         # Variables producción
├── backend/                # API Node.js + Express
│   ├── config/             # Configuración BD
│   ├── models/             # Modelos Sequelize
│   ├── controllers/        # Controladores
│   ├── routes/             # Rutas API
│   ├── middleware/         # Auth, validation
│   ├── services/           # Lógica de negocio
│   └── server.js           # Entry point
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/     # Componentes
│   │   ├── pages/          # Páginas
│   │   ├── context/        # Auth context
│   │   └── services/       # API calls
│   └── package.json
├── scripts/                # Scripts Windows
│   ├── setup.bat           # Configuración inicial
│   ├── deploy.bat          # Despliegue
│   └── migrate.bat         # Migraciones BD
└── plans/                  # Documentación
```

## 🔑 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Perfil usuario

### Propiedades
- `GET /api/properties` - Listar propiedades
- `POST /api/properties` - Crear propiedad
- `GET /api/properties/:id` - Detalle propiedad
- `PUT /api/properties/:id` - Actualizar propiedad
- `DELETE /api/properties/:id` - Eliminar propiedad

### Contratos
- `GET /api/contracts` - Listar contratos
- `POST /api/contracts` - Crear contrato
- `GET /api/contracts/:id` - Detalle contrato
- `PUT /api/contracts/:id/status` - Cambiar estado

### Pagos
- `GET /api/payments` - Listar pagos
- `POST /api/payments` - Crear pago
- `PUT /api/payments/:id/pay` - Marcar como pagado
- `GET /api/payments/pending` - Pagos pendientes

## 👥 Roles de Usuario

### Arrendador (Landlord)
- Gestionar propiedades propias
- Crear y gestionar contratos
- Ver reportes de pagos
- Enviar recordatorios

### Arrendatario (Tenant)
- Ver propiedades disponibles
- Ver sus contratos
- Registrar pagos
- Ver historial de pagos

## 📧 Configuración de Email

En `.env.production`:
```env
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=465
EMAIL_USER=tu@email.com
EMAIL_PASS=tu_password
```

## 🧪 Pruebas

```batch
cd backend
npm test
```

## 📄 Documentación

- [Plan del Proyecto](plans/PLAN.md)
- [Documentación API](docs/API.md)
- [Manual de Usuario](docs/USER_MANUAL.md)
- [Guía de Despliegue](docs/DEPLOYMENT.md)

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración configurable
- Validación de datos en backend
- CORS configurado
- Helmet para headers seguros

## 📝 Licencia

MIT License

---

Desarrollado con ❤️ por RentalBiz Team
