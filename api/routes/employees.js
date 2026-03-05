const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId, migrateIfNeeded } = require('../utils/jsonStore');
const { DATA_FILES } = require('../utils/dataFiles');

const router = express.Router();

migrateIfNeeded(DATA_FILES.employees, [path.join(__dirname, '../../data/empleados.json')], []);
migrateIfNeeded(DATA_FILES.users, [path.join(__dirname, '../../data/usuarios.json')], []);
migrateIfNeeded(DATA_FILES.payroll, [path.join(__dirname, '../../data/nominas.json')], []);

router.get('/', (req, res) => {
  const data = readJson(DATA_FILES.employees, []);
  return res.json({ success: true, data });
});

router.post('/', (req, res) => {
  const { nombre, apellido, cedula, cargo, salario_base, email } = req.body;
  if (!nombre || !cedula || !cargo || !salario_base) {
    return res.status(400).json({ success: false, message: 'Campos obligatorios: nombre, cedula, cargo, salario_base.' });
  }

  const employees = readJson(DATA_FILES.employees, []);
  if (employees.some((employee) => String(employee.cedula) === String(cedula))) {
    return res.status(400).json({ success: false, message: 'Ya existe un empleado con esa cédula.' });
  }

  const employee = {
    id: nextId(employees),
    nombre,
    apellido: apellido || '',
    cedula,
    email: (email || '').toLowerCase(),
    cargo,
    salario_base: Number(salario_base),
    activo: true,
    fecha_creacion: new Date().toISOString()
  };

  employees.push(employee);
  writeJson(DATA_FILES.employees, employees);
  return res.status(201).json({ success: true, message: 'Empleado creado exitosamente.', data: employee });
});

router.put('/:id', (req, res) => {
  const employees = readJson(DATA_FILES.employees, []);
  const idx = employees.findIndex((employee) => Number(employee.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });

  employees[idx] = {
    ...employees[idx],
    ...req.body,
    email: req.body.email !== undefined ? String(req.body.email || '').toLowerCase() : employees[idx].email,
    salario_base: req.body.salario_base !== undefined ? Number(req.body.salario_base) : employees[idx].salario_base,
    updated_at: new Date().toISOString()
  };

  writeJson(DATA_FILES.employees, employees);
  return res.json({ success: true, message: 'Empleado actualizado correctamente.', data: employees[idx] });
});

router.delete('/:id', (req, res) => {
  const employees = readJson(DATA_FILES.employees, []);
  const idx = employees.findIndex((employee) => Number(employee.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });

  const removed = employees.splice(idx, 1)[0];
  writeJson(DATA_FILES.employees, employees);

  const removedEmail = String(removed.email || '').toLowerCase();
  if (removedEmail) {
    const users = readJson(DATA_FILES.users, []);
    writeJson(DATA_FILES.users, users.filter((user) => String(user.email || '').toLowerCase() !== removedEmail));
  }

  const payroll = readJson(DATA_FILES.payroll, []);
  const synced = payroll.map((record) => ({
    ...record,
    detalles: (record.detalles || []).filter((detail) => detail.id_empleado !== removed.id && String(detail.empleado_email || '').toLowerCase() !== removedEmail)
  }));
  writeJson(DATA_FILES.payroll, synced);

  return res.json({ success: true, message: 'Empleado eliminado definitivamente y nómina sincronizada.', data: { id: removed.id } });
});

module.exports = router;
