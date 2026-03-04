// ==============================================================
// COLEGIO BOSTON - Middleware de Autenticación JWT
// ==============================================================
// Este middleware protege las rutas privadas de la API.
// Verifica que el usuario tenga un token válido y activo,
// y controla el acceso según el rol asignado.
//
// USO en rutas:
//   router.get('/ruta', authMiddleware, (req, res) => {...})
//   router.get('/admin', authMiddleware, requireRole('admin'), ...)
// ==============================================================

const jwt = require('jsonwebtoken');
const db  = require('../config/db');

// --------------------------------------------------------------
// authMiddleware
// Valida el token JWT enviado en el header Authorization
// Si es válido, agrega req.user con los datos del usuario
// --------------------------------------------------------------
const authMiddleware = async (req, res, next) => {
  try {
    // El token debe venir en el header: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado. Inicia sesión primero.'
      });
    }

    // Extraer el token del header
    const token = authHeader.split(' ')[1];

    // Verificar firma y expiración del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos (verifica que siga activo)
    const [rows] = await db.query(
      `SELECT u.*, r.nombre AS rol_nombre, r.permisos
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ? AND u.activo = TRUE`,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o cuenta desactivada'
      });
    }

    // Adjuntar datos del usuario a la solicitud para uso posterior
    req.user = rows[0];
    next();

  } catch (error) {
    // Manejar errores específicos de JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// --------------------------------------------------------------
// requireRole(...roles)
// Middleware de control de acceso por rol.
// Úsalo DESPUÉS de authMiddleware.
// Ejemplo: requireRole('admin', 'superadmin')
// --------------------------------------------------------------
const requireRole = (...roles) => (req, res, next) => {
  const permisos = JSON.parse(req.user?.permisos || '[]');

  // 'all' significa acceso total (superadmin)
  if (permisos.includes('all')) return next();

  // Verificar si el rol del usuario está en la lista permitida
  if (roles.includes(req.user?.rol_nombre)) return next();

  return res.status(403).json({
    success: false,
    message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`
  });
};

module.exports = { authMiddleware, requireRole };
