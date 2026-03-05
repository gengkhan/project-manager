# Panduan Deployment Backend ke Render.com

Platform **Render** adalah salah satu alternatif terbaik (dan gratis) untuk mendeploy aplikasi backend Node.js, termasuk backend proyek ini yang menggunakan Express.js, Socket.io, Node-cron, dan Baileys (WhatsApp Bot).

Berbeda dengan Vercel, Render memungkinkan aplikasi backend untuk berjalan secara persisten, sehingga fitur WebSocket dan _background job_ (cron) dapat bekerja.

Berikut adalah langkah-langkah untuk mendeploy folder `server` ke Render.com.

> [!WARNING]
> **Catatan Penting untuk Baileys (WhatsApp Web Bot)**
>
> - Pada _Free Tier_ (layanan gratis) Render, web service akan "tidur" (sleep/spin down) setelah 15 menit tanpa aktivitas HTTP. Ini akan memutuskan koneksi Socket.io dan mematikan bot WhatsApp / Cronjob.
> - Media penyimpanan file sistem (_Disk_) di Render bersifat sementara (ephemeral). Saat server mati lalu menyala lagi atau di-_deploy_ ulang, semua file yang dibuat selama _runtime_ (misalnya folder **session WhatsApp**) akan terhapus. **Ini berarti Anda mungkin harus _scan_ kode QR ulang setiap kali server _restart_**.
> - Untuk mengatasi masalah "tidur", Anda bisa mengirimkan "ping" HTTP berkala ke server Anda menggunakan layanan seperti [Cron-job.org](https://cron-job.org) atau UptimeRobot.
> - Untuk menyimpan sesi WhatsApp (`auth_info_baileys`), sangat direkomendasikan untuk menggunakan MongoDB (atau _database_ lain) secara utuh, atau ber-langganan paket berbayar Render (_Starter plan_) dengan fitur **Persistent Disk**.

## Langkah-langkah Deployment

1. Pastikan seluruh kode Anda sudah di-_commit_ dan di-_push_ ke repository GitHub (atau GitLab/Bitbucket).
2. Pergi ke [Render.com](https://render.com) dan buat akun jika belum punya.
3. Masuk ke **Dashboard Render**.
4. Klik tombol **"New"** (di sudut kanan atas) dan pilih **"Web Service"**.

### Konfigurasi Web Service di Render

Render menyediakan beberapa cara untuk terhubung ke kode Anda:

1. Hubungkan akun GitHub Anda dengan memilih opsi **"Build and deploy from a Git repository"**.
2. Klik **"Next"** dan pilih repository GitHub proyek Anda. Klik **"Connect"**.

Setelah repositori terhubung, atur konfigurasi proyek dengan sangat teliti:

- **Name**: Nama aplikasi backend Anda (misalnya: `yn-project-manager-backend`).
- **Region**: Pilih lokasi server yang paling dekat dengan pengguna Anda (misalnya Singapore).
- **Branch**: Pilih branch git yang ingin di-_deploy_ (misalnya `main`).
- **Root Directory**: Isi dengan `server`. **(Penting! Karena ini adalah monorepo dan semua kode backend ada di folder `server`)**.
- **Environment**: Pilih **`Node`**.
- **Build Command**: Isi dengan `npm install`.
- **Start Command**: Isi dengan `npm start`.

### Konfigurasi Environment Variables

Scroll ke bawah pada halaman pembuatan Web Service. Anda akan menemukan bagian **Environment Variables**. Klik **"Add Environment Variable"** untuk memasukkan nilai dari file `.env` di komputer Anda ke dalam Render.

Berikut yang biasanya harus dimasukkan:

| Key                 | Value                              | Keterangan                                    |
| :------------------ | :--------------------------------- | :-------------------------------------------- |
| `NODE_ENV`          | `production`                       | Supaya Express berjalan dalam mode produksi   |
| `PORT`              | `10000`                            | (Opsional, bawaan Render)                     |
| `MONGODB_URI`       | `mongodb+srv://...`                | (URL dari MongoDB Atlas Anda)                 |
| `JWT_SECRET`        | `rahasia_anda...`                  | Kunci rahasia JWT                             |
| `VAPID_PUBLIC_KEY`  | `...`                              | Public VAPID untuk rekayasa Push Notification |
| `VAPID_PRIVATE_KEY` | `...`                              | Private VAPID                                 |
| `CONTACT_EMAIL`     | `email_sistem@gmail.com`           |                                               |
| `CORS_ORIGIN`       | `https://frontend-anda.vercel.app` | URL Frontend (Vercel)                         |

_(Salin isi `server/.env` ke dalam environment variables di Render)._

### Menjalankan Deployment

1. Setelah semua rincian benar, _scroll_ ke paling bawah dan klik tombol **"Create Web Service"**.
2. Render akan mulai menarik (_pull_) repositori Anda, menginstal dependensi (menggunakan `npm install`), dan menjalankan server dengan perintah `npm start`.
3. Anda bisa memantau "Log" proses _building_ dan _starting_. Terkadang butuh waktu beberapa menit untuk penyelesaian.
4. Ketika label sebelah kiri atas berubah menjadi **"Live"**, layanan Anda berhasil aktif!
5. Salin URL publik bawaan Render (contoh: `https://yn-project-manager-backend-xxxx.onrender.com`).

## Menghubungkan Frontend ke Backend Render

Setelah backend menyala di Render, Anda perlu mengubah variabel URL di frontend.

1. Buka _dashboard_ **Vercel** proyek frontend Anda.
2. Pergi ke **Settings** > **Environment Variables**.
3. Edit nilai `NEXT_PUBLIC_API_URL` menjadi URL publik Render yang baru saja Anda salin (contoh: `https://yn-project-manager-backend-xxxx.onrender.com`).
4. Buka tab **"Deployments"** di Vercel dan lakukan **Redeploy** (dengan opsi "Redeploy with existing build cache" jika tidak ingin _build_ ulang) supaya alamat URL backend di-_inject_ ke aplikasi Node ter-build.

---

## Troubleshooting Masalah Umum di Render

- **Error "Cannot read properties of undefined (reading '...')"**: Biasanya error ini muncul saat _connecting_ ke database karena variabel di _Environment Variables_ ada yang tertinggal (`MONGODB_URI`, dsb).
- **Error "Port in Use"**: Jangan mengatur kode `app.listen(8000)` secara mati; gunakan `process.env.PORT || 8000` di dalam `server/index.js` agar port dapat dikendalikan otomatis oleh Render.
- **CORS Error pada Frontend**: Pastikan variabel `CORS_ORIGIN` yang terpasang di Render adalah benar (alamat dari frontend Anda tanpa ada _trailing slash_ `/` di belakang). Selipkan alamat `http://localhost:3000` dalam daftar _whitelist_ CORS apabila Anda men-develop secara lokal tetapi memanggil API di production server.
- **Whatsapp Bot Meminta Scan QR Terus**: Seperti di catatan peringatan awal, saat Render melakukan restart instance (dalam free tier), disk storage ephemeral dihancurkan dan folder `session` atau _auth state_ `baileys` yang menyimpan _kredensial login_ ikut terhapus. Solusi paling jitu adalah memastikan status otentikasi bot tersimpan di pangkalan data (contohnya di package terpisah yang mem-backup state ke dalam MongoDB).
