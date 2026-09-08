const {spawnSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const suites = require('./test-suites.json');
let passed = 0;
for (const name of suites) {
  const result = spawnSync(process.execPath, ['work/test-' + name + '.cjs'], {cwd:root, encoding:'utf8', timeout:180000, maxBuffer:8*1024*1024, windowsHide:true});
  if (result.error || result.status !== 0) {
    console.error('FAIL ' + name);
    console.error(result.stdout || '');
    console.error(result.stderr || result.error || 'Processo interrotto');
    process.exit(1);
  }
  passed++;
  console.log('PASS ' + name + '\n' + result.stdout.trim().split(/\r?\n/).slice(-2).join('\n'));
}
console.log(passed + '/' + suites.length + ' suite offline superate.');
