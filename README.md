# Payschool

Sistema modular de nómina escolar con arquitectura **backend + frontend** sobre Express, usando **archivos JSON locales** como persistencia en `/data`.

> ⚠️ Este proyecto usa almacenamiento local en archivos JSON. Es ideal para MVP, intranet o despliegues pequeños, pero **no es escalable** para alta concurrencia o multi-servidor.

## Características principales

- Backend Express con rutas modulares en `api/routes`.
- Frontend estático consumiendo rutas relativas (`/api/...`).
- Autenticación con `bcrypt`.
- Persistencia 100% en JSON local.
- Registro de cambios del sistema (auditoría básica).
- Compatible con VPS y ejecución con PM2.

---

## Instalación paso a paso

### 1) Requisitos

- Node.js 18+
- npm 9+

### 2) Clonar e instalar

```bash
git clone <tu-repo>
cd payschool
npm install
```

### 3) Ejecutar en desarrollo

```bash
npm run dev
```

### 4) Ejecutar en producción

```bash
npm start
```

El servidor queda disponible en:

- `http://IP_DEL_SERVIDOR:3000`

---

## Despliegue en VPS (Ubuntu)

### 1) Instalar Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2) Subir proyecto

Puedes usar `git clone` o copiar archivos por `scp/rsync`.

### 3) Instalar dependencias

```bash
npm install --omit=dev
```

### 4) Ejecutar

```bash
npm start
```

---

## Uso con PM2

### Instalar PM2 globalmente

```bash
sudo npm i -g pm2
```

### Levantar la app

```bash
pm2 start api/index.js --name payschool
```

### Comandos útiles

```bash
pm2 status
pm2 logs payschool
pm2 restart payschool
pm2 stop payschool
```

### Persistencia al reiniciar el VPS

```bash
pm2 save
pm2 startup
```

PM2 te mostrará un comando adicional para ejecutar con `sudo`.

---

## Estructura del proyecto

```text
payschool/
├── api/
│   ├── index.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── employees.js
│   │   ├── payroll.js
│   │   ├── accounting.js
│   │   ├── users.js
│   │   ├── notifications.js
│   │   ├── chat.js
│   │   └── system.js
│   ├── services/
│   └── utils/
├── data/
│   ├── users.json
│   ├── employees.json
│   ├── payroll.json
│   ├── accounting.json
│   ├── notifications.json
│   ├── chat.json
│   └── system.json
├── frontend/
└── package.json
```

---

## Sistema de persistencia JSON

La app usa funciones reutilizables en `api/utils/jsonStore.js`:

- `readJson(filePath)`
- `writeJson(filePath, data)`
- `autoCreateFileIfNotExists(filePath, defaultValue)`

Además, durante la transición se soporta migración automática desde archivos legacy (por ejemplo `empleados.json` → `employees.json`) cuando el archivo nuevo aún está vacío.

---

## API y autenticación

- Login: `POST /api/auth/login`
- Validación de usuario activo.
- Contraseñas almacenadas con hash `bcrypt`.
- Control de acceso por rol mediante headers (`X-User-Role`, `X-User-Email`) en rutas protegidas.

Respuesta estándar:

```json
{ "success": true, "data": {} }
```

o

```json
{ "success": false, "message": "..." }
```

---

## Advertencia importante

Este esquema de base de datos local en JSON:

- ✅ Es simple de operar y respaldar.
- ✅ Funciona bien en una sola instancia.
- ❌ No reemplaza una base de datos transaccional en escenarios enterprise.
- ❌ Puede presentar conflictos de escritura con alta concurrencia.

Para crecimiento futuro se recomienda migrar a PostgreSQL/MySQL con capa de repositorio.
