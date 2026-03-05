const express = require('express');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');
const { DATA_FILES } = require('../utils/dataFiles');

const router = express.Router();

router.get('/', (req, res) => {
  const { limit = 80 } = req.query;
  const messages = readJson(DATA_FILES.chat, []);
  return res.json({ success: true, data: messages.slice(-Number(limit)) });
});

router.post('/', (req, res) => {
  const { autor, mensaje, canal = 'general' } = req.body;
  if (!autor || !mensaje) {
    return res.status(400).json({ success: false, message: 'autor y mensaje son obligatorios.' });
  }

  const messages = readJson(DATA_FILES.chat, []);
  const newMessage = { id: nextId(messages), autor, mensaje, canal, fecha: new Date().toISOString() };
  messages.push(newMessage);
  writeJson(DATA_FILES.chat, messages);

  return res.status(201).json({ success: true, data: newMessage });
});

module.exports = router;
