# Cetak Scoresheet Wasit Bola Voli

Aplikasi web sederhana untuk **mencetak scoresheet asli** yang nanti **diisi manual** (pulpen) oleh pencatat di lapangan.
Formulir sudah tercetak lengkap dengan data kejuaraan, tim, pemain dan wasit, jadi pencatat tinggal mengisi jalannya pertandingan.

| Format | Formulir yang dicetak | Halaman |
|---|---|---|
| Indoor 6x6 | FIVB International Scoresheet (FIVB_VB_Scoresheet_2013) | 1 (A4 landscape) |
| Pantai 2x2 | BVB/11 – 2026 Edition | 2 (bisa bolak-balik) |
| Pantai 4x4 | BVB 4 vs 4 | 2 (bisa bolak-balik) |

## Yang otomatis tercetak di formulir

- Nama kejuaraan, kota, hall/beach, kode wilayah, tanggal, jam, no. pertandingan, lapangan, pool/tahap
- Putra/Putri, kelompok umur
- Kode/nama tim A dan B (Pantai 2x2: nama kedua pemain)
- Daftar pemain: nomor, nama, kapten ©, libero; pelatih & ofisial (C, AC1, AC2, T, M)
- Wasit 1, wasit 2, pencatat, asisten pencatat (nama & asal), hakim garis 1–4; wasit cadangan di Remarks

Poin, line-up, rotasi/service rounds, time-out, pergantian, sanksi dan hasil **diisi tangan** di lapangan.

## Cara memakai

1. **Kejuaraan → + Kejuaraan**: nama, penyelenggara, kota, tempat, kode wilayah, logo.
2. **Tim → + Tim**: nama & kode tim (mis. MRS), format, kategori, pool, daftar pemain (bisa **tempel dari Excel**), ofisial.
3. **Wasit → + Wasit**: nama, lisensi, asal, kode asal.
4. **Pertandingan & Cetak → + Pertandingan**: tanggal, jam, lapangan, tim A vs tim B, kostum, penugasan wasit.
5. Klik **🖨️ Cetak** pada satu pertandingan, atau centang beberapa lalu **Cetak scoresheet terpilih** (bisa juga semua pertandingan hari ini dari Beranda).
6. Di jendela cetak pilih **A4 – Landscape**, margin **None/Tidak ada**, skala **100%**.

Tersedia juga **Blanko kosong** (formulir asli tanpa data) dan **Cetak daftar jadwal** (berisi daftar anggota pool & kolom kostum).
Mau mencoba dulu? **Beranda → Coba dengan data uji coba**.

> Data tersimpan di browser perangkat masing-masing (tidak di GitHub). Unduh backup secara rutin di menu **Data**.

## Logo

Logo PBVSI tampil di aplikasi dan di cetakan jadwal. Logo & maskot PORPROV SULSEL XVIII/2026 dipakai bila kejuaraan memilih logo tersebut (menu Kejuaraan). Pastikan penggunaan logo resmi sudah seizin panitia/PBVSI.

## Teknis

- Tanpa instalasi: cukup buka `index.html`, atau online lewat GitHub Pages (bisa dipasang di HP & dipakai offline).
- Gambar formulir: `img/tpl/`; koordinat kotak formulir: `js/views/form-layouts.js`; penulis data di formulir: `js/views/forms.js` & `js/views/forms-beach.js`.
- Setiap mengubah file, naikkan `VERSION` di `sw.js` agar HP yang sudah memasang aplikasi ikut memperbarui.

Panduan unggah ke GitHub ada di **[PANDUAN-GITHUB.md](PANDUAN-GITHUB.md)**.
