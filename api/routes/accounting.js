const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const asientosPath = path.join(__dirname, '../../data/asientos_contables.json');
const pucPath = path.join(__dirname, '../../data/puc_base.json');

router.post('/asiento', (req, res) => {
    try {
        const { fecha, descripcion, comprobante, movimientos } = req.body;
        
        // 1. Validar Partida Doble (Sumatoria Débitos == Sumatoria Créditos)
        const totalDebito = movimientos.reduce((acc, mov) => acc + (Number(mov.debito) || 0), 0);
        const totalCredito = movimientos.reduce((acc, mov) => acc + (Number(mov.credito) || 0), 0);

        if (totalDebito !== totalCredito) {
            return res.status(400).json({ 
                success: false, 
                message: `Error contable: Débitos ($${totalDebito}) y Créditos ($${totalCredito}) no cuadran.` 
            });
        }

        // 2. Validar que las cuentas existan en el PUC base
        const pucBase = JSON.parse(fs.readFileSync(pucPath, 'utf8'));
        for (let mov of movimientos) {
            const cuentaExiste = pucBase.find(c => c.codigo === String(mov.cuenta_puc));
            if (!cuentaExiste) {
                return res.status(400).json({ success: false, message: `La cuenta PUC ${mov.cuenta_puc} no existe en el catálogo.` });
            }
        }

        // 3. Registrar el Asiento
        const asientos = JSON.parse(fs.readFileSync(asientosPath, 'utf8'));
        const nuevoAsiento = {
            id: asientos.length > 0 ? Math.max(...asientos.map(a => a.id)) + 1 : 1,
            fecha: fecha || new Date().toISOString().split('T')[0],
            descripcion,
            comprobante, // Ej: "Pago pensión alumno grado 10" o "Nómina general"
            movimientos,
            total: totalDebito,
            estado: 'Asentado'
        };

        asientos.push(nuevoAsiento);
        fs.writeFileSync(asientosPath, JSON.stringify(asientos, null, 2));

        res.status(201).json({ success: true, message: 'Asiento contable registrado', data: nuevoAsiento });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
});

module.exports = router;