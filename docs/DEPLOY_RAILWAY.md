# Panduan Deployment Backend ke Railway.app

**Railway.app** (sering disebut hanya Railway) merupakan salah satu platform PaaS (Platform as a Service) yang sangat populer, intuitif, dan kuat untuk mendeploy aplikasi backend Node.js.

Sama seperti Render, Railway mengizinkan koneksi persisten seperti WebSocket (Socket.io) dan background process (Node-cron), menjadikannya kandidat yang sangat baik untuk backend proyek ini. Menariknya, Railway sering kali dianggap lebih cepat dalam proses deployment dibandingkan Render.

> [!NOTE]
> **Kelebihan Railway dibanding Render (Tier Dasar)**
>
> - Storage lebih fleksibel. Railway juga memiliki fitur menambahkan "Volume" (Persistent Storage) yang akan sangat membantu untuk menyimpan _session authentication_ dari Baileys (WhatsApp Bot) agar tidak hilang saat aplikasi direstart/dideploy ulang.
> - Proses integrasi variabel dari banyak servis (seperti Redis, Postgres, MongoDB) ke Node.js App sangat mulus menggunakan fitur variables Railway.

Berikut adalah langkah-langkah untuk mendeploy folder `server` dari proyek monorepo ini ke Railway.app.

## Persiapan & Syarat

1. Anda harus memiliki akun di [Railway.app](https://railway.app/).
2. Anda harus memiliki akun GitHub/GitLab dan sudah melakukan push semua pembaruan aplikasi Anda ke dalam repositori.

## Langkah-langkah Deployment

1. Masuk ke Dashboard [Railway.app](https://railway.app/dashboard).
2. Klik tombol **"New Project"**.
3. Pilih **"Deploy from GitHub repo"**.
4. Jika ini pertama kalinya, Railway akan meminta izin otorisasi (_authorization_) untuk mengakses akun GitHub Anda. Izinkan akses tersebut ke repositori proyek Anda (`yn-project-manager`).
5. Pilih repositori proyek Anda tersebut dari daftar yang muncul.
6. Klik tombol **"Deploy Now"**.
   _(Catatan: Jangan panik jika deployment pertama ini GAGAL. Ini sangat wajar karena Railway akan mencoba menjalankan keseluruhan monorepo (termasuk folder client), sedangkan kita hanya ingin mendeploy folder `server`)._

### Konfigurasi Root Directory (Penting untuk Monorepo)

Railway secara default akan menganggap aplikasi berada di root folder github Anda. Kita harus mengaturnya agar fokus ke folder `server` saja.

1. Di dalam Dashboard proyek Railway yang baru saja dibuat, klik kotak service Anda (biasanya bernama sama dengan nama repositori GitHub).
2. Pilih tab **"Settings"**.
3. Temukan pengaturan **"Root Directory"** di bawah sub-menu **"Build"** atau **"General"**.
4. Ubah nilai **"Root Directory"** dari `/` menjadi `/server`.
5. Klik tanda centang (✓) untuk menyimpan konfigurasi tersebut.

### Konfigurasi Commands (Start & Build)

Masih di dalam tab **"Settings"** dari service yang sama:

1. Di bagian **"Build Command"**, ketik: `npm install` (Railway biasa menjalankan `npm run build` otomatis jika ketemu di project, tapi kita hanya butuh install deps di backend).
2. Di bagian **"Start Command"**, ketik: `node index.js` atau `npm start`.

### Konfigurasi Environment Variables

Beralihlah ke tab **"Variables"** di panel konfigurasi service tersebut. Anda perlu menyalin nilai-nilai dari file `.env` sistem Anda ke Railway.

Berikut adalah daftar _variables_ yang sangat penting dimasukkan:

| Variable Name       | Value                                     | Keterangan                                                                         |
| :------------------ | :---------------------------------------- | :--------------------------------------------------------------------------------- |
| `NODE_ENV`          | `production`                              | (Standar environment backend)                                                      |
| `PORT`              | `10000`                                   | (Railway akan otomatis menyediakan PORT, tapi disarankan membuat fallback default) |
| `MONGODB_URI`       | `mongodb+srv://...`                       | (URL Koneksi ke MongoDB cluster Anda)                                              |
| `JWT_SECRET`        | `rahasia_anda...`                         | Kunci otentikasi JWT Anda                                                          |
| `VAPID_PUBLIC_KEY`  | `...`                                     | Public VAPID untuk Push Notification                                               |
| `VAPID_PRIVATE_KEY` | `...`                                     | Private VAPID                                                                      |
| `CONTACT_EMAIL`     | `email_sistem@gmail.com`                  |                                                                                    |
| `CORS_ORIGIN`       | `https://frontend-vercel-anda.vercel.app` | URL Web Frontend Anda                                                              |

_(Catatan: Railway juga menyediakan tombol **"RAW Editor"** di bagian variables, di mana Anda bisa langsung melakukan Copy-Paste keseluruhan isi `.env` Anda tanpa perlu menambahkan satu per satu)._

### Generate / Tambahkan Domain Publik

Secara asali, Railway belum memberikan URL publik yang menghubungkan aplikasi Anda ke internet.

1. Buka kembali tab **"Settings"**.
2. Scroll ke bawah cari opsi **"Networking"** atau **"Domains"**.
3. Klik tombol **"Generate Domain"**.
4. Railway akan otomatis membuatkan domain berakhiran `.up.railway.app`. Anda juga bisa melampirkan _Custom Domain_ (domain Anda sendiri) nantinya di sini.
5. Salin domain sementara ini (misal: `https://ynpm-backend-production.up.railway.app`).

### Memicu Ulang Deployment (Redeploy)

Karena pengaturan direktori diubah setelah rilis pertama (yang biasanya gagal tadi), Anda perlu mengerakkan update ulang:

1. Pergi ke tab **"Deployments"**.
2. Pada pojok kanan atau bagian deployment terbaru, cari dan klik tiga titik atau tombol ikon refresh.
3. Pilih **"Redeploy"**.
4. Tunggu beberapa menit hingga proses _Build_ dan _Deploy_ memunculkan status label hijau **"SUCCESS"**.

---

## Solusi untuk Session Baileys (WhatsApp Bot)

Agar saat backend Railway diperbarui WhatsApp Anda tidak ter-_logout_ (meminta scan QR barcode ulang terus), Anda **TIDAK** bisa mengandalkan memori lokal folder biasa `/server/auth_info_baileys` (seperti saat development lokal). Hal ini karena Railway membuang data memori _non-persistent_ setiap kali ia merilis (_deploy_) ulang container aplikasinya.

**Cara Memperbaikinya menggunakan Volumes (Persistent Storage) di Railway:**

1. Masuk ke dasbor Service backend Anda, masuk ke **Settings**.
2. Cari bagian **"Volumes"**.
3. Klik **"Create Volume"**.
4. Isi **Mount Path**-nya dengan: `/app/server/auth_info_baileys` (pastikan path ini tepat secara absolut di dalam sistem kontainer agar bot Baileys membaca dan menyimpan sessinya di storage volume tersebut).
5. Deploy ulang backend.
   Kini, info session WhatsApp akan tertanam aman di "Drive/Volume" khusus buatan Railway dan tahan terhadap restart server.

---

## Update Frontend di Vercel

Selesai konfigurasi Railway, jangan lupa mengubah tujuan pengiriman API di frontend.

1. Masuk Vercel, ke dashboard frontend proyek.
2. Ke menu **"Settings"** > **"Environment Variables"**
3. Ganti konfigurasi `NEXT_PUBLIC_API_URL` dengan salinan domain dari tahap **Generate Domain** tadi (`https://[domain-railway-tadi].up.railway.app`).
4. Buka tab **"Deployments"** lalu jalankan **Redeploy**.
