# Hosting Gratis Tambahan untuk Node.js

Selain Render dan Railway, terdapat beberapa platform cloud hosting alternatif lain yang masih menawarkan akses gratis (Free Tier) yang cocok untuk mendeploy backend aplikasi Node.js.

Harap diingat, backend Anda membutuhkan dukungan untuk **WebSockets (Socket.io)** dan **Background Jobs (node-cron/Baileys)**. Hal ini berarti kita harus menggunakan PaaS (Platform as a Service) yang mengizinkan proses berjalan terus-menerus (long-running process), BUKAN arsitektur _Serverless/Functions_ seperti Vercel, Netlify, atau Cloudflare Workers.

Berikut adalah beberapa alternatif PaaS gratis:

## 1. Fly.io

Fly.io diklaim sangat cepat dan tangguh. Ini mendistribusikan aplikasi secara global (Edge) tetapi pada lapis kontainer.

- **Free Tier**: 3 node berukuran RAM 256MB, 3GB Persistent Volume (sangat berguna untuk SQLite atau menyimpan Sesi bot Baileys WhatsApp).
- **Pros**: Performa luar biasa cepat jika Anda menyasar region spesifik (misalnya Singapura/Asia), mendukung Docker natively, dan **memberikan storage persisten gratis!** (Sangat direkomendasikan karena storage persistent ini dibutuhkan bot Baileys).
- **Cons**:
  - Proses deploy-nya tidak semudah sambung GitHub-lalu-Deploy (seperti Render/Railway). Anda harus menginstal Fly CLI (`flyctl`) di terminal komputer Anda dan membuat file `fly.toml` serta (terkadang) `Dockerfile`.
  - Wajib mendaftarkan kartu kredit/debit VISA/Mastercard untuk verifikasi mesin anti-abuse (walaupun gratis dan tidak akan ditagih sebelum Anda upgrade mandiri).

## 2. Koyeb

Koyeb adalah salah satu pendatang di dunia serverless cloud hosting global yang performanya sering diabanding-bandingkan dengan Render/Railway.

- **Free Tier**: 1 Service Node (RAM 512MB, CPU 0.1 vCPU), yang mana cukup besar dari segi RAM dibandingkan saingannya, dan bandwidth 5GB sebulan.
- **Pros**: RAM gratis yang diberikan lebih lega (512MB) dan cocok untuk library node berat. Auto-connect dari GitHub juga didukung dengan gampang (serupa dengan Render).
- **Cons**: Sama seperti Render, instances gratis di Koyeb punya status ephemeral disk sehingga setiap update deploy aplikasi, folder session whatsapp (baileys) berpotensi hilang.

## 3. Adaptable.io

Alternatif modern lain yang berfokus ke kesederhanaan deployment aplikasi backend via GitHub.

- **Free Tier**: RAM 256 MB. Termasuk _Free PostgreSQL_ / _MongoDB_ di tier gratis.
- **Pros**: deployment mulus dari repo git. Disertakan fasilitas integrasi ke database mereka dengan lancar (walau Anda sudah menggunakan MongoDB Atlas).
- **Cons**: _Instances_ "ditidurkan" / di _sleep_ oleh sistem persis mirip kebijakan Render jika tak ada traffic masuk sehingga bot Anda akan kesusahan tetap aktif 24 jam nonstop tanpa trigger HTTP ping eksternal (seperti cron-job.org). Disk juga ephemeral.

## 4. Google Cloud Platform (GCP) - Compute Engine Free Tier

GCP menawarkan virtual private server (VPS/VM Linux utuh) 1 buah selamanya (Always Free). Namanya adalah instance Linux VM **e2-micro**.

- **Free Tier**: 1 buah VM e2-micro, 30GB Standard HDD. Traffic keluar (egress) bulanan standar. (Bebas dari mode sleep/ephemeral disk!).
- **Pros**:
  - **Paling ideal** karena ini adalah server "utuh".
  - Disk bukan _ephemeral_ alias permanen sehingga folder session WA / _auth state Baileys_ 100% aman terjamin dari _restart_. Tak pernah _sleep_/tidur.
  - Aplikasi socket.io dan cron-job dapat menyala konstan 24 jam.
- **Cons**:
  - Sangat rumit bagi pemula. Tidak ada auto-deployment dari GitHub yang praktis. Anda harus mengkonfigurasikan server secara manual persis seperti beli VPS (Install Node.js, konfig Nginx Reverse proxy, sertifikat SSL Let's Encrypt, PM2 untuk menjalankan node.js background).
  - Verifikasi memerlukan pengikatan CC / Debit pada Billing awal.

## Kesimpulan / Rekomendasi Terakhir

Dari daftar di atas untuk jenis project Anda (Next.js + Express + integrasi Baileys WhatsApp yang butuh file system persisten untuk sesi):

1.  **Jika ingin UI yang Super Praktis/Gampang Tapi Gratis**: Tetap pertahankan Render.com atau Railway.app, namun ubah strategi penyimpanan sesi WA (_Auth State_). Simpan di _database_ cloud (seperti integrasikan Bailey's Auth dengan koleksi MongoDB secara kustom, bukan ditaruh di dalam folder file server `.json`).
2.  **Jika ingin Serius namun tetap Gratis 100% dan Siap Belajar (_Learning Curve_ Tinggi)**: Manfaatkan **Google Cloud (VM e2-micro)** untuk backend Anda (install manual PM2, dsb). Disk di GCP adalah permanen, node tidak pernah tidur.
3.  **Pertengahan (Persisten dan Gratis tapi harus CLI)**: Gunakan **Fly.io**. Mereka memiliki fitur "Fly Volumes" gratisan hingga 3GB, jadi Anda tidak akan kehilangan file `session` whatsapp lagi.
