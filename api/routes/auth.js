const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { DATA_FILES } = require('../utils/dataFiles');
const { readJson, writeJson, nextId, migrateIfNeeded } = require('../utils/jsonStore');

const router = express.Router();

const legacyUsersPath = path.join(__dirname, '../../data/usuarios.json');

const DEFAULT_ADMIN = {
  nombre: 'Administrador',
  email: 'admin@payschool.com',
  rol: 'admin',
  activo: true
};

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

function normalizeLegacyUsers(rows = []) {
  return rows.map((row, index) => ({
    id: row.id || index + 1,
    nombre: row.nombre || [row.nombre, row.apellido].filter(Boolean).join(' ') || `Usuario ${index + 1}`,
    email: normalizeEmail(row.email),
    password: row.password,
    rol: row.rol || (Number(row.rol_id) === 1 ? 'superadmin' : 'admin'),
    activo: row.activo !== false,
    fecha_creacion: row.fecha_creacion || row.created_at || new Date().toISOString()
  })).filter((user) => user.email && user.password);
}

async function ensureUsersStore() {
  const migrated = migrateIfNeeded(DATA_FILES.users, [legacyUsersPath], []);
  let users = Array.isArray(migrated) ? migrated : [];

  users = users.map((user, idx) => ({
    id: user.id || idx + 1,
    nombre: user.nombre || `Usuario ${idx + 1}`,
    email: normalizeEmail(user.email),
    password: user.password,
    rol: user.rol || 'usuario',
    activo: user.activo !== false,
    fecha_creacion: user.fecha_creacion || new Date().toISOString()
  })).filter((user) => user.email && user.password);

  if (users.some((user) => user.apellido !== undefined || user.rol_id !== undefined)) {
    users = normalizeLegacyUsers(users);
  }

  const hasAdmin = users.some((user) => normalizeEmail(user.email) === DEFAULT_ADMIN.email);
  if (!hasAdmin) {
    users.unshift({
      id: nextId(users),
      ...DEFAULT_ADMIN,
      password: await bcrypt.hash('password', 10),
      fecha_creacion: new Date().toISOString()
    });
  }

  writeJson(DATA_FILES.users, users);
  return users;
}

router.post('/login', async (req, res) => {
  try {
    const users = await ensureUsersStore();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Debes ingresar correo y contraseña.' });
    }

    const user = users.find((item) => normalizeEmail(item.email) === email);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Correo incorrecto o no registrado.' });
    }

    if (user.activo === false) {
      return res.status(403).json({ success: false, message: 'Tu usuario está inactivo. Contacta al administrador.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password || '');
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        email: normalizeEmail(user.email),
        rol: user.rol || 'usuario'
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

module.exports = router;
