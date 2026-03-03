const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');

const router = express.Router();
const empleadosPath = path.join(__dirname, '../../data/empleados.json');
const usersPath = path.join(__dirname, '../../data/users.json');
const nominasPath = path.join(__dirname, '../../data/nominas.json');

router.get('/', (req, res) => {
  const data = readJson(empleadosPath, []);
  return res.json({ success: true, data });
});

router.post('/', (req, res) => {
  const { nombre, apellido, cedula, cargo, salario_base, email } = req.body;
  if (!nombre || !cedula || !cargo || !salario_base) {
    return res.status(400).json({ success: false, message: 'Campos obligatorios: nombre, cedula, cargo, salario_base.' });
  }

  const empleados = readJson(empleadosPath, []);
  if (empleados.some((emp) => String(emp.cedula) === String(cedula))) {
    return res.status(400).json({ success: false, message: 'Ya existe un empleado con esa cédula.' });
  }

  const empleado = {
    id: nextId(empleados),
    nombre,
    apellido: apellido || '',
    cedula,
    email: (email || '').toLowerCase(),
    cargo,
    salario_base: Number(salario_base),
    activo: true,
    fecha_creacion: new Date().toISOString()
  };

  empleados.push(empleado);
  writeJson(empleadosPath, empleados);
  return res.status(201).json({ success: true, message: 'Empleado creado exitosamente.', data: empleado });
});

router.put('/:id', (req, res) => {
  const empleados = readJson(empleadosPath, []);
  const idx = empleados.findIndex((emp) => Number(emp.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });

  empleados[idx] = {
    ...empleados[idx],
    ...req.body,
    email: req.body.email !== undefined ? String(req.body.email || '').toLowerCase() : empleados[idx].email,
    salario_base: req.body.salario_base !== undefined ? Number(req.body.salario_base) : empleados[idx].salario_base,
    updated_at: new Date().toISOString()
  };

  writeJson(empleadosPath, empleados);
  return res.json({ success: true, message: 'Empleado actualizado correctamente.', data: empleados[idx] });
});

router.delete('/:id', (req, res) => {
  const empleados = readJson(empleadosPath, []);
  const idx = empleados.findIndex((emp) => Number(emp.id) === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });

  const removed = empleados.splice(idx, 1)[0];
  writeJson(empleadosPath, empleados);

  const removedEmail = String(removed.email || '').toLowerCase();
  if (removedEmail) {
    const users = readJson(usersPath, []);
    writeJson(usersPath, users.filter((u) => String(u.email || '').toLowerCase() !== removedEmail));
  }

  const nominas = readJson(nominasPath, []);
  const syncedNominas = nominas.map((n) => ({
    ...n,
    detalles: (n.detalles || []).filter((d) => d.id_empleado !== removed.id && String(d.empleado_email || '').toLowerCase() !== removedEmail)
  }));
  writeJson(nominasPath, syncedNominas);

  return res.json({ success: true, message: 'Empleado eliminado definitivamente y nómina sincronizada.', data: { id: removed.id } });
});

module.exports = router;
