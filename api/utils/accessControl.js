const ROLE_ORDER = {
  empleado: 1,
  usuario: 1,
  contador: 2,
  admin: 3,
  rectoria: 4,
  superadmin: 5
};

function getRequestUser(req) {
  const role = String(req.headers['x-user-role'] || '').toLowerCase() || 'usuario';
  const email = String(req.headers['x-user-email'] || '').toLowerCase();
  return { role, email, level: ROLE_ORDER[role] || 1 };
}

function requireMinRole(minRole) {
  const min = ROLE_ORDER[minRole] || 1;
  return (req, res, next) => {
    const user = getRequestUser(req);
    req.requestUser = user;
    if (user.level < min) {
      return res.status(403).json({ success: false, message: `Acceso restringido a rol ${minRole} o superior.` });
    }
    next();
  };
}

module.exports = { ROLE_ORDER, getRequestUser, requireMinRole };
