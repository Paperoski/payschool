const express = require('express');
const { getChanges } = require('../services/changeLogger');

const router = express.Router();

router.get('/changes', (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const data = getChanges({ limit: Math.min(limit, 500) });
  res.json({ success: true, total: data.length, data });
});

module.exports = router;
