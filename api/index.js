
// =============================================================
// PAYSCHOOL API - Servidor Principal
// =============================================================

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/contabilidad', require('./routes/accounting'));
app.use('/api/chat', require('./routes/chat'));

app.get('/api/health', (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("====================================");
  console.log(" PaySchool API corriendo en localhost");
  console.log(" http://localhost:3000/api");
  console.log("====================================");
});
