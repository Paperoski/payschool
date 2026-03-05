const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId, migrateIfNeeded } = require('../utils/jsonStore');
const { DATA_FILES } = require('../utils/dataFiles');

const router = express.Router();

migrateIfNeeded(DATA_FILES.notifications, [path.join(__dirname, '../../data/notificaciones.json')], []);

router.get('/', (req, res) => {
  const data = readJson(DATA_FILES.notifications, []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return res.json({ success: true, data, no_leidas: data.filter((item) => !item.leida).length });
});

router.post('/', (req, res) => {
  const { titulo, mensaje, tipo = 'info' } = req.body;
  if (!titulo || !mensaje) return res.status(400).json({ success: false, message: 'titulo y mensaje son obligatorios.' });

  const data = readJson(DATA_FILES.notifications, []);
  const notification = { id: nextId(data), titulo, mensaje, tipo, leida: false, fecha: new Date().toISOString() };

  data.push(notification);
  writeJson(DATA_FILES.notifications, data);
  return res.status(201).json({ success: true, data: notification });
});

router.put('/:id/leer', (req, res) => {
  const data = readJson(DATA_FILES.notifications, []);
  const idx = data.findIndex((item) => Number(item.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Notificación no encontrada.' });

  data[idx].leida = true;
  writeJson(DATA_FILES.notifications, data);
  return res.json({ success: true, message: 'Notificación marcada como leída.' });
});

module.exports = router;
