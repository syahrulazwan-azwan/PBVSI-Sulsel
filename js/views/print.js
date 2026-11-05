/* Cetak scoresheet di atas formulir asli – untuk diisi manual (pulpen) */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;

  /** Salinan pertandingan tanpa catatan poin: formulir hanya berisi data jadwal, tim & wasit */
  function forPrint(m) { var c = Object.assign({}, m); c.events = []; c.rules = E.defaultRules(m.format); return c; }
  function blankMatch(fmt) {
    return { id: 'blank', format: fmt, rules: E.defaultRules(fmt), events: [], officials: {}, labelA: ' ', labelB: ' ', age: '', blank: true };
  }

  function render(el, id) {
    id = decodeURIComponent(id || '');
    var matches = [], title = '';
    if (id.indexOf('blanko:') === 0) {
      var fmt = id.slice(7);
      if (!E.FORMATS[fmt]) fmt = 'indoor6';
      matches = [blankMatch(fmt)];
      title = 'Blanko kosong – ' + U.formatLabel(fmt);
    } else {
      var ids = id.indexOf('multi:') === 0 ? id.slice(6).split(',') : [id];
      matches = ids.map(function (x) { return S.get('matches', x); }).filter(Boolean);
      title = matches.length === 1 ? '#' + matches[0].no + ' ' + VB.views.jadwal.teamLabel(matches[0], 'A') + ' vs ' + VB.views.jadwal.teamLabel(matches[0], 'B') : matches.length + ' pertandingan';
    }
    if (!matches.length) { el.innerHTML = U.emptyState('Pertandingan tidak ditemukan', 'Mungkin sudah dihapus.', '<a class="btn" href="#/jadwal">Kembali</a>'); return; }

    var pages = 0;
    matches.forEach(function (m) { pages += m.format === 'indoor6' ? 1 : 2; });
    var hasBeach = matches.some(function (m) { return m.format !== 'indoor6'; });
    var html = '<div class="print-toolbar no-print"><a class="btn" href="#/jadwal">← Pertandingan</a>' +
      '<button class="btn primary" id="doprint">🖨️ Cetak / Simpan PDF</button>' +
      '<span><b>' + esc(title) + '</b> • ' + pages + ' halaman</span>' +
      '<span class="muted small">Di jendela cetak pilih kertas <b>A4</b>, orientasi <b>Landscape</b>, margin <b>None/Tidak ada</b>, skala <b>100%</b>.' +
      (hasBeach ? ' Formulir pantai terdiri dari 2 halaman (bisa dicetak bolak-balik).' : '') + '</span></div>';
    html += '<div class="sheet-wrap tpl">' + matches.map(function (m) { return VB.forms.render(m.blank ? m : forPrint(m)); }).join('') + '</div>';
    el.innerHTML = html;
    U.qs('#doprint', el).onclick = function () { window.print(); };
    document.body.classList.add('print-tpl');
  }

  function destroy() { document.body.classList.remove('print-tpl'); }

  VB.views.cetak = { render: render, destroy: destroy };
})();
