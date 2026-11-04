/* Menu Wasit & penugasan */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, esc = U.esc;

  var ROLES = [
    ['r1', 'Wasit 1 (1st Referee)'], ['r2', 'Wasit 2 (2nd Referee)'], ['reserve', 'Wasit cadangan (Reserve)'],
    ['scorer', 'Pencatat (Scorer)'], ['ascorer', 'Asisten pencatat'],
    ['lj1', 'Hakim garis 1'], ['lj2', 'Hakim garis 2'], ['lj3', 'Hakim garis 3'], ['lj4', 'Hakim garis 4']
  ];
  var LICENSES = ['Daerah', 'Nasional C', 'Nasional B', 'Nasional A', 'Internasional', 'Kandidat'];

  function form(r) {
    r = r || {};
    return '<form class="grid-form">' +
      '<label class="span2">Nama lengkap<input name="name" required value="' + esc(r.name) + '"></label>' +
      '<label>Lisensi / tingkat<input name="license" list="lic" value="' + esc(r.license) + '" placeholder="Nasional C"></label>' +
      '<datalist id="lic">' + LICENSES.map(function (l) { return '<option value="' + l + '">'; }).join('') + '</datalist>' +
      '<label>Asal (kab/kota)<input name="origin" value="' + esc(r.origin) + '" placeholder="Takalar"></label>' +
      '<label>Kode asal (dicetak di kolom Country)<input name="code" maxlength="5" value="' + esc(r.code) + '" placeholder="TKR"></label>' +
      '<label>No. HP<input name="phone" inputmode="tel" value="' + esc(r.phone) + '"></label>' +
      '<label class="span2">Catatan<input name="notes" value="' + esc(r.notes) + '"></label></form>';
  }

  function edit(r) {
    return U.modal({
      title: r ? 'Ubah Data Wasit' : 'Wasit Baru', body: form(r), wide: true,
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var d = U.formData(U.qs('form', root));
          if (!d.name) { U.toast('Nama wajib diisi', 'error'); return false; }
          S.upsert('referees', Object.assign({}, r || {}, d));
          U.toast('Data wasit tersimpan');
        }
      }]
    });
  }

  /** Rekap penugasan wasit pada kejuaraan aktif */
  function duties(compId) {
    var res = {};
    S.list('matches', function (m) { return !compId || m.competitionId === compId; }).forEach(function (m) {
      var o = m.officials || {};
      ROLES.forEach(function (role) {
        var id = o[role[0]];
        if (!id) return;
        res[id] = res[id] || { total: 0, roles: {}, matches: [] };
        res[id].total++;
        res[id].roles[role[0]] = (res[id].roles[role[0]] || 0) + 1;
        res[id].matches.push({ m: m, role: role[0] });
      });
    });
    return res;
  }

  function showDuties(r, d) {
    var rows = (d && d.matches || []).sort(function (a, b) { return ((a.m.date || '') + (a.m.time || '')).localeCompare((b.m.date || '') + (b.m.time || '')); })
      .map(function (x) {
        var role = ROLES.filter(function (k) { return k[0] === x.role; })[0];
        return '<tr><td>' + esc(U.fmtDate(x.m.date)) + ' ' + esc(x.m.time || '') + '</td><td>' + esc(x.m.no || '') + '</td><td>' + esc(U.teamName(x.m.teamA)) + ' vs ' + esc(U.teamName(x.m.teamB)) + '</td><td>' + esc(role ? role[1] : x.role) + '</td></tr>';
      }).join('');
    U.modal({
      title: 'Penugasan: ' + r.name, wide: true,
      body: rows ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>No.</th><th>Pertandingan</th><th>Tugas</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p>Belum ada penugasan pada kejuaraan aktif.</p>'
    });
  }

  function render(el) {
    var comp = S.activeCompetition();
    var refs = S.list('referees').sort(function (a, b) { return a.name.localeCompare(b.name); });
    var dut = duties(comp && comp.id);
    var html = '<div class="page-head"><h1>Wasit</h1><div class="row gap"><button class="btn" id="print">Cetak rekap</button><button class="btn primary" id="add">+ Wasit</button></div></div>' +
      '<p class="muted no-print">Data wasit berlaku untuk semua kejuaraan. Penugasan diatur di setiap pertandingan (menu Jadwal). Rekap di bawah dihitung dari kejuaraan aktif' + (comp ? ': <b>' + esc(comp.name) + '</b>' : '') + '.</p>';
    if (!refs.length) html += U.emptyState('Belum ada data wasit', 'Tambahkan wasit, pencatat dan hakim garis.');
    else {
      html += U.printTitle(comp, 'REKAP PENUGASAN WASIT', '<div>' + esc(comp ? comp.name : '') + '</div>');
      html += '<div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Nama</th><th>Lisensi</th><th>Asal</th><th class="c">W1</th><th class="c">W2</th><th class="c">Pencatat</th><th class="c">Hakim garis</th><th class="c">Total</th><th class="no-print"></th></tr></thead><tbody>';
      refs.forEach(function (r, i) {
        var d = dut[r.id] || { total: 0, roles: {} };
        var rl = d.roles;
        var lj = (rl.lj1 || 0) + (rl.lj2 || 0) + (rl.lj3 || 0) + (rl.lj4 || 0);
        html += '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.name) + '</b>' + (r.phone ? '<div class="muted small">' + esc(r.phone) + '</div>' : '') + '</td><td>' + esc(r.license) + '</td><td>' + esc(r.origin) + (r.code ? ' (' + esc(r.code) + ')' : '') + '</td>' +
          '<td class="c">' + (rl.r1 || '') + '</td><td class="c">' + (rl.r2 || '') + '</td><td class="c">' + (((rl.scorer || 0) + (rl.ascorer || 0)) || '') + '</td><td class="c">' + (lj || '') + '</td><td class="c"><b>' + (d.total || 0) + '</b></td>' +
          '<td class="no-print nowrap"><button class="btn small ghost" data-act="view" data-id="' + r.id + '">Tugas</button><button class="btn small" data-act="edit" data-id="' + r.id + '">Ubah</button><button class="btn small danger ghost" data-act="del" data-id="' + r.id + '">✕</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    el.innerHTML = html;
    U.qs('#add', el).onclick = function () { edit(null).then(function () { render(el); }); };
    U.qs('#print', el).onclick = function () { window.print(); };
    U.qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var r = S.get('referees', b.dataset.id);
        if (b.dataset.act === 'edit') edit(r).then(function () { render(el); });
        if (b.dataset.act === 'view') showDuties(r, dut[r.id]);
        if (b.dataset.act === 'del') U.confirm('Hapus data wasit "' + r.name + '"?', 'Hapus', true).then(function (ok) { if (ok) { S.remove('referees', r.id); render(el); } });
      };
    });
  }

  VB.views.wasit = { render: render, ROLES: ROLES };
})();
