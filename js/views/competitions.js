/* Menu Kejuaraan */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, esc = U.esc;

  function form(c) {
    c = c || {};
    return '<form class="grid-form">' +
      '<label class="span2">Nama kejuaraan<input name="name" required value="' + esc(c.name) + '" placeholder="Babak Kualifikasi Porprov XVIII Bola Voli"></label>' +
      '<label>Penyelenggara<input name="organizer" value="' + esc(c.organizer) + '" placeholder="Pengprov PBVSI Sulawesi Selatan"></label>' +
      '<label>Kota<input name="city" value="' + esc(c.city) + '" placeholder="Makassar"></label>' +
      '<label>Tempat / Hall / Beach<input name="venue" value="' + esc(c.venue) + '" placeholder="Pantai PPLP Makassar"></label>' +
      '<label>Kode wilayah<input name="countryCode" value="' + esc(c.countryCode) + '" placeholder="SLS"></label>' +
      '<label>Tanggal mulai<input type="date" name="startDate" value="' + esc(c.startDate) + '"></label>' +
      '<label>Tanggal selesai<input type="date" name="endDate" value="' + esc(c.endDate) + '"></label>' +
      '<label class="span2">Ketua bidang pertandingan (untuk tanda tangan jadwal)<input name="signer" value="' + esc(c.signer) + '" placeholder="Drs. Rustam Nur"></label>' +
      '</form>';
  }

  function edit(c) {
    return U.modal({
      title: c ? 'Ubah Kejuaraan' : 'Kejuaraan Baru', body: form(c), wide: true,
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var d = U.formData(U.qs('form', root));
          if (!d.name) { U.toast('Nama kejuaraan wajib diisi', 'error'); return false; }
          var rec = Object.assign({}, c || {}, d);
          S.upsert('competitions', rec);
          if (!c) S.setSetting('activeCompetitionId', rec.id);
          U.toast('Kejuaraan tersimpan');
        }
      }]
    });
  }

  function render(el) {
    var active = S.activeCompetition();
    var comps = S.list('competitions');
    var html = '<div class="page-head"><h1>Kejuaraan</h1><button class="btn primary" id="add">+ Kejuaraan</button></div>';
    if (!comps.length) {
      html += U.emptyState('Belum ada kejuaraan', 'Buat kejuaraan dulu. Tim dan jadwal pertandingan dikelompokkan per kejuaraan.');
    } else {
      html += '<div class="cards">';
      comps.slice().reverse().forEach(function (c) {
        var nm = S.list('matches', function (m) { return m.competitionId === c.id; }).length;
        var nt = S.list('teams', function (t) { return t.competitionId === c.id; }).length;
        var isA = active && active.id === c.id;
        html += '<div class="card ' + (isA ? 'active' : '') + '">' +
          '<div class="card-title">' + esc(c.name) + (isA ? ' <span class="badge ok">Aktif</span>' : '') + '</div>' +
          '<div class="muted">' + esc([c.organizer, c.venue, c.city].filter(Boolean).join(' • ')) + '</div>' +
          '<div class="muted">' + esc([U.fmtDate(c.startDate), U.fmtDate(c.endDate)].filter(Boolean).join(' – ')) + '</div>' +
          '<div class="muted">' + nt + ' tim • ' + nm + ' pertandingan</div>' +
          '<div class="card-actions">' +
          (isA ? '' : '<button class="btn small" data-act="use" data-id="' + c.id + '">Jadikan aktif</button>') +
          '<button class="btn small" data-act="edit" data-id="' + c.id + '">Ubah</button>' +
          '<button class="btn small danger ghost" data-act="del" data-id="' + c.id + '">Hapus</button></div></div>';
      });
      html += '</div>';
    }
    el.innerHTML = html;
    U.qs('#add', el).onclick = function () { edit(null).then(function () { render(el); }); };
    U.qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var c = S.get('competitions', b.dataset.id);
        if (b.dataset.act === 'use') { S.setSetting('activeCompetitionId', c.id); render(el); U.toast('Kejuaraan aktif: ' + c.name); }
        if (b.dataset.act === 'edit') edit(c).then(function () { render(el); });
        if (b.dataset.act === 'del') {
          U.confirm('Hapus kejuaraan "' + c.name + '" beserta semua tim dan pertandingannya?', 'Hapus', true).then(function (ok) {
            if (!ok) return;
            S.list('matches', function (m) { return m.competitionId === c.id; }).forEach(function (m) { S.remove('matches', m.id); });
            S.list('teams', function (t) { return t.competitionId === c.id; }).forEach(function (t) { S.remove('teams', t.id); });
            S.remove('competitions', c.id);
            render(el);
          });
        }
      };
    });
  }

  VB.views.kejuaraan = { render: render, edit: edit };
})();
