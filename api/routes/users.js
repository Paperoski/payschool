const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');

const router = express.Router();
const usersPath = path.join(__dirname, '../../data/users.json');

router.get('/', (req, res) => {
  const users = readJson(usersPath, []).map(({ password, ...safe }) => safe);
  return res.json({ success: true, data: users });
});

router.post('/', async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  const users = readJson(usersPath, []);
  if (users.some((u) => u.email === email)) {
    return res.status(400).json({ success: false, message: 'El correo ya se encuentra registrado.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: nextId(users),
    nombre,
    email,
    password: hashedPassword,
    rol,
    activo: true,
    fecha_creacion: new Date().toISOString()
  };

  users.push(user);
  writeJson(usersPath, users);

  return res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente.',
    data: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
  });
});

router.put('/:id/status', (req, res) => {
  const { activo } = req.body;
  const users = readJson(usersPath, []);
  const idx = users.findIndex((u) => Number(u.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

  users[idx].activo = Boolean(activo);
  users[idx].updated_at = new Date().toISOString();
  writeJson(usersPath, users);
  return res.json({ success: true, message: 'Estado de usuario actualizado.' });
});

router.delete('/:id', (req, res) => {
  const users = readJson(usersPath, []);
  const idx = users.findIndex((u) => Number(u.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

  const removed = users.splice(idx, 1)[0];
  writeJson(usersPath, users);
  return res.json({ success: true, message: 'Usuario eliminado correctamente.', data: { id: removed.id } });
});

module.exports = router;
