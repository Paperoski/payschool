const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');
const { autonomousAccountingAudit, validateEntry } = require('../services/accountingEngine');

const router = express.Router();

const asientosPath = path.join(__dirname, '../../data/asientos_contables.json');
const pucPath = path.join(__dirname, '../../data/puc_base.json');

router.get('/asientos', (req, res) => {
  const asientos = readJson(asientosPath, []).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  return res.json({ success: true, data: asientos });
});

router.get('/resumen', (req, res) => {
  const asientos = readJson(asientosPath, []);
  const mensual = {};

  asientos.forEach((entry) => {
    const parsedDate = new Date(entry.fecha || entry.created_at || Date.now());
    const period = Number.isNaN(parsedDate.getTime()) ? 'sin-fecha' : parsedDate.toISOString().slice(0, 7);
    mensual[period] = (mensual[period] || 0) + (Number(entry.total) || 0);
  });

  const totalDebitos = asientos.reduce((acc, entry) => acc + (Number(entry.total) || 0), 0);
  const totalMovimientos = asientos.reduce((acc, entry) => acc + (entry.movimientos?.length || 0), 0);

  return res.json({
    success: true,
    data: {
      total_asientos: asientos.length,
      total_movimientos: totalMovimientos,
      total_debitos: totalDebitos,
      mensual
    }
  });
});

router.get('/autonomo/verificar', (req, res) => {
  const asientos = readJson(asientosPath, []);
  const puc = readJson(pucPath, []);
  const audit = autonomousAccountingAudit(asientos, puc);
  return res.json({ success: true, data: audit });
});

router.post('/asiento', (req, res) => {
  const { fecha, descripcion, comprobante, movimientos } = req.body;

  if (!Array.isArray(movimientos) || movimientos.length < 2) {
    return res.status(400).json({ success: false, message: 'El asiento debe incluir mínimo 2 movimientos.' });
  }

  const puc = readJson(pucPath, []);
  const check = validateEntry({ id: 0, fecha, comprobante, movimientos }, puc);

  if (!check.is_balanced) {
    return res.status(400).json({
      success: false,
      message: `Partida doble inválida: débito ${check.total_debito} vs crédito ${check.total_credito}.`
    });
  }

  if (check.invalid_movement_count > 0) {
    return res.status(400).json({
      success: false,
      message: 'El asiento contiene movimientos inválidos o cuentas no existentes.',
      invalid_movements: check.invalid_movements
    });
  }

  const asientos = readJson(asientosPath, []);
  const nuevoAsiento = {
    id: nextId(asientos),
    fecha: fecha || new Date().toISOString().split('T')[0],
    descripcion: descripcion || 'Asiento contable',
    comprobante: comprobante || 'General',
    movimientos,
    total: check.total_debito,
    estado: 'Asentado',
    created_at: new Date().toISOString()
  };

  asientos.push(nuevoAsiento);
  writeJson(asientosPath, asientos);

  return res.status(201).json({ success: true, message: 'Asiento contable registrado correctamente.', data: nuevoAsiento });
});

module.exports = router;
