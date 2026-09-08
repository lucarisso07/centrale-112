const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require('../docs/original-files.sha256.json');
let checked = 0;
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  if (actual !== expected) throw Error('File diverso dalla copia originale: ' + file);
  checked++;
}
console.log(checked + ' file identici alla copia originale (SHA-256).');
