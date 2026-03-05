# Panduan Deployment ke Vercel

Proyek ini memiliki struktur monorepo yang terdiri dari dua bagian utama:

- `client`: Aplikasi frontend menggunakan Next.js.
- `server`: Aplikasi backend menggunakan Express.js, Socket.io, Node-cron, dan Baileys (WhatsApp Bot).

Vercel adalah platform yang sangat direkomendasikan dan dioptimalkan untuk men-deploy aplikasi **Next.js (`client`)**.

> [!WARNING]
> **Penting Mengenai Backend (`server`)**
> Vercel menggunakan lingkungan arsitektur _Serverless Functions_. Arsitektur ini **TIDAK MENDUKUNG** koneksi persisten seperti WebSockets (`Socket.io`) yang aktif terus-menerus, _background jobs_ (`node-cron`), atau bot WhatsApp yang selalu berjalan (`baileys`). Oleh karena itu, **backend/server tidak bisa di-deploy ke Vercel**. Backend harus di-deploy ke platform berbasis VPS, kontainer, stateful apps, atau Platform-as-a-Service (PaaS) seperti **Render, Railway, DigitalOcean App Platform, atau AWS EC2**.

Berikut adalah langkah-langkah untuk mendeploy aplikasi frontend (`client`) ke Vercel.

## Persiapan Sebelum Deployment

1. **Pastikan Backend Sudah Di-deploy**: Sebelum men-deploy frontend, pastikan backend (`server`) Anda sudah berjalan dan dapat diakses publik melalui URL (misalnya `https://api.domainanda.com`).
2. **Push ke GitHub**: Pastikan seluruh kode terbaru termasuk dalam folder `client` sudah di-push ke repository GitHub, GitLab, atau Bitbucket Anda.

## Langkah-langkah Deployment Frontend (Client) di Vercel

1. Buka dan login ke dashboard [Vercel](https://vercel.com/dashboard).
2. Klik tombol **"Add New..."** dan pilih **"Project"**.
3. Hubungkan akun GitHub Anda dan pilih repository proyek ini (misal: `yn-project-manager`). Klik **"Import"**.

### Konfigurasi Proyek

Pada halaman konfigurasi _Configure Project_, atur pengaturan berikut dengan _tepat_:

- **Project Name**: Masukkan nama proyek Anda (misal: `yn-project-manager-client`).
- **Framework Preset**: Pilih **`Next.js`**.
- **Root Directory**: Klik tulisan `Edit` lalu pilih folder **`client`** sebagai root directory. Ini sangat penting karena Vercel perlu tahu bahwa aplikasi Next.js berada di dalam folder ini, bukan di root repository.
- **Build and Output Settings** (Bisa dibiarkan default, tapi pastikan seperti berikut):
  - **Build Command**: `next build`
  - **Output Directory**: `.next`
  - **Install Command**: `npm install` (atau dibiarkan kosong, Vercel otomatis menggunakan npm)

### Konfigurasi Environment Variables

Buka bagian **Environment Variables** dan tambahkan variabel environment yang dibutuhkan oleh frontend Anda.

Biasanya, Anda harus memasukkan URL dari backend yang telah di-deploy:

| Name                  | Value                                                       |
| :-------------------- | :---------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api.domainanda.com` (Ubah dengan URL backend Anda) |

_(Tambahkan environment variable lain yang ada di `.env` frontend Anda ke pengaturan ini)_

### Deploy

1. Setelah semua konfigurasi selesai dan environment variable sudah dimasukkan, klik tombol **"Deploy"**.
2. Tunggu proses instalasi _dependencies_ dan _build_ hingga selesai (biasanya memakan waktu 1-3 menit).
3. Setelah berhasil, Anda akan diarahkan ke halaman _Congratulations_ dan mendapatkan URL publik aplikasi frontend Anda (misal: `https://yn-project-manager.vercel.app`).

## Troubleshooting (Jika Terjadi Error)

- **Error saat Build**: Jika terjadi error saat proses build, buka tab **"Deployments"** di Vercel, lalu klik pada deployment yang gagal untuk melihat log error-nya. Pastikan tidak ada pesan error di terminal komputer Anda saat menjalankan perintah `npm run build` di folder `client`.
- **API Tidak Terhubung/CORS Error**: Pastikan variabel `NEXT_PUBLIC_API_URL` dimasukkan dengan benar dan tidak diakhiri dengan tanda garis miring slash (`/`). Pastikan juga _Base URL_ frontend Anda sudah diizinkan (Whitelisted) di konfigurasi `cors` backend Anda (`server`).
- **Fitur Real-time (Socket.io) Tidak Jalan**: Hal ini terjadi karena frontend mencoba menyambung ke WebSocket URL yang salah, pastikan `NEXT_PUBLIC_API_URL` tepat.

## Ringkasan Server Deployment Alternatif

Untuk `server`, Anda dapat mendeploynya ke:

1. [Render.com](https://render.com) (Pilih opsi "Web Service" dengan Docker atau Node Node.js native).
2. [Railway.app](https://railway.app).
3. VPS Mandiri dengan Reverse Proxy menggunakan Nginx + PM2 atau Docker.
