/* Jalankan: node tests/engine.test.js */
const assert = require('assert');
const E = require('../js/engine.js');

let t = 0;
const T = (iso) => new Date(Date.UTC(2026, 0, 1, 1, 0, t++)).toISOString();
function mk(format) { return { rules: E.defaultRules(format), events: [] }; }
function add(m, ev) {
  ev.time = T();
  const r = E.tryEvent(m, ev);
  if (!r.ok) throw new Error(r.error);
  m.events.push(ev);
  return r.state;
}
function points(m, team, k) { let s; for (let i = 0; i < k; i++) s = add(m, { t: 'point', team }); return s; }
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

console.log('Engine tests');

test('Indoor: rotasi & putaran servis', () => {
  const m = mk('indoor6');
  add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] }, firstServe: 'A', left: 'A' });
  let s = points(m, 'A', 2);               // A: 2-0, server #1
  assert.strictEqual(s.current.score.A, 2);
  s = points(m, 'B', 1);                   // side-out: B rotasi, server #12 (posisi II)
  const cur = s.current;
  assert.strictEqual(cur.server, 'B');
  assert.strictEqual(E.serverInfo(cur, 'B', m.rules).no, '12');
  assert.deepStrictEqual(cur.rounds.A[0], [{ score: 2 }]);
  s = points(m, 'A', 1);                   // A kembali servis: rotasi -> #2
  assert.strictEqual(E.serverInfo(s.current, 'A', m.rules).no, '2');
  assert.deepStrictEqual(s.current.rounds.B[1], [{ score: 1 }]);
  assert.deepStrictEqual(E.courtPositions(s.current, 'A', m.rules), ['2', '3', '4', '5', '6', '1']);
});

test('Indoor: set selesai 25 dengan selisih 2, pertandingan 3-0', () => {
  const m = mk('indoor6');
  for (let set = 0; set < 3; set++) {
    add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] }, firstServe: set % 2 ? 'B' : 'A', left: 'A' });
    points(m, 'B', 24); points(m, 'A', 24);
    let s = points(m, 'A', 1);
    assert.ok(!s.current.finished, 'belum selesai di 25-24');
    s = points(m, 'A', 1);
    assert.ok(s.current.finished && s.current.winner === 'A');
  }
  const s = E.compute(m);
  assert.ok(s.finished && s.winner === 'A');
  assert.deepStrictEqual(s.setsWon, { A: 3, B: 0 });
  assert.throws(() => { const r = E.tryEvent(m, { t: 'point', team: 'A' }); if (!r.ok) throw new Error(r.error); });
});

test('Indoor: set penentuan 15 & pindah lapangan di 8', () => {
  const m = mk('indoor6');
  const lu = { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] };
  for (let i = 0; i < 4; i++) { add(m, { t: 'setStart', lineup: lu, firstServe: 'A', left: 'A' }); points(m, i % 2 ? 'B' : 'A', 25); }
  add(m, { t: 'setStart', lineup: lu, firstServe: 'B', left: 'B' });
  let s = points(m, 'A', 7);
  assert.strictEqual(s.current.left, 'B');
  s = points(m, 'A', 1);
  assert.strictEqual(s.current.left, 'A');
  assert.strictEqual(s.notices[0].type, 'switch');
  s = points(m, 'A', 7);
  assert.ok(s.finished && s.winner === 'A' && s.current.target === 15);
});

test('Indoor: aturan pergantian berpasangan', () => {
  const m = mk('indoor6');
  add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] }, firstServe: 'A', left: 'A' });
  add(m, { t: 'sub', team: 'A', out: 3, in: 9 });
  assert.strictEqual(E.tryEvent(m, { t: 'sub', team: 'A', out: 9, in: 10 }).ok, false);
  add(m, { t: 'sub', team: 'A', out: 9, in: 3 });
  assert.strictEqual(E.tryEvent(m, { t: 'sub', team: 'A', out: 3, in: 9 }).ok, false);
  assert.strictEqual(E.tryEvent(m, { t: 'sub', team: 'A', out: 3, in: 9, exceptional: true }).ok, true);
  assert.strictEqual(E.tryEvent(m, { t: 'sub', team: 'A', out: 7, in: 8 }).ok, false);
});

test('Time-out dibatasi per set', () => {
  const m = mk('indoor6');
  add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] }, firstServe: 'A', left: 'A' });
  add(m, { t: 'timeout', team: 'B' }); add(m, { t: 'timeout', team: 'B' });
  assert.strictEqual(E.tryEvent(m, { t: 'timeout', team: 'B' }).ok, false);
});

test('Sanksi penalti memberi poin & servis ke lawan', () => {
  const m = mk('indoor6');
  add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] }, firstServe: 'A', left: 'A' });
  const s = add(m, { t: 'sanction', team: 'A', who: '4', type: 'P' });
  assert.strictEqual(s.current.score.B, 1);
  assert.strictEqual(s.current.server, 'B');
  assert.strictEqual(s.sanctions.length, 1);
});

test('Pantai 2x2: urutan servis I/III vs II/IV, pindah tiap 7, TTO di 21', () => {
  const m = mk('beach2');
  add(m, { t: 'setStart', lineup: { A: [1, 2], B: [1, 2] }, firstServe: 'B', left: 'A' });
  let s = E.compute(m);
  // tim penerima (A) servis pertama oleh pemain urutan pertama (#1 = II)
  assert.strictEqual(E.serverInfo(s.current, 'A', m.rules).label, 'II');
  assert.strictEqual(E.serverInfo(s.current, 'B', m.rules).label, 'I');
  s = points(m, 'A', 1);
  assert.strictEqual(E.serverInfo(s.current, 'A', m.rules).no, '1');
  s = points(m, 'B', 1);
  assert.strictEqual(E.serverInfo(s.current, 'B', m.rules).label, 'III');
  s = points(m, 'A', 5);  // total 7
  assert.strictEqual(s.current.left, 'B');
  assert.strictEqual(s.current.switches.length, 1);
  s = points(m, 'B', 14); // total 21
  assert.ok(s.current.tto);
  assert.strictEqual(s.current.switches.length, 3);
  s = points(m, 'B', 6);
  assert.ok(s.current.finished && s.current.winner === 'B');
  assert.strictEqual(s.current.score.B, 21);
});

test('Pantai 2x2: set ke-3 sampai 15, pindah tiap 5, tanpa TTO', () => {
  const m = mk('beach2');
  const lu = { A: [1, 2], B: [1, 2] };
  add(m, { t: 'setStart', lineup: lu, firstServe: 'A', left: 'A' }); points(m, 'A', 21);
  add(m, { t: 'setStart', lineup: lu, firstServe: 'B', left: 'B' }); points(m, 'B', 21);
  add(m, { t: 'setStart', lineup: lu, firstServe: 'A', left: 'A' });
  let s = points(m, 'A', 5);
  assert.strictEqual(s.current.switches.length, 1);
  s = points(m, 'B', 13); s = points(m, 'A', 10);
  assert.ok(!s.current.tto);
  assert.ok(s.finished && s.winner === 'A');
  assert.strictEqual(s.current.score.A, 15);
});

test('Pantai 4x4: maksimal 4 pergantian bebas', () => {
  const m = mk('beach4');
  add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4], B: [1, 2, 3, 4] }, firstServe: 'A', left: 'A' });
  add(m, { t: 'sub', team: 'A', out: 1, in: 5 });
  add(m, { t: 'sub', team: 'A', out: 5, in: 1 });
  add(m, { t: 'sub', team: 'A', out: 2, in: 6 });
  add(m, { t: 'sub', team: 'A', out: 6, in: 2 });
  assert.strictEqual(E.tryEvent(m, { t: 'sub', team: 'A', out: 3, in: 7 }).ok, false);
});

test('Forfeit mengisi sisa set untuk lawan', () => {
  const m = mk('beach2');
  add(m, { t: 'setStart', lineup: { A: [1, 2], B: [1, 2] }, firstServe: 'A', left: 'A' });
  points(m, 'A', 5);
  const s = add(m, { t: 'forfeit', team: 'A', reason: 'cedera' });
  assert.ok(s.finished && s.winner === 'B');
  const sm = E.summary(s);
  assert.deepStrictEqual(sm.sets.map(x => [x.A, x.B]), [[5, 21], [0, 21]]);
});

test('Undo = hapus event terakhir', () => {
  const m = mk('indoor6');
  add(m, { t: 'setStart', lineup: { A: [1, 2, 3, 4, 5, 6], B: [11, 12, 13, 14, 15, 16] }, firstServe: 'A', left: 'A' });
  points(m, 'B', 3);
  m.events.pop();
  const s = E.compute(m);
  assert.strictEqual(s.current.score.B, 2);
});

test('Nilai klasemen', () => {
  const ri = E.defaultRules('indoor6'), rb = E.defaultRules('beach2');
  assert.strictEqual(E.classificationPoints(ri, true, 3, 1), 3);
  assert.strictEqual(E.classificationPoints(ri, true, 3, 2), 2);
  assert.strictEqual(E.classificationPoints(ri, false, 2, 3), 1);
  assert.strictEqual(E.classificationPoints(rb, false, 1, 2), 1);
  assert.strictEqual(E.classificationPoints(rb, false, 0, 2, true), 0);
});

console.log(`\n${passed} tes lulus.`);
