const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const usersPath = path.join(__dirname, '../../data/users.json');

// Función que evita el Error 500 creando un administrador por defecto
const asegurarAdmin = async () => {
    if (!fs.existsSync(usersPath)) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt); // Contraseña: admin123
        
        const defaultUser = [{
            id: 1,
            nombre: "Rectoría / Administración",
            email: "admin@payschool.com",
            password: hashedPassword,
            rol: "admin",
            fecha_creacion: new Date().toISOString()
        }];
        fs.writeFileSync(usersPath, JSON.stringify(defaultUser, null, 2));
    }
};

router.post('/login', async (req, res) => {
    try {
        await asegurarAdmin(); // Se asegura de que exista la base de datos de usuarios
        
        const { email, password } = req.body;
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Correo incorrecto o no registrado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;