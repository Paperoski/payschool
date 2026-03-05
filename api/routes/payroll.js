const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId, migrateIfNeeded } = require('../utils/jsonStore');
const { DATA_FILES } = require('../utils/dataFiles');
const { getRequestUser } = require('../utils/accessControl');

const router = express.Router();

migrateIfNeeded(DATA_FILES.employees, [path.join(__dirname, '../../data/empleados.json')], []);
migrateIfNeeded(DATA_FILES.payroll, [path.join(__dirname, '../../data/nominas.json')], []);

const UVT_2026 = 52374;
const SMLV_2026 = 1462000;
const AUXILIO_TRANSPORTE_2026 = 162000;

const round2 = (n) => Number((Number(n) || 0).toFixed(2));

function calculateRetention(baseReteFuente) {
  const rentaExenta = baseReteFuente * 0.25;
  const baseUVT = (baseReteFuente - rentaExenta) / UVT_2026;

  let retencion = 0;
  if (baseUVT > 95 && baseUVT <= 150) retencion = ((baseUVT - 95) * 0.19) * UVT_2026;
  else if (baseUVT > 150 && baseUVT <= 360) retencion = (((baseUVT - 150) * 0.28) + 10) * UVT_2026;
  else if (baseUVT > 360) retencion = (((baseUVT - 360) * 0.33) + 69) * UVT_2026;

  return round2(Math.max(retencion, 0));
}

function calculatePayrollDetail(emp) {
  const salarioBase = round2(emp.salario_base);
  const diasTrabajados = Math.min(30, Math.max(0, Number(emp.dias_trabajados) || 30));
  const bono = round2(emp.bono || 0);
  const horasExtras = round2(emp.horas_extras || 0);
  const descuentoManual = round2(emp.descuento_manual || 0);

  const sueldoDevengado = round2((salarioBase / 30) * diasTrabajados);
  const auxilioTransporte = salarioBase <= SMLV_2026 * 2 ? round2((AUXILIO_TRANSPORTE_2026 / 30) * diasTrabajados) : 0;
  const totalDevengado = round2(sueldoDevengado + auxilioTransporte + bono + horasExtras);

  const salud = round2(sueldoDevengado * 0.04);
  const pension = round2(sueldoDevengado * 0.04);
  const baseReteFuente = round2(sueldoDevengado - salud - pension);
  const retencion = calculateRetention(baseReteFuente);

  const totalDeducido = round2(salud + pension + retencion + descuentoManual);
  const netoPagar = round2(totalDevengado - totalDeducido);

  return {
    id_empleado: emp.id,
    empleado_email: emp.email || null,
    nombre: `${emp.nombre}${emp.apellido ? ` ${emp.apellido}` : ''}`,
    cargo: emp.cargo || 'Sin cargo',
    diasTrabajados,
    salarioBase,
    totalDevengado,
    deducciones: { salud, pension, retencion_fuente: retencion, descuento_manual: descuentoManual },
    totalDeducido,
    netoPagar
  };
}

function filterPayrollForUser(nominas, user) {
  if (user.level > 1) return nominas;
  return nominas
    .map((n) => ({ ...n, detalles: (n.detalles || []).filter((d) => d.empleado_email && d.empleado_email.toLowerCase() === user.email) }))
    .filter((n) => (n.detalles || []).length > 0);
}

router.get('/historial', (req, res) => {
  const user = getRequestUser(req);
  const nominas = readJson(DATA_FILES.payroll, []).sort((a, b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion));
  return res.json({ success: true, data: filterPayrollForUser(nominas, user) });
});

router.get('/resumen', (req, res) => {
  const user = getRequestUser(req);
  const nominas = filterPayrollForUser(readJson(DATA_FILES.payroll, []), user);
  const ultima = nominas[nominas.length - 1];
  const neto = round2((ultima?.detalles || []).reduce((acc, item) => acc + (Number(item.netoPagar) || 0), 0));
  return res.json({ success: true, data: { nominas_generadas: nominas.length, empleados_liquidados: ultima?.detalles?.length || 0, neto_ultima_nomina: neto, ultima_fecha_generacion: ultima?.fecha_generacion || null } });
});

router.post('/calcular', (req, res) => {
  const user = getRequestUser(req);
  const { periodo, mes, anio, guardar = true } = req.body;

  if (user.level <= 1 && guardar) {
    return res.status(403).json({ success: false, message: 'Solo administración puede guardar nómina general.' });
  }

  const empleados = readJson(DATA_FILES.employees, []).filter((e) => e.activo !== false);
  const nominas = readJson(DATA_FILES.payroll, []);
  const detalles = empleados.map(calculatePayrollDetail);

  const resultDetalles = user.level <= 1
    ? detalles.filter((d) => d.empleado_email && d.empleado_email.toLowerCase() === user.email)
    : detalles;

  const registroNomina = {
    id: nextId(nominas),
    periodo: periodo || 'Mensual',
    mes: mes || new Date().toLocaleString('es-CO', { month: 'long' }),
    anio: Number(anio) || new Date().getFullYear(),
    fecha_generacion: new Date().toISOString(),
    detalles: resultDetalles
  };

  if (guardar) {
    nominas.push(registroNomina);
    writeJson(DATA_FILES.payroll, nominas);
  }

  return res.status(201).json({ success: true, message: guardar ? 'Nómina calculada y almacenada exitosamente.' : 'Nómina calculada en modo simulación.', data: registroNomina });
});

module.exports = router;
