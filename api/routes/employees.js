// ==============================================================
// PAYSCHOOL - Rutas de Gestión de Empleados
// ==============================================================
// GET    /api/empleados                → Listar empleados (con filtros)
// GET    /api/empleados/departamentos/list → Lista de departamentos
// GET    /api/empleados/:id            → Obtener empleado
// POST   /api/empleados               → Crear empleado
// PUT    /api/empleados/:id            → Actualizar empleado
// DELETE /api/empleados/:id            → Dar de baja (soft delete)
// ==============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/empleados/departamentos/list
// Ruta especial ANTES de /:id para evitar conflictos
router.get('/departamentos/list', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM departamentos WHERE activo = TRUE ORDER BY nombre'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener departamentos' });
  }
});

// GET /api/empleados - Listar con filtros opcionales
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { activo, departamento_id, search } = req.query;

    // Construir query dinámicamente según los filtros recibidos
    let query = `
      SELECT e.*, d.nombre AS departamento_nombre
      FROM empleados e
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por estado activo/inactivo
    if (activo !== undefined) {
      query += ' AND e.activo = ?';
      params.push(activo === 'true');
    }

    // Filtro por departamento
    if (departamento_id) {
      query += ' AND e.departamento_id = ?';
      params.push(departamento_id);
    }

    // Búsqueda por nombre, apellido, código o email
    if (search) {
      query += ' AND (e.nombre LIKE ? OR e.apellido LIKE ? OR e.codigo LIKE ? OR e.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY e.apellido, e.nombre';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows, total: rows.length });

  } catch (error) {
    console.error('[EMPLEADOS] Error listando:', error);
    res.status(500).json({ success: false, message: 'Error al obtener empleados' });
  }
});

// GET /api/empleados/:id - Obtener uno
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, d.nombre AS departamento_nombre
      FROM empleados e
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }
    res.json({ success: true, data: rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// POST /api/empleados - Crear nuevo empleado
router.post('/', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      codigo, nombre, apellido, email, telefono, fecha_nacimiento,
      genero, direccion, departamento_id, cargo, tipo_contrato,
      fecha_ingreso, salario_base, cuenta_bancaria, banco, numero_identificacion
    } = req.body;

    // Campos mínimos requeridos
    if (!codigo || !nombre || !apellido || !email || !fecha_ingreso || !salario_base) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: codigo, nombre, apellido, email, fecha_ingreso, salario_base'
      });
    }

    const [result] = await db.query(`
      INSERT INTO empleados
        (codigo, nombre, apellido, email, telefono, fecha_nacimiento, genero,
         direccion, departamento_id, cargo, tipo_contrato, fecha_ingreso,
         salario_base, cuenta_bancaria, banco, numero_identificacion)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      codigo, nombre, apellido, email, telefono || null, fecha_nacimiento || null,
      genero || null, direccion || null, departamento_id || null, cargo || null,
      tipo_contrato || 'tiempo_completo', fecha_ingreso, salario_base,
      cuenta_bancaria || null, banco || null, numero_identificacion || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      id: result.insertId
    });

  } catch (error) {
    // Error de duplicado (código o email ya existe)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un empleado con ese código o email'
      });
    }
    console.error('[EMPLEADOS] Error creando:', error);
    res.status(500).json({ success: false, message: 'Error al crear empleado' });
  }
});

// PUT /api/empleados/:id - Actualizar empleado
router.put('/:id', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      nombre, apellido, email, telefono, fecha_nacimiento, genero,
      direccion, departamento_id, cargo, tipo_contrato, salario_base,
      cuenta_bancaria, banco, numero_identificacion, activo
    } = req.body;

    await db.query(`
      UPDATE empleados SET
        nombre=?, apellido=?, email=?, telefono=?, fecha_nacimiento=?,
        genero=?, direccion=?, departamento_id=?, cargo=?, tipo_contrato=?,
        salario_base=?, cuenta_bancaria=?, banco=?, numero_identificacion=?, activo=?
      WHERE id=?
    `, [
      nombre, apellido, email, telefono || null, fecha_nacimiento || null,
      genero || null, direccion || null, departamento_id || null,
      cargo || null, tipo_contrato, salario_base,
      cuenta_bancaria || null, banco || null, numero_identificacion || null,
      activo !== undefined ? activo : true, req.params.id
    ]);

    res.json({ success: true, message: 'Empleado actualizado correctamente' });

  } catch (error) {
    console.error('[EMPLEADOS] Error actualizando:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

// DELETE /api/empleados/:id - Dar de baja (no borrar)
router.delete('/:id', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    // Marcar como inactivo y registrar fecha de salida
    await db.query(
      'UPDATE empleados SET activo = FALSE, fecha_egreso = CURDATE() WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Empleado dado de baja correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al dar de baja' });
  }
});

module.exports = router;
