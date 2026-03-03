const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');

const router = express.Router();
const chatPath = path.join(__dirname, '../../data/chat.json');

router.get('/', (req, res) => {
  const { limit = 80 } = req.query;
  const messages = readJson(chatPath, []);
  return res.json({ success: true, data: messages.slice(-Number(limit)) });
});

router.post('/', (req, res) => {
  const { autor, mensaje, canal = 'general' } = req.body;
  if (!autor || !mensaje) {
    return res.status(400).json({ success: false, message: 'autor y mensaje son obligatorios.' });
  }

  const messages = readJson(chatPath, []);
  const newMessage = {
    id: nextId(messages),
    autor,
    mensaje,
    canal,
    fecha: new Date().toISOString()
  };

  messages.push(newMessage);
  writeJson(chatPath, messages);
  return res.status(201).json({ success: true, data: newMessage });
});

module.exports = router;
