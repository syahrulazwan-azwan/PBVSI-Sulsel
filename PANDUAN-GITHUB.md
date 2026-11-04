# Panduan GitHub Desktop & GitHub Pages

Panduan ini memindahkan folder `scoresheet-wasit` ke GitHub, lalu membuat link aplikasi yang bisa dibuka dari HP mana pun.

## 1. Tambahkan folder ke GitHub Desktop

1. Buka **GitHub Desktop** dan pastikan sudah login (*File → Options → Accounts*).
2. Pilih **File → Add local repository…**
3. Klik **Choose…**, lalu pilih folder `scoresheet-wasit`.
4. Akan muncul pesan *"This directory does not appear to be a Git repository"*. Klik tautan **create a repository**.
5. Di jendela *Create a new repository*:
   - **Name**: `scoresheet-wasit`
   - **Description**: Scoresheet digital wasit bola voli
   - Biarkan *Git ignore* dan *License* = None (file `.gitignore` sudah tersedia).
   - Klik **Create repository**. GitHub Desktop langsung membuat *commit* pertama.

## 2. Unggah (publish) ke GitHub

1. Klik tombol **Publish repository** di bagian atas.
2. Untuk memakai GitHub Pages gratis, **hapus centang "Keep this code private"**.
   (Yang terlihat publik hanya kode aplikasinya. Data tim, pemain, dan skor tetap tersimpan di perangkat masing-masing, tidak ikut ke GitHub.)
3. Klik **Publish repository**.

## 3. Aktifkan link aplikasi (GitHub Pages)

1. Di GitHub Desktop pilih **Repository → View on GitHub**.
2. Di halaman GitHub buka **Settings → Pages**.
3. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
4. Pada **Branch**, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu 1–3 menit dan muat ulang halaman. Link aplikasi akan muncul, misalnya:
   `https://NAMA-AKUN-ANDA.github.io/scoresheet-wasit/`

## 4. Pasang di HP/tablet (bisa offline)

1. Buka link tadi di **Chrome** (Android) atau **Safari** (iPhone/iPad).
2. Android: menu **⋮ → Tambahkan ke layar utama / Instal aplikasi**.
   iPhone: tombol **Bagikan → Tambahkan ke Layar Utama**.
3. Buka aplikasinya sekali saat ada internet. Setelah itu aplikasi bisa dipakai tanpa sinyal di lapangan.

## 5. Mengubah aplikasi di kemudian hari

1. Ubah file di folder `scoresheet-wasit` (bisa dengan bantuan Claude).
2. Naikkan nomor `VERSION` di file `sw.js`, misalnya `v1.0.0` → `v1.0.1`.
3. Di GitHub Desktop, perubahan muncul di tab **Changes**. Tulis ringkasan di kolom *Summary* (misal "Perbaiki tampilan cetak"), lalu klik **Commit to main**.
4. Klik **Push origin**. Dalam 1–3 menit link GitHub Pages ikut diperbarui.

## 6. Bekerja dengan beberapa lapangan

- Tiap pencatat memakai HP/tablet sendiri dengan link yang sama.
- Panitia mengisi tim, wasit, dan jadwal di satu perangkat, lalu **Data → Unduh backup** dan mengirim file `.json` ke para pencatat (WA/Drive). Pencatat membuka **Data → Impor → Gabungkan**.
- Setelah pertandingan, pencatat membuka **Menu → Kirim data pertandingan ini (.json)** dan mengirimkannya ke panitia. Panitia mengimpornya dengan **Gabungkan**, sehingga hasil dan klasemen terkumpul.
