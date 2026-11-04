/* Fungsi bantu tampilan (UI) */
(function (root) {
  'use strict';
  var E = root.VBEngine;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function qs(sel, rootEl) { return (rootEl || document).querySelector(sel); }
  function qsa(sel, rootEl) { return Array.prototype.slice.call((rootEl || document).querySelectorAll(sel)); }

  var toastTimer;
  function toast(msg, type) {
    var el = qs('#toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, type === 'error' ? 4500 : 2500);
  }

  /**
   * modal({title, body, actions:[{label, cls, value, onClick(root)}], wide})
   * Mengembalikan Promise berisi value tombol yang ditekan (atau null bila ditutup).
   * onClick boleh mengembalikan false agar modal tetap terbuka.
   */
  function modal(opts) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML =
        '<div class="modal ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><h3>' + esc(opts.title || '') + '</h3><button class="icon-btn" data-close aria-label="Tutup">✕</button></div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        '<div class="modal-foot"></div></div>';
      var foot = qs('.modal-foot', wrap);
      (opts.actions || [{ label: 'Tutup', value: null }]).forEach(function (a) {
        var b = document.createElement('button');
        b.className = 'btn ' + (a.cls || '');
        b.textContent = a.label;
        b.addEventListener('click', function () {
          if (a.onClick) {
            var r = a.onClick(wrap);
            if (r === false) return;
          }
          close(a.value === undefined ? a.label : a.value);
        });
        foot.appendChild(b);
      });
      function close(v) {
        document.removeEventListener('keydown', onKey);
        wrap.remove();
        resolve(v);
      }
      function onKey(e) { if (e.key === 'Escape') close(null); }
      document.addEventListener('keydown', onKey);
      qs('[data-close]', wrap).addEventListener('click', function () { close(null); });
      wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(null); });
      qs('#modal-root').appendChild(wrap);
      if (opts.onOpen) opts.onOpen(wrap);
      var f = qs('input,select,textarea', wrap);
      if (f && !opts.noAutofocus) setTimeout(function () { f.focus(); }, 30);
    });
  }

  function confirmDlg(msg, okLabel, danger) {
    return modal({
      title: 'Konfirmasi', body: '<p>' + esc(msg) + '</p>',
      actions: [{ label: 'Batal', value: false }, { label: okLabel || 'Ya', cls: danger ? 'danger' : 'primary', value: true }]
    });
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || '.json,application/json';
      inp.onchange = function () {
        var f = inp.files[0];
        if (!f) return resolve(null);
        var r = new FileReader();
        r.onload = function () { resolve({ name: f.name, text: r.result }); };
        r.readAsText(f);
      };
      inp.click();
    });
  }

  var DAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function fmtDate(d, withDay) {
    if (!d) return '';
    var p = String(d).split('-');
    if (p.length !== 3) return d;
    var dt = new Date(+p[0], +p[1] - 1, +p[2]);
    var s = dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
    return withDay ? DAYS[dt.getDay()].charAt(0) + DAYS[dt.getDay()].slice(1).toLowerCase() + ', ' + s : s;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var CATS = { PA: 'Putra', PI: 'Putri' };
  function catLabel(c) { return CATS[c] || c || ''; }
  function formatLabel(f) { return (E.FORMATS[f] && E.FORMATS[f].label) || f || ''; }

  function formatOptions(sel, withAll) {
    var o = withAll ? '<option value="">Semua format</option>' : '';
    Object.keys(E.FORMATS).forEach(function (k) {
      o += '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + E.FORMATS[k].label + '</option>';
    });
    return o;
  }
  function catOptions(sel, withAll) {
    var o = withAll ? '<option value="">Putra &amp; Putri</option>' : '';
    Object.keys(CATS).forEach(function (k) {
      o += '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + CATS[k] + ' (' + k + ')</option>';
    });
    return o;
  }

  function teamName(id) {
    var t = id && root.VBStore.get('teams', id);
    return t ? t.name : '—';
  }
  function refName(id) {
    var r = id && root.VBStore.get('referees', id);
    return r ? r.name : '';
  }

  function formData(form) {
    var o = {};
    qsa('[name]', form).forEach(function (el) {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value.trim();
    });
    return o;
  }

  function emptyState(title, text, actionHtml) {
    return '<div class="empty"><div class="empty-ico">🏐</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
  }

  var PBVSI_LOGO = 'img/pbvsi.png';
  var LOGOS = {
    porprov2026: { src: 'img/porprov-2026.jpg', mascot: 'img/maskot-porprov-2026.jpg', label: 'PORPROV SULSEL XVIII/2026 – Wajo-Bone' }
  };
  /** src logo kejuaraan ('' bila tidak ada) */
  function compLogo(c) {
    if (!c || !c.logo) return '';
    if (LOGOS[c.logo]) return LOGOS[c.logo].src;
    return /^data:image\//.test(c.logo) ? c.logo : '';
  }
  function compMascot(c) { return c && LOGOS[c.logo] ? LOGOS[c.logo].mascot : ''; }
  /** Kepala cetak: logo PBVSI kiri, logo kejuaraan kanan */
  function printTitle(c, title, sub) {
    var l = compLogo(c);
    return '<div class="print-only print-title pt-logos"><img src="' + PBVSI_LOGO + '" alt="PBVSI"><div><h2>' + title + '</h2>' + (sub || '') + '</div>' + (l ? '<img src="' + esc(l) + '" alt="">' : '<span></span>') + '</div>';
  }

  root.VBUI = {
    PBVSI_LOGO: PBVSI_LOGO, LOGOS: LOGOS, compLogo: compLogo, compMascot: compMascot, printTitle: printTitle,
    esc: esc, qs: qs, qsa: qsa, toast: toast, modal: modal, confirm: confirmDlg,
    download: download, pickFile: pickFile, fmtDate: fmtDate, today: today,
    catLabel: catLabel, formatLabel: formatLabel, formatOptions: formatOptions, catOptions: catOptions,
    teamName: teamName, refName: refName, formData: formData, emptyState: emptyState, CATS: CATS
  };
  root.VB = root.VB || { views: {} };
})(window);
