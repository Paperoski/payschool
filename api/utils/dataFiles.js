const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

const DATA_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  employees: path.join(DATA_DIR, 'employees.json'),
  payroll: path.join(DATA_DIR, 'payroll.json'),
  accounting: path.join(DATA_DIR, 'accounting.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
  chat: path.join(DATA_DIR, 'chat.json'),
  system: path.join(DATA_DIR, 'system.json'),
  puc: path.join(DATA_DIR, 'puc_base.json')
};

module.exports = {
  DATA_DIR,
  DATA_FILES
};
