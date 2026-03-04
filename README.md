# 🎓 Colegio Boston
### Sistema de Nómina Escolar — Glassmorphism Corporativo

---

## 📁 Estructura del Proyecto

```
colegio-boston/
├── vercel.json              ← Configuración de rutas para Vercel
├── package.json             ← Dependencias Node.js
├── .env.example             ← Variables de entorno (NUNCA subas .env)
├── .gitignore               ← Archivos ignorados por Git
├── database.sql             ← Script SQL completo (ejecutar 1 vez)
│
├── api/                     ← Backend (Node.js + Express)
│   ├── index.js             ← Servidor principal (compatible con Vercel)
│   ├── config/
│   │   └── db.js            ← Conexión MySQL
│   ├── middleware/
│   │   └── auth.js          ← Autenticación JWT + control de roles
│   └── routes/
│       ├── auth.js          ← Login, logout, cambio de contraseña
│       ├── users.js         ← CRUD de usuarios y roles
│       ├── employees.js     ← CRUD de empleados
│       ├── payroll.js       ← Períodos, procesamiento y pago de nómina
│       ├── notifications.js ← Notificaciones por usuario
│       └── accounting.js    ← Libros contables y balance
│
└── frontend/                ← Interfaz web (HTML + CSS + JS puro)
    ├── index.html           ← Página de Login
    ├── css/
    │   └── styles.css       ← Estilos globales (glassmorphism)
    ├── js/
    │   └── app.js           ← Utilidades: API client, toast, modales
    └── pages/
        ├── dashboard.html   ← Panel principal con KPIs
        ├── employees.html   ← Gestión de empleados
        ├── payroll.html     ← Nómina y períodos de pago
        ├── accounting.html  ← Libros contables y balance
        └── users.html       ← Gestión de usuarios y roles
```

---

## 🚀 DEPLOY EN VERCEL (Paso a Paso)

### PASO 1 — Preparar el repositorio en GitHub

```bash
# En tu máquina local
git init
git add .
git commit -m "feat: Colegio Boston inicial"

# Crear repositorio en github.com y conectarlo
git remote add origin https://github.com/TU_USUARIO/colegio-boston.git
git push -u origin main
```

### PASO 2 — Importar en Vercel

1. Ve a **https://vercel.com** e inicia sesión
2. Clic en **"Add New Project"**
3. Selecciona tu repositorio **colegio-boston** de GitHub
4. Vercel lo detectará como Node.js automáticamente
5. **NO cambies nada** en la configuración — `vercel.json` ya está listo

### PASO 3 — Configurar Variables de Entorno en Vercel

⚠️ **NUNCA pongas credenciales directamente en el código**

En Vercel, ve a tu proyecto → **Settings → Environment Variables** y agrega:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DB_HOST` | `tu-servidor.com` | Host de tu MySQL remoto |
| `DB_PORT` | `3306` | Puerto MySQL |
| `DB_USER` | `tu_usuario` | Usuario de la base de datos |
| `DB_PASSWORD` | `tu_contraseña` | Contraseña (Vercel la encripta) |
| `DB_NAME` | `colegio_boston` | Nombre de la base de datos |
| `JWT_SECRET` | `una-cadena-larga-y-aleatoria` | Firma de tokens JWT |
| `JWT_EXPIRES_IN` | `24h` | Tiempo de expiración del token |
| `NODE_ENV` | `production` | Entorno de producción |
| `FRONTEND_URL` | `https://tu-proyecto.vercel.app` | URL de tu frontend en Vercel |

> 💡 Para generar un JWT_SECRET seguro:
> https://generate-secret.vercel.app/32

### PASO 4 — Base de Datos

Tu MySQL debe ser **accesible desde internet** para que Vercel pueda conectarse.

Opciones recomendadas:
- ✅ **Tu servidor propio** con MySQL abierto al exterior (configura firewall)
- ✅ **PlanetScale** (MySQL gratuito en la nube): https://planetscale.com
- ✅ **Railway** (MySQL gratuito): https://railway.app
- ✅ **Amazon RDS** (de pago, muy estable)

Una vez configurada, ejecuta el script:
```bash
mysql -h TU_HOST -u TU_USUARIO -p < database.sql
```

### PASO 5 — Deploy

```bash
git push origin main
```

¡Vercel hace el deploy automáticamente con cada push! 🎉

---

## 💻 DESARROLLO LOCAL

```bash
# Clonar el repo
git clone https://github.com/TU_USUARIO/colegio-boston.git
cd colegio-boston

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales locales

# Crear la base de datos
mysql -u root -p < database.sql

# Iniciar servidor de desarrollo
npm run dev
# → API disponible en http://localhost:3000/api

# Abrir el frontend
# Instala Live Server en VS Code
# Click derecho en frontend/index.html → "Open with Live Server"
# → http://localhost:5500
```

---

## 🔑 Acceso Inicial

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@colegioboston.edu.co` | `password` | superadmin |

> ⚠️ **Cambia la contraseña inmediatamente** después del primer acceso

---

## 📡 Endpoints de la API

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/auth/login` | Iniciar sesión | Público |
| GET | `/api/auth/me` | Usuario actual | Autenticado |
| POST | `/api/auth/logout` | Cerrar sesión | Autenticado |
| PUT | `/api/auth/change-password` | Cambiar contraseña | Autenticado |
| GET | `/api/empleados` | Listar empleados | Todos |
| POST | `/api/empleados` | Crear empleado | admin+ |
| PUT | `/api/empleados/:id` | Editar empleado | admin+ |
| DELETE | `/api/empleados/:id` | Dar de baja | admin+ |
| GET | `/api/nomina/dashboard` | Estadísticas | Todos |
| GET | `/api/nomina/periodos` | Listar períodos | Todos |
| POST | `/api/nomina/periodos` | Crear período | contador+ |
| POST | `/api/nomina/periodos/:id/procesar` | Calcular nómina | contador+ |
| PUT | `/api/nomina/periodos/:id/pagar` | Marcar pagado | admin+ |
| GET | `/api/usuarios` | Listar usuarios | admin+ |
| POST | `/api/usuarios` | Crear usuario | admin+ |
| GET | `/api/contabilidad/libros` | Libro diario | Todos |
| POST | `/api/contabilidad/libros` | Crear asiento | contador+ |
| GET | `/api/contabilidad/balance` | Balance general | Todos |
| GET | `/api/notificaciones` | Mis notificaciones | Autenticado |
| GET | `/api/health` | Estado del servidor | Público |

---

## 🛡️ Roles del Sistema

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `superadmin` | Acceso total | Todo |
| `admin` | Administrador | Nómina, empleados, reportes, usuarios |
| `contador` | Contabilidad | Nómina, reportes, libros |
| `empleado` | Personal | Solo sus recibos |

---

## 🎨 Stack Tecnológico

**Backend:** Node.js 18+, Express, MySQL2, JWT, bcryptjs  
**Frontend:** HTML5, CSS3, JavaScript Vanilla (sin frameworks)  
**Base de Datos:** MySQL 8+  
**Hosting:** Vercel (frontend + serverless API)  
**Fuentes:** Syne + DM Sans (Google Fonts)  

---

## ❓ Problemas Comunes

**"Cannot connect to MySQL"**
→ Verifica que tu servidor MySQL permita conexiones remotas  
→ Revisa que DB_HOST, DB_USER y DB_PASSWORD sean correctos en Vercel

**"401 Unauthorized"**
→ El token expiró. Cierra sesión y vuelve a entrar  
→ Verifica que JWT_SECRET sea el mismo en local y en Vercel

**"CORS error"**
→ Asegúrate de que FRONTEND_URL en Vercel sea la URL exacta de tu dominio

**Las páginas internas dan 404 en Vercel**
→ Verifica que `vercel.json` esté en la raíz del proyecto  
→ Las rutas deben estar bien configuradas ahí

---

*Colegio Boston v1.0 — Sistema de Nómina Escolar*
