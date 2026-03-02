
// =============================================================
// PAYSCHOOL - Módulo Contable JSON
// =============================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const movimientosPath = path.join(__dirname, '../data/movimientos.json');

if (!fs.existsSync(movimientosPath)) {
  fs.writeFileSync(movimientosPath, JSON.stringify([]));
}

// Crear asiento
router.post('/asientos', (req, res) => {

  const { detalle, movimientos } = req.body;

  if (!movimientos || movimientos.length < 2) {
    return res.status(400).json({ success: false, message: "Debe tener mínimo 2 movimientos" });
  }

  let debe = 0;
  let haber = 0;

  movimientos.forEach(m => {
    debe += m.debito || 0;
    haber += m.credito || 0;
  });

  if (debe !== haber) {
    return res.status(400).json({ success: false, message: "Debe ≠ Haber" });
  }

  const data = JSON.parse(fs.readFileSync(movimientosPath));
  const nuevo = {
    id: data.length + 1,
    fecha: new Date(),
    detalle,
    movimientos
  };

  data.push(nuevo);
  fs.writeFileSync(movimientosPath, JSON.stringify(data, null, 2));

  res.json({ success: true, asiento: nuevo });
});

// Balance simple
router.get('/balance', (req, res) => {

  const data = JSON.parse(fs.readFileSync(movimientosPath));
  let totalDebe = 0;
  let totalHaber = 0;

  data.forEach(a => {
    a.movimientos.forEach(m => {
      totalDebe += m.debito || 0;
      totalHaber += m.credito || 0;
    });
  });

  res.json({
    success: true,
    totalDebe,
    totalHaber,
    equilibrio: totalDebe === totalHaber
  });
});

module.exports = router;
