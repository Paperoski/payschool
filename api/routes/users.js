const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');
const { requireMinRole } = require('../utils/accessControl');

const router = express.Router();
const usersPath = path.join(__dirname, '../../data/users.json');
const empleadosPath = path.join(__dirname, '../../data/empleados.json');
const nominasPath = path.join(__dirname, '../../data/nominas.json');

router.get('/', requireMinRole('admin'), (req, res) => {
  const users = readJson(usersPath, []).map(({ password, ...safe }) => safe);
  return res.json({ success: true, data: users });
});

router.post('/', requireMinRole('admin'), async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });

  const users = readJson(usersPath, []);
  if (users.some((u) => u.email === email)) return res.status(400).json({ success: false, message: 'El correo ya se encuentra registrado.' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: nextId(users), nombre, email, password: hashedPassword, rol, activo: true, fecha_creacion: new Date().toISOString() };
  users.push(user);
  writeJson(usersPath, users);

  return res.status(201).json({ success: true, message: 'Usuario creado exitosamente.', data: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
});

router.put('/:id/status', requireMinRole('admin'), (req, res) => {
  const { activo } = req.body;
  const users = readJson(usersPath, []);
  const idx = users.findIndex((u) => Number(u.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

  users[idx].activo = Boolean(activo);
  users[idx].updated_at = new Date().toISOString();
  writeJson(usersPath, users);

  const empleados = readJson(empleadosPath, []);
  empleados.forEach((e) => { if ((e.email || '').toLowerCase() === (users[idx].email || '').toLowerCase()) e.activo = Boolean(activo); });
  writeJson(empleadosPath, empleados);

  return res.json({ success: true, message: 'Estado de usuario actualizado.' });
});

router.delete('/:id', requireMinRole('admin'), (req, res) => {
  const users = readJson(usersPath, []);
  const idx = users.findIndex((u) => Number(u.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

  const removed = users.splice(idx, 1)[0];
  writeJson(usersPath, users);

  const removedEmail = (removed.email || '').toLowerCase();
  const empleados = readJson(empleadosPath, []);
  const affectedEmployeeIds = empleados.filter((e) => (e.email || '').toLowerCase() === removedEmail).map((e) => e.id);
  const filteredEmployees = empleados.filter((e) => (e.email || '').toLowerCase() !== removedEmail);
  writeJson(empleadosPath, filteredEmployees);

  const nominas = readJson(nominasPath, []);
  const cleanNominas = nominas.map((n) => ({
    ...n,
    detalles: (n.detalles || []).filter((d) => !affectedEmployeeIds.includes(d.id_empleado) && (d.empleado_email || '').toLowerCase() !== removedEmail)
  }));
  writeJson(nominasPath, cleanNominas);

  return res.json({ success: true, message: 'Usuario eliminado definitivamente y nómina sincronizada.', data: { id: removed.id } });
});

module.exports = router;
