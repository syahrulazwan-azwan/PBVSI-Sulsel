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
      '<label>Logo kejuaraan (tampil di beranda &amp; cetakan)<select name="logoSel" id="logosel">' +
      '<option value="">Tidak ada</option>' +
      Object.keys(U.LOGOS).map(function (k) { return '<option value="' + k + '"' + (c.logo === k ? ' selected' : '') + '>' + esc(U.LOGOS[k].label) + '</option>'; }).join('') +
      '<option value="custom"' + (/^data:/.test(c.logo || '') ? ' selected' : '') + '>Unggah gambar sendiri…</option></select></label>' +
      '<div class="logo-prev" id="logoprev"></div><input type="hidden" name="logoData" value="' + esc(/^data:/.test(c.logo || '') ? c.logo : '') + '">' +
      '</form>';
  }

  /** Pratinjau & unggah logo (diperkecil maks. 400 px agar hemat penyimpanan) */
  function wireLogo(root) {
    var sel = U.qs('#logosel', root), prev = U.qs('#logoprev', root), hid = U.qs('[name=logoData]', root);
    function show() {
      var src = sel.value === 'custom' ? hid.value : (U.LOGOS[sel.value] ? U.LOGOS[sel.value].src : '');
      prev.innerHTML = (src ? '<img src="' + esc(src) + '" alt="">' : '') + (sel.value === 'custom' ? '<button type="button" class="btn small" id="pickLogo">Pilih gambar…</button>' : '');
      var b = U.qs('#pickLogo', prev);
      if (b) b.onclick = pick;
    }
    function pick() {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function () {
        var f = inp.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          var img = new Image();
          img.onload = function () {
            var k = Math.min(1, 400 / Math.max(img.width, img.height));
            var cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
            var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
            hid.value = cv.toDataURL('image/jpeg', 0.85); show();
          };
          img.src = r.result;
        };
        r.readAsDataURL(f);
      };
      inp.click();
    }
    sel.onchange = function () { show(); if (sel.value === 'custom' && !hid.value) pick(); };
    show();
  }

  function edit(c) {
    return U.modal({
      title: c ? 'Ubah Kejuaraan' : 'Kejuaraan Baru', body: form(c), wide: true,
      onOpen: wireLogo,
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var d = U.formData(U.qs('form', root));
          if (!d.name) { U.toast('Nama kejuaraan wajib diisi', 'error'); return false; }
          if (d.logoSel === 'custom' && !d.logoData) { U.toast('Pilih file gambar logo terlebih dahulu', 'error'); return false; }
          d.logo = d.logoSel === 'custom' ? d.logoData : d.logoSel;
          delete d.logoSel; delete d.logoData;
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
        var lg = U.compLogo(c);
        html += '<div class="card ' + (isA ? 'active' : '') + '">' +
          (lg ? '<img class="card-logo" src="' + esc(lg) + '" alt="">' : '') +
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
