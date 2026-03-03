const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');

const router = express.Router();
const notifPath = path.join(__dirname, '../../data/notificaciones.json');

router.get('/', (req, res) => {
  const data = readJson(notifPath, []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const no_leidas = data.filter((item) => !item.leida).length;
  return res.json({ success: true, no_leidas, data });
});

router.post('/', (req, res) => {
  const { titulo, mensaje, tipo = 'info' } = req.body;
  if (!titulo || !mensaje) return res.status(400).json({ success: false, message: 'titulo y mensaje son obligatorios.' });

  const data = readJson(notifPath, []);
  const notification = {
    id: nextId(data),
    titulo,
    mensaje,
    tipo,
    leida: false,
    fecha: new Date().toISOString()
  };
  data.push(notification);
  writeJson(notifPath, data);
  return res.status(201).json({ success: true, data: notification });
});

router.put('/:id/leer', (req, res) => {
  const data = readJson(notifPath, []);
  const idx = data.findIndex((item) => Number(item.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
  data[idx].leida = true;
  writeJson(notifPath, data);
  return res.json({ success: true, message: 'Notificación marcada como leída.' });
});

module.exports = router;
