const express = require('express');
const cors = require('cors');
const path = require('path');
const { createChangeLogger } = require('./services/changeLogger');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(createChangeLogger());

const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const accountingRoutes = require('./routes/accounting');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const systemRoutes = require('./routes/system');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/system', systemRoutes);

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
['dashboard', 'employees', 'payroll', 'accounting', 'users'].forEach((page) => {
  app.get(`/${page}.html`, (req, res) => res.sendFile(path.join(frontendPath, 'pages', `${page}.html`)));
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Payschool activo en http://0.0.0.0:${PORT}`);
});
