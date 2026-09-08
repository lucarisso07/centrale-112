const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const runtime = path.resolve(__dirname, '..', 'work', 'ai-runtime');
const executable = path.join(runtime, 'bin', 'llama-server.exe');
const model = path.join(runtime, 'conversazioni.gguf');
const keyFile = path.join(runtime, 'access.key');
const records = path.join(runtime, 'centrale-processes.json');
const url = 'http://127.0.0.1:8122/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function alive(address) {
  try { return (await fetch(address, { signal: AbortSignal.timeout(1400) })).ok; }
  catch { return false; }
}
function launch(command, args, name) {
  const out = fs.openSync(path.join(runtime, name + '.stdout.log'), 'a');
  const err = fs.openSync(path.join(runtime, name + '.stderr.log'), 'a');
  const child = spawn(command, args, { cwd: __dirname, windowsHide: true, detached: true, stdio: ['ignore', out, err] });
  child.on('error', error => console.error(name + ': ' + error.message));
  child.unref();
  fs.closeSync(out); fs.closeSync(err);
  return { pid: child.pid, executable: command, name, startedAt: Date.now() };
}
function openBrowser() {
  if (process.argv.includes('--no-browser')) return;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', "Start-Process 'http://127.0.0.1:8122/'"], { windowsHide: true });
}
function stopOwnedProcesses(onlyName) {
  if (!fs.existsSync(records)) return;
  const owned = JSON.parse(fs.readFileSync(records, 'utf8'));
  for (const record of owned) {
    if (onlyName && record.name !== onlyName) continue;
    if (!Number.isInteger(record.pid) || record.pid <= 0) continue;
    // A recycled process ID must never be stopped. Check executable and start time.
    const script = `$p = Get-Process -Id ${record.pid} -ErrorAction SilentlyContinue; if ($p) { [PSCustomObject]@{Path=$p.Path;Started=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json -Compress }`;
    try {
      const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true, encoding: 'utf8' }).trim();
      if (!raw) continue;
      const actual = JSON.parse(raw);
      if (path.resolve(actual.Path).toLowerCase() !== path.resolve(record.executable).toLowerCase()) continue;
      if (Math.abs(Date.parse(actual.Started) - record.startedAt) > 15000) continue;
      process.kill(record.pid);
    } catch { /* Already stopped, or no access: leave it alone. */ }
  }
  console.log(onlyName ? 'Server del gioco riavviato.' : 'Servizi della Centrale arrestati. I salvataggi restano sul computer.');
}
async function main() {
  if (process.argv.includes('--stop')) return stopOwnedProcesses();
  if (process.argv.includes('--restart-web')) { stopOwnedProcesses('game'); await sleep(250); }
  const modelInstalled = fs.existsSync(executable) && fs.existsSync(model);
  fs.mkdirSync(runtime, { recursive: true });
  if (modelInstalled && !fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { flag: 'wx' });
  if (!modelInstalled) console.log('Motore IA non trovato: avvio il gioco con il motore contestuale. Mantieni outputs e work nella cartella del progetto originale.');
  const owned = fs.existsSync(records) ? JSON.parse(fs.readFileSync(records, 'utf8')) : [];
  if (modelInstalled && !await alive('http://127.0.0.1:8124/health')) {
    owned.push(launch(executable, ['-m', model, '--host', '127.0.0.1', '--port', '8124', '-ngl', '99', '-c', '12288', '-np', '2', '-t', '8', '--no-webui', '--reasoning', 'off', '--cors-origins', 'http://127.0.0.1:8122', '--api-key-file', keyFile], 'model'));
  }
  if (!await alive(url + 'api/health')) {
    owned.push(launch(process.execPath, [path.join(__dirname, 'centrale-server.cjs')], 'game'));
  }
  fs.writeFileSync(records, JSON.stringify(owned, null, 2));
  console.log(modelInstalled ? 'Avvio della sala operativa e del modello locale…' : 'Avvio della sala operativa…');
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(url + 'api/health', { signal: AbortSignal.timeout(1800) });
      if (!response.ok) throw new Error('Server del gioco non pronto');
      const status = await response.json();
      if (status.ready) {
        console.log('Gioco e IA pronti: ' + url);
        openBrowser();
        return;
      }
      if (!modelInstalled) {
        console.log('Gioco pronto con il motore contestuale: ' + url);
        openBrowser();
        return;
      }
    } catch { /* Model loading: retry with a bounded wait. */ }
    await sleep(750);
  }
  if (!await alive(url + 'api/health')) throw new Error('Il server del gioco non è raggiungibile. Consulta i file game.stderr.log e game.stdout.log in work/ai-runtime e riprova.');
  console.log('Gioco pronto con il motore contestuale: ' + url + '. Il modello IA è ancora in caricamento o non disponibile.');
  openBrowser();
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
