const fs = require('fs');

function ensureFile(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback = []) {
  ensureFile(filePath, fallback);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function nextId(collection) {
  return collection.length ? Math.max(...collection.map((item) => Number(item.id) || 0)) + 1 : 1;
}

module.exports = {
  ensureFile,
  readJson,
  writeJson,
  nextId
};
