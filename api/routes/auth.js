// ==============================================================
// PAYSCHOOL - Rutas de Autenticación
// ==============================================================
// POST /api/auth/login        → Iniciar sesión
// GET  /api/auth/me           → Obtener usuario actual
// POST /api/auth/logout       → Cerrar sesión (log)
// PUT  /api/auth/change-password → Cambiar contraseña
// ==============================================================

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// --------------------------------------------------------------
// POST /api/auth/login
// Recibe email y password, devuelve token JWT si son válidos
// --------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que vengan los campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario activo con su rol
    const [rows] = await db.query(
      `SELECT u.*, r.nombre AS rol_nombre, r.permisos
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.email = ? AND u.activo = TRUE`,
      [email]
    );

    // Si no existe el usuario, no revelar si el email existe
    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    const usuario = rows[0];

    // Comparar contraseña con el hash guardado en la BD
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Actualizar fecha de último acceso
    await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [usuario.id]);

    // Registrar en el log de actividad
    await db.query(
      'INSERT INTO logs_actividad (usuario_id, accion, modulo, descripcion, ip) VALUES (?,?,?,?,?)',
      [usuario.id, 'LOGIN', 'auth', `Login exitoso: ${usuario.email}`, req.ip]
    );

    // Generar token JWT con datos básicos (no sensibles)
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol_nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Nunca enviar el hash de la contraseña al cliente
    const { password: _, ...usuarioSeguro } = usuario;

    res.json({
      success: true,
      message: 'Bienvenido a PaySchool',
      token,
      usuario: usuarioSeguro
    });

  } catch (error) {
    console.error('[AUTH] Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// --------------------------------------------------------------
// GET /api/auth/me
// Devuelve los datos del usuario autenticado (requiere token)
// --------------------------------------------------------------
router.get('/me', authMiddleware, (req, res) => {
  const { password: _, ...usuario } = req.user;
  res.json({ success: true, usuario });
});

// --------------------------------------------------------------
// POST /api/auth/logout
// Registra el cierre de sesión en el log
// --------------------------------------------------------------
router.post('/logout', authMiddleware, async (req, res) => {
  await db.query(
    'INSERT INTO logs_actividad (usuario_id, accion, modulo, descripcion) VALUES (?,?,?,?)',
    [req.user.id, 'LOGOUT', 'auth', `Logout: ${req.user.email}`]
  );
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

// --------------------------------------------------------------
// PUT /api/auth/change-password
// Cambia la contraseña verificando primero la actual
// --------------------------------------------------------------
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ success: false, message: 'Ambas contraseñas son requeridas' });
    }

    if (password_nueva.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener hash actual del usuario
    const [rows] = await db.query('SELECT password FROM usuarios WHERE id = ?', [req.user.id]);
    const valida = await bcrypt.compare(password_actual, rows[0].password);

    if (!valida) {
      return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta' });
    }

    // Generar nuevo hash y guardar
    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [nuevoHash, req.user.id]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error('[AUTH] Error cambiando contraseña:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

module.exports = router;
