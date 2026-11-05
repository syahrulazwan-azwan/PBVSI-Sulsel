# Cetak Scoresheet Wasit Bola Voli

Aplikasi web sederhana untuk **mencetak scoresheet asli** yang nanti **diisi manual** (pulpen) oleh pencatat di lapangan.
Formulir sudah tercetak lengkap dengan data kejuaraan, tim, pemain dan wasit, jadi pencatat tinggal mengisi jalannya pertandingan.

| Format | Formulir yang dicetak | Halaman |
|---|---|---|
| Indoor 6x6 | Scoresheet Excel *SCRST PRAPORPROV* (International Scoresheet) | 1 (A4 landscape) |
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

Aplikasi hanya punya 3 menu: **Scoresheet**, **Tim**, **Wasit**.

1. **Tim → + Tim**: nama & kode tim (mis. MRS), format, kategori, pool, daftar pemain (bisa **tempel dari Excel**: kolom No. dan Nama, tambahkan © untuk kapten dan (L) untuk libero), pelatih & ofisial.
2. **Wasit → + Wasit**: nama, lisensi, asal, kode asal (mis. TKR).
3. **Scoresheet → + Buat scoresheet**: nama kompetisi, kota, hall, kode wilayah (otomatis terisi dari scoresheet sebelumnya), no. pertandingan, tanggal, jam, lapangan, pool, tim A vs tim B, kostum, dan penugasan wasit.
4. Klik **🖨️ Cetak** (atau centang beberapa lalu **Cetak terpilih**). Di jendela cetak pilih **A4 – Landscape**, margin **None/Tidak ada**, skala **100%**.
5. Tombol **⧉** menyalin scoresheet (kompetisi, tanggal & wasit) untuk pertandingan berikutnya. **Blanko kosong** mencetak formulir tanpa data.

> Data tersimpan di browser perangkat masing-masing (tidak di GitHub). Pakai **Unduh backup / Impor backup** di bagian bawah halaman Scoresheet.

## Logo

Logo PBVSI serta logo & maskot PORPROV SULSEL XVIII/2026 tampil di halaman aplikasi. Pastikan penggunaan logo resmi sudah seizin panitia/PBVSI.

## Teknis

- Tanpa instalasi: cukup buka `index.html`, atau online lewat GitHub Pages (bisa dipasang di HP & dipakai offline).
- Gambar formulir: `img/tpl/`; koordinat kotak formulir: `js/views/form-layouts.js`; penulis data di formulir: `js/views/forms.js` & `js/views/forms-beach.js`.
- Setiap mengubah file, naikkan `VERSION` di `sw.js` agar HP yang sudah memasang aplikasi ikut memperbarui.

Panduan unggah ke GitHub ada di **[PANDUAN-GITHUB.md](PANDUAN-GITHUB.md)**.
