const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Importar rutas (Backend) - ¡Chat eliminado!
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const accountingRoutes = require('./routes/accounting');

// Usar rutas API
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/accounting', accountingRoutes);

// --- CONFIGURACIÓN PARA MOSTRAR LAS PÁGINAS WEB ---
const frontendPath = path.join(__dirname, '../frontend');

// Permite cargar CSS, JS y recursos estáticos
app.use(express.static(frontendPath));

// Rutas de navegación a las vistas (HTML)
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'dashboard.html'));
});

app.get('/employees.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'employees.html'));
});

app.get('/payroll.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'payroll.html'));
});

app.get('/accounting.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'accounting.html'));
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo perfecto en http://localhost:${PORT}`);
});