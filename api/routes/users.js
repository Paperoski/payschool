// ==============================================================
// PAYSCHOOL - Rutas de Gestión de Usuarios
// ==============================================================
// GET    /api/usuarios           → Listar todos los usuarios
// GET    /api/usuarios/roles/list → Listar roles disponibles
// GET    /api/usuarios/:id        → Obtener un usuario
// POST   /api/usuarios           → Crear usuario
// PUT    /api/usuarios/:id        → Actualizar usuario
// DELETE /api/usuarios/:id        → Desactivar usuario (soft delete)
// ==============================================================

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/usuarios/roles/list
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para no confundirse
router.get('/roles/list', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nombre, descripcion FROM roles ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener roles' });
  }
});

// GET /api/usuarios - Listar todos (solo admins)
router.get('/', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.activo,
             u.ultimo_login, u.created_at,
             r.nombre AS rol, r.id AS rol_id
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[USUARIOS] Error listando:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
});

// GET /api/usuarios/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.activo,
             u.ultimo_login, u.created_at,
             r.nombre AS rol, r.id AS rol_id
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// POST /api/usuarios - Crear nuevo usuario
router.post('/', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol_id } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !password || !rol_id) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: nombre, apellido, email, password, rol_id'
      });
    }

    // Verificar email único
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    // Encriptar contraseña antes de guardar
    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol_id) VALUES (?,?,?,?,?)',
      [nombre, apellido, email, hash, rol_id]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      id: result.insertId
    });

  } catch (error) {
    console.error('[USUARIOS] Error creando:', error);
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
});

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { nombre, apellido, email, rol_id, activo, password } = req.body;

    // Si se envía nueva contraseña, actualizarla también
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE usuarios SET nombre=?, apellido=?, email=?, rol_id=?, activo=?, password=? WHERE id=?',
        [nombre, apellido, email, rol_id, activo, hash, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre=?, apellido=?, email=?, rol_id=?, activo=? WHERE id=?',
        [nombre, apellido, email, rol_id, activo, req.params.id]
      );
    }

    res.json({ success: true, message: 'Usuario actualizado correctamente' });

  } catch (error) {
    console.error('[USUARIOS] Error actualizando:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

// DELETE /api/usuarios/:id - Desactivar (nunca borrar físicamente)
router.delete('/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    // No permitir que el admin se elimine a sí mismo
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propio usuario'
      });
    }

    // Soft delete: marcar como inactivo en lugar de borrar
    await db.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Usuario desactivado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al desactivar usuario' });
  }
});

module.exports = router;
