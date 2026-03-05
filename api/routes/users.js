const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { readJson, writeJson, nextId, migrateIfNeeded } = require('../utils/jsonStore');
const { requireMinRole } = require('../utils/accessControl');
const { DATA_FILES } = require('../utils/dataFiles');

const router = express.Router();

migrateIfNeeded(DATA_FILES.users, [path.join(__dirname, '../../data/usuarios.json')], []);
migrateIfNeeded(DATA_FILES.employees, [path.join(__dirname, '../../data/empleados.json')], []);
migrateIfNeeded(DATA_FILES.payroll, [path.join(__dirname, '../../data/nominas.json')], []);

router.get('/', requireMinRole('admin'), (req, res) => {
  const users = readJson(DATA_FILES.users, []).map(({ password, ...safe }) => safe);
  return res.json({ success: true, data: users });
});

router.post('/', requireMinRole('admin'), async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  const users = readJson(DATA_FILES.users, []);
  if (users.some((user) => user.email === email)) {
    return res.status(400).json({ success: false, message: 'El correo ya se encuentra registrado.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: nextId(users), nombre, email, password: hashedPassword, rol, activo: true, fecha_creacion: new Date().toISOString() };

  users.push(user);
  writeJson(DATA_FILES.users, users);

  return res.status(201).json({ success: true, data: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
});

router.put('/:id/status', requireMinRole('admin'), (req, res) => {
  const { activo } = req.body;
  const users = readJson(DATA_FILES.users, []);
  const idx = users.findIndex((user) => Number(user.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

  users[idx].activo = Boolean(activo);
  users[idx].updated_at = new Date().toISOString();
  writeJson(DATA_FILES.users, users);

  const employees = readJson(DATA_FILES.employees, []);
  employees.forEach((employee) => {
    if ((employee.email || '').toLowerCase() === (users[idx].email || '').toLowerCase()) employee.activo = Boolean(activo);
  });
  writeJson(DATA_FILES.employees, employees);

  return res.json({ success: true, message: 'Estado de usuario actualizado.' });
});

router.delete('/:id', requireMinRole('admin'), (req, res) => {
  const users = readJson(DATA_FILES.users, []);
  const idx = users.findIndex((user) => Number(user.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

  const removed = users.splice(idx, 1)[0];
  writeJson(DATA_FILES.users, users);

  const removedEmail = (removed.email || '').toLowerCase();
  const employees = readJson(DATA_FILES.employees, []);
  const affectedEmployeeIds = employees.filter((employee) => (employee.email || '').toLowerCase() === removedEmail).map((employee) => employee.id);
  const filteredEmployees = employees.filter((employee) => (employee.email || '').toLowerCase() !== removedEmail);
  writeJson(DATA_FILES.employees, filteredEmployees);

  const payroll = readJson(DATA_FILES.payroll, []);
  const cleanPayroll = payroll.map((record) => ({
    ...record,
    detalles: (record.detalles || []).filter((detail) => !affectedEmployeeIds.includes(detail.id_empleado) && (detail.empleado_email || '').toLowerCase() !== removedEmail)
  }));
  writeJson(DATA_FILES.payroll, cleanPayroll);

  return res.json({ success: true, message: 'Usuario eliminado definitivamente y nómina sincronizada.', data: { id: removed.id } });
});

module.exports = router;
