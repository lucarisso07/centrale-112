const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'centrale112-build-'));
fs.mkdirSync(path.join(temporary,'work'));
fs.mkdirSync(path.join(temporary,'outputs'));
for (const file of fs.readdirSync(path.join(root,'work'))) {
  const source = path.join(root,'work',file);
  if (fs.statSync(source).isFile()) fs.copyFileSync(source,path.join(temporary,'work',file));
}
const result = spawnSync(process.execPath,['work/build-v4.cjs'],{cwd:temporary,encoding:'utf8',timeout:30000,windowsHide:true});
if (result.error || result.status !== 0) throw Error(result.stderr || String(result.error));
const included = fs.readFileSync(path.join(root,'outputs/Centrale112.html'));
const rebuilt = fs.readFileSync(path.join(temporary,'outputs/Centrale112.html'));
if (!included.equals(rebuilt)) throw Error('HTML e sorgenti non coincidono. Rigenera il file con npm run build.');
console.log('Build riproducibile: HTML incluso identico al risultato dei sorgenti. Nessun file del progetto modificato.');
