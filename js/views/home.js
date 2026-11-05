/* Beranda */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, esc = U.esc;

  function matchRow(m) {
    var J = VB.views.jadwal;
    return '<div class="match-row">' +
      '<div class="mr-meta">#' + esc(m.no) + ' • ' + esc(m.time || '') + (m.court ? ' • Lap ' + esc(m.court) : '') + '<br><span class="muted">' + esc(U.formatLabel(m.format)) + ' ' + esc(m.category || '') + (m.pool ? ' • ' + esc(m.pool) : '') + '</span></div>' +
      '<div class="mr-teams"><b>' + esc(J.teamLabel(m, 'A')) + '</b> <span class="muted">vs</span> <b>' + esc(J.teamLabel(m, 'B')) + '</b>' +
      '<div class="muted small">Wasit: ' + esc(U.refName((m.officials || {}).r1) || '—') + ' / ' + esc(U.refName((m.officials || {}).r2) || '—') + '</div></div>' +
      '<div class="mr-score"><a class="btn small primary" href="#/cetak/' + m.id + '">🖨️ Cetak</a></div></div>';
  }

  var STEPS = '<div class="steps">' +
    '<div class="step"><b>1</b><div><h3>Buat kejuaraan</h3><p>Nama kejuaraan, kota, tempat, logo.</p></div></div>' +
    '<div class="step"><b>2</b><div><h3>Isi tim &amp; pemain</h3><p>Nama &amp; kode tim, nomor &amp; nama pemain, kapten, libero, pelatih.</p></div></div>' +
    '<div class="step"><b>3</b><div><h3>Isi data wasit</h3><p>Wasit 1, wasit 2, pencatat, hakim garis.</p></div></div>' +
    '<div class="step"><b>4</b><div><h3>Buat pertandingan &amp; cetak</h3><p>Scoresheet asli tercetak lengkap dengan data tim, pemain &amp; wasit, siap diisi manual.</p></div></div></div>';

  function render(el) {
    var comp = S.activeCompetition();
    var html = '';
    if (!comp) {
      var P = U.LOGOS.porprov2026;
      html += '<section class="hero event"><div class="hero-logos"><img src="' + U.PBVSI_LOGO + '" alt="PBVSI" class="lg-pbvsi"><img src="' + P.src + '" alt="PORPROV" class="lg-event"></div>' +
        '<div class="hero-text"><div class="kicker">PORPROV SULSEL XVIII/2026 • WAJO – BONE</div><h1>Cetak Scoresheet Wasit Bola Voli</h1>' +
        '<p>Cetak scoresheet asli Indoor 6x6 (FIVB), Pantai 2x2 (BVB/11) dan Pantai 4x4 yang sudah terisi nama kejuaraan, tim, pemain dan wasit, lalu diisi manual di lapangan.</p>' +
        '<div class="row gap"><button class="btn big light" id="sample2">▶ Coba dengan data uji coba</button><a class="btn big ghost-light" href="#/kejuaraan">Buat kejuaraan</a></div></div>' +
        '<img src="' + P.mascot + '" alt="Maskot Si Gabus &amp; Dama" class="hero-mascot"></section>' + STEPS +
        '<div class="row gap mt"><a class="btn primary" href="#/kejuaraan">Mulai: buat kejuaraan</a><a class="btn" href="#/cetak/blanko:indoor6">Blanko kosong Indoor</a><a class="btn" href="#/cetak/blanko:beach2">Blanko kosong Pantai 2x2</a><a class="btn" href="#/cetak/blanko:beach4">Blanko kosong Pantai 4x4</a></div>';
      el.innerHTML = html;
      U.qs('#sample2', el).onclick = function () { VB.views.pengaturan.loadSample(); location.hash = '#/jadwal'; };
      return;
    }
    var all = S.list('matches', function (m) { return m.competitionId === comp.id; });
    var today = U.today();
    var sortFn = function (a, b) { return ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')) || (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0); };
    var todays = all.filter(function (m) { return m.date === today; }).sort(sortFn);
    var upcoming = all.filter(function (m) { return (m.date || '') > today; }).sort(sortFn).slice(0, 10);
    var nTeams = S.list('teams', function (t) { return t.competitionId === comp.id; }).length;

    var lg = U.compLogo(comp), mas = U.compMascot(comp);
    html += '<section class="hero event small-hero"><div class="hero-logos"><img src="' + U.PBVSI_LOGO + '" alt="PBVSI" class="lg-pbvsi">' + (lg ? '<img src="' + esc(lg) + '" alt="" class="lg-event">' : '') + '</div>' +
      '<div class="hero-text"><h1>' + esc(comp.name) + '</h1><p>' + esc([comp.organizer, comp.venue, comp.city].filter(Boolean).join(' • ')) +
      (comp.startDate ? '<br>' + esc([U.fmtDate(comp.startDate), U.fmtDate(comp.endDate)].filter(Boolean).join(' – ')) : '') + '</p>' +
      '<div class="row gap"><a class="btn light" href="#/kejuaraan">Ganti / ubah kejuaraan</a></div></div>' +
      (mas ? '<img src="' + mas + '" alt="Maskot" class="hero-mascot">' : '') + '</section>';
    html += '<div class="stats three mt">' +
      '<a class="stat" href="#/tim"><b>' + nTeams + '</b><span>Tim</span></a>' +
      '<a class="stat" href="#/jadwal"><b>' + all.length + '</b><span>Pertandingan</span></a>' +
      '<a class="stat" href="#/wasit"><b>' + S.list('referees').length + '</b><span>Wasit</span></a></div>';
    html += '<div class="row gap mt"><button class="btn primary" id="newmatch">+ Pertandingan baru</button>' +
      (todays.length ? '<a class="btn" href="#/cetak/multi:' + todays.map(function (m) { return m.id; }).join(',') + '">🖨️ Cetak semua scoresheet hari ini (' + todays.length + ')</a>' : '') +
      '<a class="btn ghost" href="#/jadwal">Lihat semua pertandingan</a></div>';
    if (todays.length) html += '<h2 class="section">Pertandingan hari ini</h2><div class="match-list">' + todays.map(matchRow).join('') + '</div>';
    if (upcoming.length) html += '<h2 class="section">Pertandingan berikutnya</h2><div class="match-list">' + upcoming.map(matchRow).join('') + '</div>';
    if (!all.length) html += U.emptyState('Belum ada pertandingan', 'Isi tim dan wasit, lalu buat pertandingan untuk dicetak scoresheet-nya.', '<a class="btn" href="#/tim">Isi data tim</a>');
    el.innerHTML = html;
    U.qs('#newmatch', el).onclick = function () { VB.views.jadwal.edit(null).then(function () { render(el); }); };
  }

  VB.views.home = { render: render };
})();
