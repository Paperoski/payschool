
// =============================================================
// PAYSCHOOL - Chat Institucional (Solo anuncios)
// =============================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, '../data/chat.json');

if (!fs.existsSync(chatPath)) {
  fs.writeFileSync(chatPath, JSON.stringify([]));
}

// Obtener anuncios
router.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync(chatPath));
  res.json({ success: true, mensajes: data });
});

// Crear anuncio (simulado como admin)
router.post('/', (req, res) => {

  const { autor, mensaje } = req.body;

  const data = JSON.parse(fs.readFileSync(chatPath));

  const nuevo = {
    id: data.length + 1,
    fecha: new Date(),
    autor: autor || "ADMIN",
    mensaje
  };

  data.push(nuevo);
  fs.writeFileSync(chatPath, JSON.stringify(data, null, 2));

  res.json({ success: true, anuncio: nuevo });
});

module.exports = router;
