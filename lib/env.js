'use strict';
// Carga sencilla de un archivo .env (sin dependencias). Las variables ya definidas en el sistema tienen prioridad.
const fs = require('fs');
const path = require('path');
module.exports = function loadEnv(dir) {
  const file = path.join(dir, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
};
