const path = require('path');
const { readJson, writeJson, nextId, ensureFile } = require('../utils/jsonStore');

const changesPath = path.join(__dirname, '../../data/cambios_app.json');
ensureFile(changesPath, []);

function sanitize(body = {}) {
  const clone = { ...body };
  ['password', 'token', 'authorization'].forEach((field) => {
    if (clone[field]) clone[field] = '***';
  });
  return clone;
}

function createChangeLogger() {
  return (req, res, next) => {
    const trackable = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!trackable.includes(req.method)) return next();

    const startAt = Date.now();
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      try {
        if (res.statusCode < 500) {
          const changes = readJson(changesPath, []);
          changes.push({
            id: nextId(changes),
            timestamp: new Date().toISOString(),
            method: req.method,
            endpoint: req.originalUrl,
            status: res.statusCode,
            duration_ms: Date.now() - startAt,
            ip: req.ip,
            user_agent: req.get('user-agent') || null,
            request_body: sanitize(req.body),
            response_success: Boolean(payload?.success),
            response_message: payload?.message || null
          });
          writeJson(changesPath, changes.slice(-2000));
        }
      } catch (error) {
        // no-op para no romper la request principal
      }

      return originalJson(payload);
    };

    next();
  };
}

function getChanges({ limit = 100 } = {}) {
  const changes = readJson(changesPath, []);
  return changes.slice(-limit).reverse();
}

module.exports = {
  createChangeLogger,
  getChanges,
  changesPath
};
