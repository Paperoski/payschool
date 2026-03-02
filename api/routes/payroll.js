// ==============================================================
// PAYSCHOOL - Rutas de Nómina
// ==============================================================
// GET  /api/nomina/dashboard              → Estadísticas del panel
// GET  /api/nomina/periodos               → Listar períodos
// POST /api/nomina/periodos               → Crear período
// POST /api/nomina/periodos/:id/procesar  → Calcular nómina automática
// GET  /api/nomina/periodos/:id/detalle   → Ver nóminas del período
// PUT  /api/nomina/periodos/:id/pagar     → Marcar como pagado
// ==============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/nomina/dashboard - Estadísticas generales
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // Una sola query para obtener todos los KPIs del dashboard
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM empleados WHERE activo = TRUE)           AS total_empleados,
        (SELECT COUNT(*) FROM periodos_nomina WHERE estado = 'pagado') AS periodos_pagados,
        (SELECT COUNT(*) FROM periodos_nomina
         WHERE estado IN ('borrador','procesando','aprobado'))         AS periodos_pendientes,
        (SELECT IFNULL(SUM(total_neto), 0) FROM periodos_nomina
         WHERE MONTH(fecha_pago) = MONTH(CURDATE())
           AND YEAR(fecha_pago)  = YEAR(CURDATE()))                    AS nomina_mes
    `);

    // Últimos 5 períodos registrados
    const [ultimosPeriodos] = await db.query(`
      SELECT id, nombre, estado, total_neto, fecha_pago
      FROM periodos_nomina
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Resumen de masa salarial por departamento
    const [porDepartamento] = await db.query(`
      SELECT d.nombre,
             COUNT(e.id)          AS total,
             SUM(e.salario_base)  AS masa_salarial
      FROM departamentos d
      LEFT JOIN empleados e ON d.id = e.departamento_id AND e.activo = TRUE
      GROUP BY d.id, d.nombre
      ORDER BY masa_salarial DESC
    `);

    res.json({ success: true, data: { stats, ultimosPeriodos, porDepartamento } });

  } catch (error) {
    console.error('[NOMINA] Error en dashboard:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

// GET /api/nomina/periodos - Listar todos los períodos
router.get('/periodos', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.nombre AS creado_por_nombre
      FROM periodos_nomina p
      LEFT JOIN usuarios u ON p.created_by = u.id
      ORDER BY p.fecha_inicio DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener períodos' });
  }
});

// POST /api/nomina/periodos - Crear nuevo período
router.post('/periodos', authMiddleware, requireRole('superadmin', 'admin', 'contador'), async (req, res) => {
  try {
    const { nombre, tipo, fecha_inicio, fecha_fin, fecha_pago, observaciones } = req.body;

    if (!nombre || !fecha_inicio || !fecha_fin || !fecha_pago) {
      return res.status(400).json({
        success: false,
        message: 'Requeridos: nombre, fecha_inicio, fecha_fin, fecha_pago'
      });
    }

    const [result] = await db.query(`
      INSERT INTO periodos_nomina
        (nombre, tipo, fecha_inicio, fecha_fin, fecha_pago, observaciones, created_by)
      VALUES (?,?,?,?,?,?,?)
    `, [nombre, tipo || 'mensual', fecha_inicio, fecha_fin, fecha_pago,
        observaciones || null, req.user.id]);

    res.status(201).json({
      success: true,
      message: 'Período creado. Ahora puedes procesarlo.',
      id: result.insertId
    });

  } catch (error) {
    console.error('[NOMINA] Error creando período:', error);
    res.status(500).json({ success: false, message: 'Error al crear período' });
  }
});

// POST /api/nomina/periodos/:id/procesar
// Calcula automáticamente la nómina de todos los empleados activos
router.post('/periodos/:id/procesar', authMiddleware, requireRole('superadmin', 'admin', 'contador'), async (req, res) => {
  // Usar una transacción para que si algo falla, todo se revierta
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar que el período existe y está en borrador
    const [periodos] = await conn.query('SELECT * FROM periodos_nomina WHERE id = ?', [req.params.id]);
    if (!periodos.length) {
      return res.status(404).json({ success: false, message: 'Período no encontrado' });
    }
    if (periodos[0].estado !== 'borrador') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden procesar períodos en estado "borrador"'
      });
    }

    // Marcar como procesando
    await conn.query('UPDATE periodos_nomina SET estado = "procesando" WHERE id = ?', [req.params.id]);

    // Obtener todos los empleados activos
    const [empleados] = await conn.query('SELECT * FROM empleados WHERE activo = TRUE');

    // Obtener conceptos que aplican a todos (automáticos)
    const [conceptos] = await conn.query(
      'SELECT * FROM conceptos_nomina WHERE activo = TRUE AND aplica_todos = TRUE'
    );

    let totalIngresosGlobal = 0;
    let totalDeduccionesGlobal = 0;
    let totalNetoGlobal = 0;

    // Calcular nómina para cada empleado
    for (const emp of empleados) {
      let ingresosEmp   = 0;
      let deduccionesEmp = 0;
      let aportesEmp    = 0;
      const detalles    = [];

      for (const concepto of conceptos) {
        let monto = 0;

        if (concepto.tipo === 'ingreso') {
          if (concepto.codigo === 'SAL001') {
            // Salario base es el del empleado
            monto = parseFloat(emp.salario_base);
          } else if (concepto.calculo === 'fijo') {
            monto = parseFloat(concepto.valor);
          }
          ingresosEmp += monto;

        } else if (concepto.tipo === 'deduccion' && concepto.calculo === 'porcentaje') {
          // Las deducciones se calculan sobre el salario base
          monto = parseFloat(emp.salario_base) * parseFloat(concepto.valor) / 100;
          deduccionesEmp += monto;

        } else if (concepto.tipo === 'aporte_patronal' && concepto.calculo === 'porcentaje') {
          monto = parseFloat(emp.salario_base) * parseFloat(concepto.valor) / 100;
          aportesEmp += monto;
        }

        if (monto > 0) {
          detalles.push({
            concepto_id: concepto.id,
            descripcion: concepto.nombre,
            monto: monto.toFixed(2)
          });
        }
      }

      const netoEmp = ingresosEmp - deduccionesEmp;
      totalIngresosGlobal   += ingresosEmp;
      totalDeduccionesGlobal += deduccionesEmp;
      totalNetoGlobal        += netoEmp;

      // Insertar o actualizar nómina del empleado
      const [nomResult] = await conn.query(`
        INSERT INTO nominas
          (periodo_id, empleado_id, salario_base, total_ingresos,
           total_deducciones, total_aportes_patronales, salario_neto)
        VALUES (?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          total_ingresos=VALUES(total_ingresos),
          total_deducciones=VALUES(total_deducciones),
          salario_neto=VALUES(salario_neto)
      `, [req.params.id, emp.id, emp.salario_base,
          ingresosEmp.toFixed(2), deduccionesEmp.toFixed(2),
          aportesEmp.toFixed(2), netoEmp.toFixed(2)]);

      // Insertar detalle de conceptos aplicados
      const nomId = nomResult.insertId;
      if (nomId && detalles.length) {
        await conn.query('DELETE FROM detalle_nomina WHERE nomina_id = ?', [nomId]);
        for (const d of detalles) {
          await conn.query(
            'INSERT INTO detalle_nomina (nomina_id, concepto_id, descripcion, monto) VALUES (?,?,?,?)',
            [nomId, d.concepto_id, d.descripcion, d.monto]
          );
        }
      }
    }

    // Actualizar totales del período y marcarlo como aprobado
    await conn.query(`
      UPDATE periodos_nomina
      SET estado = 'aprobado',
          total_ingresos    = ?,
          total_deducciones = ?,
          total_neto        = ?
      WHERE id = ?
    `, [
      totalIngresosGlobal.toFixed(2),
      totalDeduccionesGlobal.toFixed(2),
      totalNetoGlobal.toFixed(2),
      req.params.id
    ]);

    await conn.commit();

    res.json({
      success: true,
      message: `Nómina procesada para ${empleados.length} empleados`,
      resumen: {
        empleados: empleados.length,
        total_ingresos:   totalIngresosGlobal.toFixed(2),
        total_deducciones: totalDeduccionesGlobal.toFixed(2),
        total_neto:       totalNetoGlobal.toFixed(2)
      }
    });

  } catch (error) {
    await conn.rollback(); // Revertir todo si hubo error
    console.error('[NOMINA] Error procesando:', error);
    res.status(500).json({ success: false, message: 'Error al procesar nómina' });
  } finally {
    conn.release();
  }
});

// GET /api/nomina/periodos/:id/detalle - Ver nóminas individuales
router.get('/periodos/:id/detalle', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT n.*,
             CONCAT(e.nombre,' ',e.apellido) AS empleado,
             e.codigo,
             d.nombre AS departamento
      FROM nominas n
      JOIN empleados e ON n.empleado_id = e.id
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE n.periodo_id = ?
      ORDER BY e.apellido, e.nombre
    `, [req.params.id]);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener detalle' });
  }
});

// PUT /api/nomina/periodos/:id/pagar - Marcar como pagado y notificar
router.put('/periodos/:id/pagar', authMiddleware, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    // Marcar período como pagado con quién aprobó
    await db.query(`
      UPDATE periodos_nomina
      SET estado = 'pagado', aprobado_por = ?, aprobado_en = NOW()
      WHERE id = ?
    `, [req.user.id, req.params.id]);

    // Marcar todas las nóminas individuales como pagadas
    await db.query(
      'UPDATE nominas SET estado = "pagado", fecha_pago = NOW() WHERE periodo_id = ?',
      [req.params.id]
    );

    // Crear notificación para cada empleado que tenga usuario vinculado
    const [empleados] = await db.query(`
      SELECT e.usuario_id
      FROM nominas n
      JOIN empleados e ON n.empleado_id = e.id
      WHERE n.periodo_id = ? AND e.usuario_id IS NOT NULL
    `, [req.params.id]);

    for (const emp of empleados) {
      await db.query(`
        INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, icono)
        VALUES (?, ?, ?, 'pago', 'dollar-sign')
      `, [
        emp.usuario_id,
        '💰 Pago de Nómina Procesado',
        'Tu pago de nómina ha sido procesado exitosamente. Revisa tu cuenta bancaria.'
      ]);
    }

    res.json({
      success: true,
      message: 'Nómina marcada como pagada. Empleados notificados.'
    });

  } catch (error) {
    console.error('[NOMINA] Error marcando pago:', error);
    res.status(500).json({ success: false, message: 'Error al procesar pago' });
  }
});

module.exports = router;
