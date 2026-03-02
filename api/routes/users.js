const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt'); // Asegúrate de instalarlo con npm install bcrypt

const usersPath = path.join(__dirname, '../../data/users.json');

router.post('/', async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        
        if (!nombre || !email || !password || !rol) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
        }

        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado en la institución' });
        }

        // Encriptar la contraseña para seguridad
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            nombre, email,
            password: hashedPassword,
            rol, // Ej: 'rector', 'contador', 'admin'
            fecha_creacion: new Date().toISOString()
        };

        users.push(newUser);
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

        res.status(201).json({ 
            success: true, 
            message: 'Usuario creado', 
            data: { id: newUser.id, nombre, email, rol } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;