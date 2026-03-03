const express = require('express');
const path = require('path');
const { readJson, writeJson, nextId } = require('../utils/jsonStore');

const router = express.Router();

const empleadosPath = path.join(__dirname, '../../data/empleados.json');
const nominasPath = path.join(__dirname, '../../data/nominas.json');

const UVT_2026 = 52374;
const SMLV_2026 = 1462000;
const AUXILIO_TRANSPORTE_2026 = 162000;

function calculatePayrollDetail(emp) {
  const salarioBase = Number(emp.salario_base) || 0;
  const diasTrabajados = Number(emp.dias_trabajados) || 30;
  const sueldoDevengado = (salarioBase / 30) * diasTrabajados;

  const auxilioTransporte = salarioBase <= SMLV_2026 * 2
    ? (AUXILIO_TRANSPORTE_2026 / 30) * diasTrabajados
    : 0;

  const totalDevengado = sueldoDevengado + auxilioTransporte;
  const salud = sueldoDevengado * 0.04;
  const pension = sueldoDevengado * 0.04;

  const baseReteFuente = sueldoDevengado - salud - pension;
  const rentaExenta = baseReteFuente * 0.25;
  const baseUVT = (baseReteFuente - rentaExenta) / UVT_2026;

  let retencion = 0;
  if (baseUVT > 95 && baseUVT <= 150) retencion = ((baseUVT - 95) * 0.19) * UVT_2026;
  if (baseUVT > 150 && baseUVT <= 360) retencion = (((baseUVT - 150) * 0.28) + 10) * UVT_2026;

  const totalDeducido = salud + pension + retencion;

  return {
    id_empleado: emp.id,
    nombre: `${emp.nombre}${emp.apellido ? ` ${emp.apellido}` : ''}`,
    cargo: emp.cargo || 'Sin cargo',
    totalDevengado,
    deducciones: {
      salud,
      pension,
      retencion_fuente: Math.round(retencion)
    },
    totalDeducido,
    netoPagar: totalDevengado - totalDeducido
  };
}

router.get('/historial', (req, res) => {
  const nominas = readJson(nominasPath, []).sort((a, b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion));
  return res.json({ success: true, data: nominas });
});

router.get('/resumen', (req, res) => {
  const nominas = readJson(nominasPath, []);
  const ultima = nominas[nominas.length - 1];
  const neto = (ultima?.detalles || []).reduce((acc, item) => acc + (Number(item.netoPagar) || 0), 0);
  return res.json({
    success: true,
    data: {
      nominas_generadas: nominas.length,
      empleados_liquidados: ultima?.detalles?.length || 0,
      neto_ultima_nomina: neto,
      ultima_fecha_generacion: ultima?.fecha_generacion || null
    }
  });
});

router.post('/calcular', (req, res) => {
  const { periodo, mes, anio, guardar = true } = req.body;

  const empleados = readJson(empleadosPath, []);
  const nominas = readJson(nominasPath, []);
  const detalles = empleados.map(calculatePayrollDetail);

  const registroNomina = {
    id: nextId(nominas),
    periodo: periodo || 'Mensual',
    mes: mes || new Date().toLocaleString('es-CO', { month: 'long' }),
    anio: Number(anio) || new Date().getFullYear(),
    fecha_generacion: new Date().toISOString(),
    detalles
  };

  if (guardar) {
    nominas.push(registroNomina);
    writeJson(nominasPath, nominas);
  }

  return res.status(201).json({
    success: true,
    message: guardar ? 'Nómina calculada y almacenada exitosamente.' : 'Nómina calculada en modo simulación.',
    data: registroNomina
  });
});

module.exports = router;
