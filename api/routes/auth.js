const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const usersPath = path.join(__dirname, '../../data/users.json');
const usuariosPath = path.join(__dirname, '../../data/usuarios.json');

const DEFAULT_ADMIN = {
  id: 1,
  nombre: 'Rectoría / Administración',
  email: 'admin@colegioboston.edu.co',
  rol: 'admin'
};

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function mapLegacyUsuariosToUsers(rows = []) {
  return rows.map((row, index) => ({
    id: row.id || index + 1,
    nombre: row.nombre || [row.nombre, row.apellido].filter(Boolean).join(' ') || `Usuario ${index + 1}`,
    email: normalizeEmail(row.email),
    password: row.password,
    rol: row.rol || (row.rol_id === 1 ? 'superadmin' : 'admin'),
    activo: row.activo !== false,
    fecha_creacion: row.fecha_creacion || row.created_at || new Date().toISOString()
  })).filter((row) => row.email && row.password);
}

async function ensureUsersStore() {
  let users = safeReadJson(usersPath);

  if (!users.length) {
    const legacyUsers = mapLegacyUsuariosToUsers(safeReadJson(usuariosPath));
    if (legacyUsers.length) users = legacyUsers;
  }

  const hasValidPassword = users.some((u) => typeof u?.password === 'string' && u.password.length > 20);
  if (!users.length || !hasValidPassword) {
    const hashedPassword = await bcrypt.hash('password', 10);
    users = [{ ...DEFAULT_ADMIN, password: hashedPassword, fecha_creacion: new Date().toISOString(), activo: true }];
  }

  const adminExists = users.some((u) => normalizeEmail(u.email) === DEFAULT_ADMIN.email);
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('password', 10);
    users.unshift({ ...DEFAULT_ADMIN, password: hashedPassword, fecha_creacion: new Date().toISOString(), activo: true });
  }

  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
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

    const aliases = new Set([email]);
    if (email === 'admin@payschool.com') aliases.add('admin@colegioboston.edu.co');
    if (email === 'admin@colegioboston.edu.co') aliases.add('admin@payschool.com');

    const user = users.find((u) => aliases.has(normalizeEmail(u.email)));
    if (!user) {
      return res.status(401).json({ success: false, message: 'Correo incorrecto o no registrado.' });
    }

    if (user.activo === false) {
      return res.status(403).json({ success: false, message: 'Tu usuario está inactivo. Contacta al administrador.' });
    }

    const validPassword = await bcrypt.compare(password, user.password || '');
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        id: user.id,
        nombre: user.nombre,
        email: normalizeEmail(user.email),
        rol: user.rol || 'admin'
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

module.exports = router;
