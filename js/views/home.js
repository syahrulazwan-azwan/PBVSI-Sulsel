/* Beranda */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, esc = U.esc;

  function matchRow(m) {
    var J = VB.views.jadwal, st = J.state(m), status = J.status(m);
    var score = '';
    if (st && st.sets.length) {
      var c = st.current;
      score = st.setsWon.A + '–' + st.setsWon.B + (status === 'live' && c ? ' <span class="muted">(set ' + c.no + ': ' + c.score.A + '–' + c.score.B + ')</span>' : '');
    }
    return '<a class="match-row" href="#/scoresheet/' + m.id + '">' +
      '<div class="mr-meta">#' + esc(m.no) + ' • ' + esc(m.time || '') + (m.court ? ' • Lap ' + esc(m.court) : '') + '<br><span class="muted">' + esc(U.formatLabel(m.format)) + ' ' + esc(m.category || '') + (m.pool ? ' • ' + esc(m.pool) : '') + '</span></div>' +
      '<div class="mr-teams"><b>' + esc(J.teamLabel(m, 'A')) + '</b> <span class="muted">vs</span> <b>' + esc(J.teamLabel(m, 'B')) + '</b></div>' +
      '<div class="mr-score">' + score + ' <span class="badge ' + status + '">' + J.STATUS_LABEL[status] + '</span></div></a>';
  }

  function render(el) {
    var comp = S.activeCompetition();
    var html = '';
    if (!comp) {
      html += '<section class="hero"><h1>Scoresheet Digital Bola Voli</h1>' +
        '<p>Catat pertandingan Indoor 6x6, Pantai 2x2 dan Pantai 4x4 langsung di HP/tablet, lalu cetak scoresheet, jadwal, hasil dan klasemen.</p></section>' +
        '<div class="steps">' +
        '<div class="step"><b>1</b><div><h3>Buat kejuaraan</h3><p>Nama kejuaraan, kota, tempat.</p></div></div>' +
        '<div class="step"><b>2</b><div><h3>Isi tim &amp; pemain</h3><p>Nama tim, nomor &amp; nama pemain, kapten, libero, pelatih.</p></div></div>' +
        '<div class="step"><b>3</b><div><h3>Isi data wasit</h3><p>Wasit 1, wasit 2, pencatat, hakim garis.</p></div></div>' +
        '<div class="step"><b>4</b><div><h3>Buat jadwal &amp; mulai scoresheet</h3><p>Hasil, klasemen dan cetakan terisi otomatis.</p></div></div></div>' +
        '<div class="row gap mt"><a class="btn primary" href="#/kejuaraan">Mulai: buat kejuaraan</a><button class="btn" id="sample">Coba dengan data contoh</button></div>';
      el.innerHTML = html;
      U.qs('#sample', el).onclick = function () { VB.views.pengaturan.loadSample(); location.hash = '#/jadwal'; };
      return;
    }
    var all = S.list('matches', function (m) { return m.competitionId === comp.id; });
    var J = VB.views.jadwal;
    var live = all.filter(function (m) { return J.status(m) === 'live'; });
    var today = U.today();
    var todays = all.filter(function (m) { return m.date === today && J.status(m) !== 'live'; })
      .sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    var upcoming = all.filter(function (m) { return J.status(m) === 'scheduled'; })
      .sort(function (a, b) { return ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')); }).slice(0, 8);
    var done = all.filter(function (m) { return J.status(m) === 'finished'; }).length;
    var nTeams = S.list('teams', function (t) { return t.competitionId === comp.id; }).length;

    html += '<div class="page-head"><div><h1>' + esc(comp.name) + '</h1><div class="muted">' + esc([comp.organizer, comp.venue, comp.city].filter(Boolean).join(' • ')) + '</div></div>' +
      '<a class="btn" href="#/kejuaraan">Ganti kejuaraan</a></div>';
    html += '<div class="stats">' +
      '<a class="stat" href="#/tim"><b>' + nTeams + '</b><span>Tim</span></a>' +
      '<a class="stat" href="#/jadwal"><b>' + all.length + '</b><span>Pertandingan</span></a>' +
      '<a class="stat" href="#/jadwal"><b>' + done + '</b><span>Selesai</span></a>' +
      '<a class="stat" href="#/wasit"><b>' + S.list('referees').length + '</b><span>Wasit</span></a></div>';
    html += '<div class="row gap mt"><button class="btn primary" id="newmatch">+ Pertandingan baru</button><a class="btn" href="#/klasemen">Lihat klasemen</a></div>';
    if (live.length) html += '<h2 class="section">Sedang berlangsung</h2><div class="match-list">' + live.map(matchRow).join('') + '</div>';
    if (todays.length) html += '<h2 class="section">Hari ini</h2><div class="match-list">' + todays.map(matchRow).join('') + '</div>';
    else if (upcoming.length) html += '<h2 class="section">Pertandingan berikutnya</h2><div class="match-list">' + upcoming.map(matchRow).join('') + '</div>';
    if (!all.length) html += U.emptyState('Belum ada pertandingan', 'Isi tim dan wasit, lalu buat jadwal pertandingan.', '<a class="btn" href="#/tim">Isi data tim</a>');
    el.innerHTML = html;
    U.qs('#newmatch', el).onclick = function () { J.edit(null).then(function () { render(el); }); };
  }

  VB.views.home = { render: render };
})();
