const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./dataFiles');

function autoCreateFileIfNotExists(filePath, defaultValue = []) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJson(filePath, defaultValue = []) {
  autoCreateFileIfNotExists(filePath, defaultValue);

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  autoCreateFileIfNotExists(filePath, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function nextId(collection = []) {
  if (!collection.length) return 1;
  return Math.max(...collection.map((item) => Number(item.id) || 0)) + 1;
}

function migrateIfNeeded(targetPath, legacyPaths = [], defaultValue = []) {
  autoCreateFileIfNotExists(targetPath, defaultValue);
  const current = readJson(targetPath, defaultValue);

  const hasData = Array.isArray(current)
    ? current.length > 0
    : Object.keys(current || {}).length > 0;

  if (hasData) return current;

  for (const legacyPath of legacyPaths) {
    if (!fs.existsSync(legacyPath)) continue;
    const legacyData = readJson(legacyPath, defaultValue);
    const legacyHasData = Array.isArray(legacyData)
      ? legacyData.length > 0
      : Object.keys(legacyData || {}).length > 0;

    if (legacyHasData) {
      writeJson(targetPath, legacyData);
      return legacyData;
    }
  }

  return current;
}

module.exports = {
  readJson,
  writeJson,
  autoCreateFileIfNotExists,
  nextId,
  migrateIfNeeded
};
