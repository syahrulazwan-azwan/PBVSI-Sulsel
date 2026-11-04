# Scoresheet Wasit Bola Voli

Aplikasi web untuk mencatat pertandingan bola voli secara digital, lalu mencetak scoresheet dengan susunan seperti formulir resmi.

Format yang didukung:

| Format | Set | Poin per set | Set penentuan | Time-out | Pergantian | Pindah lapangan |
|---|---|---|---|---|---|---|
| **Indoor 6x6** | 3 dari 5 | 25 | 15 | 2 per set | 6 per set (aturan berpasangan) | set ke-5 saat poin 8 |
| **Pantai 2x2** | 2 dari 3 | 21 | 15 | 1 per set | – | tiap 7 poin (set 3: tiap 5), TTO di jumlah 21 |
| **Pantai 4x4** | 2 dari 3 | 21 | 15 | 1 per set | 4 per set | tiap 7 poin (set 3: tiap 5), TTO di jumlah 21 |

Semua angka aturan di atas bisa diubah per pertandingan (menu *Ubah pertandingan → Aturan pertandingan*), misalnya bila juklak kejuaraan berbeda.

## Fitur

- **Scoresheet live**: tombol +1 poin besar untuk HP/tablet, urutan servis & rotasi otomatis, putaran servis (*service rounds*), time-out, pergantian pemain (dengan pemeriksaan aturan), sanksi W/P/E/D dan penundaan (penalti otomatis memberi poin ke lawan), peringatan pindah lapangan dan TTO, forfeit/WO, catatan (*remarks*), dan **Undo**.
- **Cetak formulir resmi 1 lembar** (A4 landscape), mengikuti formulir kertas:
  - Indoor: *International Scoresheet* (sama seperti file Excel SCRST PRAPORPROV), set 1–5, sanctions, remarks, approval, results, dan daftar pemain + libero + ofisial.
  - Pantai 4x4: formulir BVB 4 vs 4 (3 set), ditambah daftar tim, sanksi, hasil, dan approval di bagian bawah.
  - Pantai 2x2: formulir BVB/11 (3 set) ditambah teams, results, approval, dan remarks.
  - Data dari jadwal (kejuaraan, kota, tempat, tanggal, jam, pool, no. pertandingan, kode tim, pemain, kapten ©, libero, pelatih/ofisial, wasit & hakim garis) **terisi otomatis**. Bila pertandingan belum dicatat, hasilnya menjadi **blanko yang sudah terisi** untuk ditulis tangan. Bila sudah dicatat di aplikasi, poin, *service rounds*, time-out, pergantian, sanksi, dan hasil ikut terisi.
  - Tersedia juga pilihan cetak **Rincian lengkap** (2 halaman, huruf lebih besar).
- **Tim & pemain**: daftar pemain bisa langsung **ditempel dari Excel** (kolom No. dan Nama).
- **Wasit**: data wasit, penugasan per pertandingan (wasit 1, wasit 2, cadangan, pencatat, asisten pencatat, hakim garis 1–4), dan rekap jumlah tugas.
- **Jadwal & hasil**: tabel jadwal per hari dengan hasil per set dan total, yang bisa dicetak seperti dokumen jadwal Porprov.
- **Klasemen** otomatis per format, kategori (Putra/Putri), dan pool.
- **Offline**: setelah dibuka sekali lewat internet, aplikasi tetap bisa dipakai tanpa sinyal dan bisa dipasang di layar utama HP.
- **Backup & gabung data**: unduh/impor file `.json`. Setiap lapangan bisa mengirim file pertandingannya, lalu panitia menggabungkannya di satu laptop.

## Logo

- Logo PBVSI (`img/pbvsi.png`) tampil di kepala aplikasi dan di semua cetakan.
- Logo dan maskot PORPROV SULSEL XVIII/2026 (`img/porprov-2026.jpg`, `img/maskot-porprov-2026.jpg`) tampil di beranda dan cetakan bila kejuaraan memakai logo tersebut (menu **Kejuaraan → Ubah → Logo kejuaraan**). Logo kejuaraan lain bisa diunggah sendiri dari menu yang sama.
- Pastikan penggunaan logo resmi sudah seizin panitia/PBVSI bila aplikasi dibuka untuk umum.

## Cara memakai

1. **Beranda → Coba dengan data uji coba** (atau **Data → Muat data uji coba**) untuk mencoba-coba, atau langsung **Kejuaraan → + Kejuaraan**.
2. **Tim → + Tim**: isi nama, kode (mis. MRS), pool, format, kategori, daftar pemain (centang kapten/libero), dan ofisial.
3. **Wasit → + Wasit**: isi nama, lisensi, asal, dan kode asal.
4. **Jadwal & Hasil → + Pertandingan**: pilih tim A/B, lalu tugaskan wasit.
5. Klik **Scoresheet**, isi line-up sesuai lembar R-5 dan hasil undian, lalu **Mulai Set**.
   - Tekan **+1 POIN** pada tim yang memenangkan reli. Di laptop bisa juga pakai tombol panah ← / →.
   - Salah tekan? Pakai **↶ Undo** (Ctrl+Z).
6. Setelah selesai (atau sebelum bertanding untuk mencetak blanko), klik **Cetak** (ikon 🖨️ di jadwal). Di jendela cetak pilih **A4 – Landscape**, skala **100%**, lalu printer atau **Save as PDF**.

> **Penting:** data tersimpan di browser perangkat masing-masing (localStorage), *tidak* di GitHub. Rutin **unduh backup** di menu **Data**. Jangan membersihkan data browser sebelum backup.

## Menjalankan di komputer sendiri

Tidak perlu instalasi apa pun. Cukup buka `index.html` dengan Chrome/Edge. (Mode offline/PWA hanya aktif bila dibuka lewat `https://`, misalnya GitHub Pages.)

## Struktur folder

```
index.html              halaman utama
css/style.css           tampilan aplikasi
css/print.css           tampilan lembar cetak
js/engine.js            mesin aturan & perhitungan scoresheet
js/store.js             penyimpanan data di perangkat
js/ui.js                fungsi bantu tampilan
js/views/*.js           halaman-halaman (beranda, tim, wasit, jadwal, klasemen, scoresheet, cetak, data)
sw.js                   service worker (mode offline)
tests/engine.test.js    tes otomatis mesin scoresheet (jalankan: node tests/engine.test.js)
```

Setiap kali mengubah file, naikkan `VERSION` di `sw.js` (mis. `v1.0.1`) agar HP yang sudah memasang aplikasi ikut mengambil versi baru.

## Batasan versi ini

- Pergantian **libero** tidak dilacak per reli. Libero dicatat di daftar pemain dan ikut tercetak di lembar scoresheet.
- Data tidak tersinkron otomatis antarperangkat. Gunakan ekspor/impor `.json`.
- Kolom ketiga (setelah *court switch*) di formulir Pantai 4x4 baru diisi nama tim dan skor saat pindah lapangan pertama. Daftar seluruh skor pindah lapangan dan TTO dicatat di Remarks.

Panduan unggah ke GitHub dan cara membuat link aplikasi online ada di **[PANDUAN-GITHUB.md](PANDUAN-GITHUB.md)**.
