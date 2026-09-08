/* Full-shift simulation against the production game and real routing/movement. No browser/network. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function makeRuntime(seed) {
  const rt = require('./test-story-integration.cjs').createRuntime(seed);
  rt.game.start();
  return rt.ctx;
}

function onRoad(map, point) {
  return map.edges.some(e => {
    const a = map.nodes[e.a], b = map.nodes[e.b];
    return Math.abs(Math.hypot(point.x - a.x, point.y - a.y) + Math.hypot(point.x - b.x, point.y - b.y) - e.length) < .00001;
  });
}
const free = u => ['Disponibile', 'Pattugliamento'].includes(u.phase);
const moving = u => ['In viaggio', 'Rientro', 'Pattugliamento'].includes(u.phase);
function autoDispatch(game) {
  for (const c of game.state.cases) {
    if (c.at > game.state.time || c.done) continue;
    c.confirmed = true; c.visible = true; c.facts.confirm = c.address;
    if (c.answeredAt === null) { c.answeredAt = game.state.time; c.state = 'transferred'; }
    for (const type of c.need) {
      if (c.completed.includes(type) || game.state.units.some(u => u.target === c.id && u.type === type)) continue;
      const u = game.state.units.filter(u => u.type === type && free(u)).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (u) { const result = game.dispatch(u.id, c.id); assert(result.ok, result.text); }
    }
  }
}
function verifyRemainingClosures(game, map) {
  for (const u of game.state.units.filter(moving)) for (let i = u.pathIndex + 1; i < u.path.length; i++) {
    const a = u.path[i - 1], b = u.path[i];
    const edge = map.edges.find(e => (e.a === a.nodeId && e.b === b.nodeId) || (e.b === a.nodeId && e.a === b.nodeId));
    assert(edge, `${u.id}: route contains disconnected points`);
    assert(!game.state.blocked.includes(edge.id), `${u.id}: remaining route traverses closure ${edge.id}`);
  }
}
function fullShift(seed) {
  const rt = makeRuntime(seed), game = rt.game, map = rt.CityMap;
  const dt = .1, maxTime = 3600, overlaps = [], stalls = [], lastMotion = new Map(), sampledPairs = new Set();
  let distance = 0, samples = 0, closureChanges = 0, previousClosures = '', outerMotionChecks = 0;
  while (game.state.time < maxTime && !game.state.ended) {
    autoDispatch(game);
    const previous = new Map(game.state.units.map(u => [u.id, { x: u.x, y: u.y, phase: u.phase }]));
    game.tick(dt); samples++;
    const closureKey = game.state.blocked.join('|');
    if (closureKey !== previousClosures) { if (closureKey) closureChanges++; previousClosures = closureKey; verifyRemainingClosures(game, map); }
    for (const u of game.state.units) {
      const before = previous.get(u.id), travel = Math.hypot(u.x - before.x, u.y - before.y);
      assert(onRoad(map, u), `${u.id}: off road at ${u.x},${u.y}`);
      assert(travel <= dt * 22 + .00001, `${u.id}: teleported ${travel} units in ${dt} sec`);
      distance += travel;
      if (map.core && travel > .0001 && (u.x > map.core.width || u.y > map.core.height)) outerMotionChecks++;
      if (travel > .0001 || !moving(u) || u.waitUntil > game.state.time) lastMotion.set(u.id, game.state.time);
      if (moving(u) && game.state.time - (lastMotion.get(u.id) || 0) > 180 && !stalls.some(s => s.unit === u.id)) stalls.push({ unit: u.id, time: +game.state.time.toFixed(1), x: +u.x.toFixed(1), y: +u.y.toFixed(1), phase: u.phase, target: u.target, next: u.path[u.pathIndex] });
    }
    const units = game.state.units;
    for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
      const a = units[i], b = units[j], key = a.id + '/' + b.id;
      const ap = map.getUnitDisplayPosition ? map.getUnitDisplayPosition(a, units) : a, bp = map.getUnitDisplayPosition ? map.getUnitDisplayPosition(b, units) : b;
      if (Math.hypot(ap.x - bp.x, ap.y - bp.y) < 4 && (moving(a) || moving(b)) && !sampledPairs.has(key)) {
        sampledPairs.add(key); overlaps.push({ pair: key, time: +game.state.time.toFixed(1), x: +ap.x.toFixed(1), y: +ap.y.toFixed(1), phases: [a.phase, b.phase], headings: [+a.angle.toFixed(2), +b.angle.toFixed(2)] });
      }
    }
  }
  const summary = { seed, complete: game.state.ended, simulatedSeconds: +game.state.time.toFixed(1), civil: game.state.cases.filter(c => c.source === 'civilian').length, patrol: game.state.reportCount, completed: game.state.cases.filter(c => c.done).length, total: game.state.cases.length, epilogues: game.state.cases.filter(c=>c.source==='civilian'&&typeof c.epilogue==='string').length, unexpected: game.state.unexpectedCount, closureChanges, motionChecks: samples * game.state.units.length, outerMotionChecks, distance: Math.round(distance), stalls, overlaps };
  if (!game.state.ended) summary.pending = game.state.cases.filter(c => !c.done).map(c => ({ id: c.id, key: c.key, need: c.need, completed: c.completed, units: game.state.units.filter(u => u.target === c.id).map(u => ({ id: u.id, phase: u.phase, x: +u.x.toFixed(1), y: +u.y.toFixed(1), next: u.path[u.pathIndex] })) }));
  console.log(JSON.stringify(summary));
  assert.equal(summary.civil, 5); assert.equal(summary.patrol, 2); assert.equal(summary.complete, true, 'Shift stalled: ' + JSON.stringify(summary.pending));
  assert.equal(stalls.length, 0, 'Unit stalled for over 180 sec: ' + JSON.stringify(stalls));
  assert.equal(overlaps.length, 0, 'Vehicle display positions intersected: ' + JSON.stringify(overlaps));
  assert.equal(summary.epilogues, summary.civil, 'Every concluded civilian story must retain its epilogue');
  if (map.core && (map.width > map.core.width || map.height > map.core.height)) assert(outerMotionChecks > 0, 'Expanded city must be used by actual patrol movement');
  return summary;
}
function composerStateRegression() {
  const rt=makeRuntime(101),game=rt.game,field=rt.document.getElementById('message');
  game.state.started=false; game.state.tab='radio'; game.render(); assert.equal(field.disabled,true);
  game.start(); assert.equal(field.disabled,false,'Start must enable the restored radio composer');
  game.state.ai=true; game.render(); assert.match(rt.document.getElementById('composer-note').textContent,/IA locale attiva/);
  game.state.ended=true; game.render(); assert.equal(field.disabled,true,'End of shift must disable composer');
  console.log('PASS composer refreshes after start, AI availability change and shift completion.');
}
let failures = 0;
try { composerStateRegression(); } catch(e) { failures++; console.error('FAIL composer state: '+e.message); }
const seeds = process.argv.slice(2).map(Number); if (!seeds.length) seeds.push(101, 202, 303);
for (const seed of seeds) { try { fullShift(seed); } catch (e) { failures++; console.error('FAIL seed ' + seed + ': ' + e.message); } }
console.log(`${seeds.length - failures}/${seeds.length} complete-shift runs passed.`);
process.exitCode = failures ? 1 : 0;
