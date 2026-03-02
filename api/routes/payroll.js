const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const empleadosPath = path.join(__dirname, '../../data/empleados.json');
const nominasPath = path.join(__dirname, '../../data/nominas.json');

// Constantes 2026 (Colombia)
const UVT_2026 = 52374; 
const SMLV_2026 = 1462000; // Ajustar según el decreto exacto vigente
const AUXILIO_TRANSPORTE_2026 = 162000; 

// Calcular y generar nómina
router.post('/calcular', (req, res) => {
    try {
        const { periodo, mes, anio } = req.body;
        const empleados = JSON.parse(fs.readFileSync(empleadosPath, 'utf8'));
        const nominas = JSON.parse(fs.readFileSync(nominasPath, 'utf8'));

        const nuevaNomina = empleados.map(emp => {
            const salarioBase = emp.salario_base;
            const diasTrabajados = emp.dias_trabajados || 30; 
            
            // Sueldo proporcional a los días laborados
            const sueldoDevengado = (salarioBase / 30) * diasTrabajados;
            
            // Auxilio de transporte (Solo para quienes ganan hasta 2 SMLV)
            let auxilioTransporte = 0;
            if (salarioBase <= (SMLV_2026 * 2)) {
                auxilioTransporte = (AUXILIO_TRANSPORTE_2026 / 30) * diasTrabajados;
            }

            const totalDevengado = sueldoDevengado + auxilioTransporte;

            // Deducciones de Ley (Salud 4%, Pensión 4% sobre devengado sin transporte)
            const salud = sueldoDevengado * 0.04;
            const pension = sueldoDevengado * 0.04;

            // Retención en la fuente usando la UVT 2026
            let baseReteFuente = sueldoDevengado - salud - pension;
            let rentaExenta = baseReteFuente * 0.25;
            let baseGravable = baseReteFuente - rentaExenta;
            
            let baseUVT = baseGravable / UVT_2026;
            let retencion = 0;

            // Aplicación simplificada de la tabla del Art. 383 ET
            if (baseUVT > 95 && baseUVT <= 150) {
                retencion = ((baseUVT - 95) * 0.19) * UVT_2026;
            } else if (baseUVT > 150 && baseUVT <= 360) {
                retencion = (((baseUVT - 150) * 0.28) + 10) * UVT_2026;
            }

            const totalDeducido = salud + pension + retencion;

            return {
                id_empleado: emp.id,
                nombre: emp.nombre,
                cargo: emp.cargo, // Ej: "Profesor Matemáticas"
                totalDevengado,
                deducciones: { salud, pension, retencion_fuente: Math.round(retencion) },
                totalDeducido,
                netoPagar: totalDevengado - totalDeducido
            };
        });

        const registroNomina = {
            id: nominas.length > 0 ? Math.max(...nominas.map(n => n.id)) + 1 : 1,
            periodo, mes, anio,
            fecha_generacion: new Date().toISOString(),
            detalles: nuevaNomina
        };

        nominas.push(registroNomina);
        fs.writeFileSync(nominasPath, JSON.stringify(nominas, null, 2));

        res.status(201).json({ success: true, message: 'Nómina calculada exitosamente', data: registroNomina });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al calcular la nómina', error: error.message });
    }
});

module.exports = router;