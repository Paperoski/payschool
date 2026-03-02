// ==============================================================
// PAYSCHOOL - Rutas de Notificaciones
// ==============================================================
// GET /api/notificaciones              → Mis notificaciones
// PUT /api/notificaciones/:id/leer     → Marcar una como leída
// PUT /api/notificaciones/leer-todas/all → Marcar todas como leídas
// ==============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notificaciones - Obtener las del usuario autenticado
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    // Contar cuántas no han sido leídas
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = FALSE',
      [req.user.id]
    );

    res.json({ success: true, data: rows, no_leidas: total });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
  }
});

// PUT /api/notificaciones/leer-todas/all
// Ruta especial ANTES de /:id para no confundirse con el ID
router.put('/leer-todas/all', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ?',
      [req.user.id]
    );
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// PUT /api/notificaciones/:id/leer - Marcar una notificación específica
router.put('/:id/leer', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

module.exports = router;
