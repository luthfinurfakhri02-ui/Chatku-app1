# ChatKu v2 — Chat + Call + Kirim File

## 🎉 10 Akun Siap Pakai (buat kamu & temen-temen coba bareng)

Begitu server pertama kali nyala, otomatis dibuatkan 10 akun ini
(sudah saling ditambahkan sebagai kontak satu sama lain, jadi begitu
login langsung kelihatan semua di daftar kontak):

| Username | Password |
|----------|----------|
| budi     | chatku123 |
| siti     | chatku123 |
| andi     | chatku123 |
| dewi     | chatku123 |
| rian     | chatku123 |
| lina     | chatku123 |
| agus     | chatku123 |
| mira     | chatku123 |
| doni     | chatku123 |
| sari     | chatku123 |

Cara pakai: kamu login pakai salah satu (misal `budi`), suruh temanmu
login pakai akun lain (misal `siti`) di HP-nya masing-masing pakai
link yang sama. Langsung bisa chat, kirim file, telepon.

⚠️ Ini akun demo untuk uji coba — passwordnya sama semua dan gampang
ditebak, JANGAN dipakai untuk data penting/pribadi. Kalau sudah pasti
mau dipakai beneran, ganti password tiap akun atau daftar akun baru.

## 🔧 Perbaikan dari Versi Sebelumnya

- **Kontak sekarang permanen** — sebelumnya daftar kontak cuma
  nampilin user yang lagi online, jadi kalau temanmu logout,
  dia hilang dari daftar. Sekarang ada tombol **➕ Kontak**: masukkan
  username teman sekali, dia akan selalu muncul di daftar (dengan
  titik hijau/abu-abu penanda online/offline).
- **Auto-login diperbaiki** — sebelumnya kadang gagal auto-login
  kalau koneksi sempat putus-nyambung (ganti WiFi ke data seluler,
  dsb). Sekarang re-auth otomatis tiap kali koneksi tersambung lagi.


Login pakai **username + password** (bukan nomor HP), akun tersimpan
permanen. Bisa chat lintas HP, kirim gambar/video/dokumen/voice note,
dan video/voice call.

## 🚨 WAJIB: Cara Buka & Install (Kenapa Kemarin Gagal)

File di zip ini **BUKAN website siap pakai** — ini source code
mentah. Kalau kamu drag-drop ke Netlify Drop atau buka file
index.html langsung dari HP, **PASTI GAGAL**, karena app ini butuh
Node.js server yang nyala terus di background (buat login, chat
real-time, upload file, video call). Itu gak bisa jalan cuma dari
file HTML biasa.

**Supaya bisa dibuka & di-install, WAJIB deploy dulu ke Render:**

### Langkah Deploy ke Render (gratis)

1. Buat akun GitHub (github.com) kalau belum punya
2. Buat repository baru, upload SEMUA isi folder zip ini ke situ
   (server.js, package.json, public/, data/, dll)
3. Buat akun di https://render.com (bisa daftar pakai akun GitHub)
4. Di dashboard Render, klik **New +** → **Web Service**
5. Connect ke repo GitHub yang tadi kamu upload
6. Isi begini:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
7. Klik **Create Web Service**, tunggu 1-3 menit sampai status "Live"
8. Render kasih link, contoh: `https://chatku-punya-kamu.onrender.com`
9. **Baru setelah ada link itu**, buka di HP → daftar akun → login →
   baru muncul opsi "Install" / "Tambah ke Layar Utama" di browser

Tanpa langkah di atas, app ini TIDAK BISA dibuka maupun di-install.
Ini bukan soal filenya rusak, tapi memang butuh server aktif dulu.

## Cara Coba Chat Lintas HP

1. Buka link Render di HP A → daftar akun (misal: `budi`)
2. Buka link Render yang SAMA di HP B → daftar akun beda (misal: `siti`)
3. Di HP A, `siti` akan muncul di daftar kontak (kalau lagi online)
4. Klik → langsung bisa chat, kirim file, atau telepon

## Fitur

- ✅ Daftar akun (username + password), password ter-enkripsi
- ✅ Login otomatis (sesi tersimpan di HP)
- ✅ Chat teks real-time lintas device
- ✅ Kirim gambar & video (tombol 📎)
- ✅ Kirim dokumen apapun (PDF, Word, dll — tombol 📎)
- ✅ Rekam & kirim voice note (tombol 🎤, tekan lagi buat stop)
- ✅ Video call (tombol 🎥) & voice call (tombol 📞)
- ✅ Indikator "sedang mengetik"
- ✅ Riwayat chat tersimpan di server

## ⚠️ Keterbatasan yang Perlu Kamu Tau

1. **Video/voice call bisa gagal connect** kalau kedua HP beda
   jaringan yang "ketat" (misal beda provider seluler yang pakai
   NAT/firewall ketat). Ini BUKAN bug — panggilan WebRTC gratisan
   butuh server tambahan bernama **TURN** yang biasanya berbayar.
   Kalau gagal connect, coba di WiFi yang sama dulu untuk tes.
2. **Render free tier "tidur"** kalau gak diakses ~15 menit — nanti
   otomatis bangun lagi pas ada yang buka link (request pertama
   agak lambat ±30 detik, itu normal).
3. **File upload dibatasi 20MB** per file (bisa diubah di server.js
   kalau perlu lebih besar).
4. **Data (akun, chat, file upload) bisa hilang** kalau project di
   Render di-redeploy ulang — disk-nya bersifat sementara di tier
   gratis. Kalau butuh data yang beneran permanen selamanya, perlu
   upgrade ke database eksternal (bisa aku bantu kalau nanti perlu).
5. Semua orang yang tau link Render kamu bisa daftar akun di app
   ini — kalau mau private, jangan sebar link-nya sembarangan.

## Struktur File

```
chatku-v2/
├── server.js              ← backend (auth, chat, upload, call signaling)
├── package.json
├── data/
│   ├── users.json           ← akun tersimpan
│   └── messages.json         ← riwayat chat
├── uploads/                ← file yang dikirim user
└── public/
    ├── index.html            ← seluruh tampilan app
    ├── manifest.json
    └── img/
        ├── icon-192.png
        └── icon-512.png
```
