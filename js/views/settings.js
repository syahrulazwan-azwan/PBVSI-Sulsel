/* Menu Data: backup, impor, data contoh */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;

  function stamp() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  }

  function doImport() {
    U.pickFile().then(function (f) {
      if (!f) return;
      var data;
      try { data = JSON.parse(f.text); } catch (e) { U.toast('File tidak valid: ' + e.message, 'error'); return; }
      U.modal({
        title: 'Impor data', body: '<p>File: <b>' + esc(f.name) + '</b></p><p>Pilih cara impor:</p><ul><li><b>Gabungkan</b> – data baru ditambahkan; data yang sama diperbarui bila versinya lebih baru. Cocok untuk mengumpulkan hasil dari beberapa lapangan.</li><li><b>Ganti semua</b> – seluruh data di perangkat ini dihapus dan diganti isi file.</li></ul>',
        actions: [{ label: 'Batal', value: null }, { label: 'Ganti semua', cls: 'danger', value: 'replace' }, { label: 'Gabungkan', cls: 'primary', value: 'merge' }]
      }).then(function (mode) {
        if (!mode) return;
        try {
          var st = S.importData(data, mode);
          U.toast('Impor berhasil: ' + st.added + ' baru, ' + st.updated + ' diperbarui');
          VB.app.route();
        } catch (e) { U.toast('Gagal impor: ' + e.message, 'error'); }
      });
    });
  }

  // ---------- Data uji coba ----------
  function loadSample() {
    var comp = S.upsert('competitions', {
      name: 'PORPROV SULSEL XVIII/2026 – BOLA VOLI (UJI COBA)', organizer: 'Pengprov PBVSI Sulawesi Selatan', city: 'Wajo – Bone', venue: 'GOR / Pantai (uji coba)',
      countryCode: 'SLS', startDate: U.today(), endDate: U.today(), signer: 'Ketua Bidang Pertandingan', logo: 'porprov2026'
    });
    S.setSetting('activeCompetitionId', comp.id);
    var refs = ['Wasit Contoh Satu', 'Wasit Contoh Dua', 'Pencatat Contoh', 'Asisten Pencatat', 'Hakim Garis Satu', 'Hakim Garis Dua'].map(function (nm, i) {
      return S.upsert('referees', { name: nm, license: i < 2 ? 'Nasional C' : 'Daerah', origin: ['Takalar', 'Enrekang', 'Maros', 'Gowa', 'Bone', 'Wajo'][i], code: ['TKR', 'ERK', 'MRS', 'GWA', 'BNE', 'WJO'][i] });
    });
    function team(name, code, format, cat, pool, count) {
      var players = [];
      for (var i = 1; i <= count; i++) players.push({ no: String(i === 1 ? 1 : i + 1), name: 'Pemain ' + code + ' ' + i, captain: i === 1, libero: format === 'indoor6' && i > count - 2 });
      return S.upsert('teams', { competitionId: comp.id, name: name, code: code, format: format, category: cat, pool: pool, players: players, officials: { C: 'Pelatih ' + code, AC1: format === 'indoor6' ? 'Asisten ' + code : '' } });
    }
    var i1 = team('MAROS', 'MRS', 'indoor6', 'PA', 'A', 12), i2 = team('PANGKEP', 'PKP', 'indoor6', 'PA', 'A', 12), i3 = team('SOPPENG', 'SPG', 'indoor6', 'PA', 'A', 12);
    var b = [['BULUKUMBA', 'BLK'], ['BANTAENG', 'BTG'], ['PANGKEP', 'PKP'], ['SOPPENG', 'SPG']].map(function (x) { return team(x[0], x[1], 'beach2', 'PA', 'A', 2); });
    var q = [['MAROS', 'MRS'], ['SINJAI', 'SNJ'], ['MAKASSAR', 'MKS']].map(function (x) { return team(x[0], x[1], 'beach4', 'PI', 'CC', 6); });
    var off = { r1: refs[0].id, r2: refs[1].id, scorer: refs[2].id, ascorer: refs[3].id, lj1: refs[4].id, lj2: refs[5].id };
    var no = 1;
    function match(format, cat, pool, a, bb, time, court, play, seed) {
      var m = { competitionId: comp.id, no: String(no++), date: U.today(), time: time, court: court, format: format, category: cat, pool: pool, age: 'Senior', stage: 'Pool Play', teamA: a.id, teamB: bb.id, officials: off, rules: E.defaultRules(format), events: [], note: ['Merah – Putih', 'Biru – Kuning', 'Hijau – Hitam'][no % 3] };
      return S.upsert('matches', m);
    }
    match('indoor6', 'PA', 'A', i1, i2, '08.00-10.00', 'I', true, 7);
    match('indoor6', 'PA', 'A', i2, i3, '10.00-12.00', 'I', false);
    match('beach2', 'PA', 'A', b[0], b[1], '08.00-08.45', 'II', true, 3);
    match('beach2', 'PA', 'A', b[2], b[3], '08.45-09.30', 'II', true, 11);
    match('beach2', 'PA', 'A', b[0], b[2], '09.30-10.15', 'II', false);
    match('beach4', 'PI', 'CC', q[0], q[1], '13.00-13.45', 'III', true, 5);
    match('beach4', 'PI', 'CC', q[1], q[2], '13.45-14.30', 'III', false);
    U.toast('Data uji coba dimuat');
  }

  function render(el) {
    var raw = S.raw();
    var size = new Blob([S.exportAll()]).size;
    el.innerHTML = '<div class="page-head"><h1>Data &amp; Backup</h1></div>' +
      '<div class="cards">' +
      '<div class="card"><div class="card-title">Simpan cadangan (backup)</div><p class="muted">Semua data tersimpan di perangkat/browser ini saja. Unduh backup secara rutin, terutama setelah pertandingan selesai.</p><div class="card-actions"><button class="btn primary" id="exp">Unduh backup (.json)</button></div></div>' +
      '<div class="card"><div class="card-title">Impor / gabungkan data</div><p class="muted">Pakai untuk memindahkan data ke perangkat lain, atau mengumpulkan hasil scoresheet dari tiap lapangan ke laptop panitia.</p><div class="card-actions"><button class="btn" id="imp">Pilih file .json</button></div></div>' +
      '<div class="card"><div class="card-title">Data uji coba</div><p class="muted">Menambahkan kejuaraan uji coba PORPROV SULSEL XVIII/2026 berisi tim, pemain, wasit, dan beberapa pertandingan untuk mencoba mencetak scoresheet. Bisa dihapus kapan saja di menu Kejuaraan.</p><div class="card-actions"><button class="btn" id="sample">Muat data uji coba</button></div></div>' +
      '<div class="card"><div class="card-title">Hapus semua data</div><p class="muted">Menghapus seluruh data di perangkat ini. Unduh backup dulu!</p><div class="card-actions"><button class="btn danger" id="reset">Hapus semua</button></div></div>' +
      '</div><p class="muted small mt">Isi data: ' + raw.competitions.length + ' kejuaraan, ' + raw.teams.length + ' tim, ' + raw.referees.length + ' wasit, ' + raw.matches.length + ' pertandingan (' + (size / 1024).toFixed(1) + ' KB).</p>';
    U.qs('#exp', el).onclick = function () { U.download('backup-scoresheet-' + stamp() + '.json', S.exportAll()); };
    U.qs('#imp', el).onclick = doImport;
    U.qs('#sample', el).onclick = function () { loadSample(); location.hash = '#/jadwal'; };
    U.qs('#reset', el).onclick = function () {
      U.confirm('Yakin menghapus SEMUA data di perangkat ini? Tindakan ini tidak bisa dibatalkan.', 'Hapus semua', true).then(function (ok) {
        if (ok) { S.resetAll(); U.toast('Semua data dihapus'); render(el); }
      });
    };
  }

  VB.views.pengaturan = { render: render, loadSample: loadSample, stamp: stamp, doImport: doImport };
})();
