# 🗂️ Project Management WebApp

## Product Plan — Complete Documentation

---

> Platform manajemen proyek kolaboratif berbasis web yang menyatukan pengelolaan task, event, brainstorming visual, activity log, dan notifikasi real-time dalam satu aplikasi terpadu. Dirancang untuk tim kecil hingga menengah yang membutuhkan tools fleksibel, terhubung, dan mudah digunakan.

---

## 📋 Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Struktur Navigasi](#struktur-navigasi)
3. [Modul 1 — Kelola Workspace](#modul-1--kelola-workspace)
4. [Modul 2 — Kelola Event](#modul-2--kelola-event)
5. [Modul 3 — Kelola User](#modul-3--kelola-user)
6. [Modul 4 — Kelola Task](#modul-4--kelola-task)
7. [Modul 5 — Brainstorming Board](#modul-5--brainstorming-board)
8. [Fitur Pendukung](#fitur-pendukung)
9. [Pengalaman Mobile](#pengalaman-mobile)
10. [Alur Pengguna](#alur-pengguna)
11. [Rencana Pengembangan](#rencana-pengembangan)
12. [Ringkasan Fitur](#ringkasan-fitur)

---

## Gambaran Umum

### Visi Produk

Menjadi platform manajemen proyek yang tidak hanya mengorganisir pekerjaan, tetapi juga memfasilitasi kolaborasi ide secara visual dan menjaga seluruh anggota tim tetap terhubung dan terinformasi secara real-time — di mana pun mereka berada.

### Nilai Utama

**Satu Platform, Semua Kebutuhan Tim**
Dari perencanaan event, pembagian task, hingga sesi brainstorming — semua terjadi di satu tempat tanpa perlu berpindah aplikasi.

**Koneksi Antar Data**
Task bisa dihubungkan ke Event. Kalender dan Kanban berbagi data yang sama. Widget di Brainstorming bisa merujuk ke Task yang nyata. Semua saling terhubung.

**Kolaborasi Real-time**
Perubahan yang dilakukan satu anggota tim langsung terlihat oleh anggota lain tanpa perlu refresh halaman.

**Notifikasi yang Tepat Sasaran**
Mention user di mana pun akan memicu notifikasi in-app dan pesan WhatsApp langsung ke orang yang bersangkutan.

---

## Struktur Navigasi

Aplikasi memiliki dua level navigasi utama.

### Navigasi Global (Sidebar Kiri)

Tersedia setelah user masuk ke dalam sebuah workspace:

- **Dashboard** — Ringkasan aktivitas dan overview workspace
- **Event** — Daftar semua event di workspace
- **Task — Kanban** — Tampilan papan kanban
- **Task — Kalender** — Tampilan kalender task dan event
- **Brainstorming** — Daftar dan akses board brainstorming
- **Activity Log** — Riwayat semua aktivitas workspace
- **Pengaturan Workspace** — Kelola member, role, dan preferensi

### Navigasi Atas (Topbar)

- Notifikasi (bell icon dengan badge counter)
- Profil pengguna dan pengaturan akun
- Pilihan workspace (jika user tergabung di lebih dari satu)

---

## Modul 1 — Kelola Workspace

### Deskripsi

Workspace adalah container utama yang menampung semua Event, Task, User, dan Board Brainstorming. Satu user bisa tergabung di banyak workspace sekaligus.

### Halaman & Fitur

#### Daftar Workspace

Halaman awal setelah login jika user belum memilih workspace aktif. Menampilkan semua workspace yang diikuti user beserta nama, logo, jumlah member, dan jumlah task aktif.

#### Buat Workspace Baru

Form sederhana untuk membuat workspace baru: nama workspace, deskripsi singkat, dan upload logo (opsional).

#### Pengaturan Workspace

Halaman yang hanya bisa diakses oleh Owner dan Admin:

- Ubah nama, deskripsi, dan logo workspace
- Atur visibilitas workspace (privat atau bisa ditemukan)
- Hapus workspace (hanya Owner, dengan konfirmasi ulang)

#### Manajemen Member

- Undang member baru via email atau tautan undangan unik
- Lihat daftar semua member beserta role masing-masing
- Ubah role member (Owner, Admin, Member, Guest)
- Keluarkan member dari workspace

### Sistem Role & Izin

| Aksi                             | Owner | Admin | Member | Guest |
| -------------------------------- | :---: | :---: | :----: | :---: |
| Hapus workspace                  |  ✅   |  ❌   |   ❌   |  ❌   |
| Kelola member & role             |  ✅   |  ✅   |   ❌   |  ❌   |
| Buat & hapus Event               |  ✅   |  ✅   |   ✅   |  ❌   |
| Buat & hapus Task                |  ✅   |  ✅   |   ✅   |  ❌   |
| Buat & edit Widget Brainstorming |  ✅   |  ✅   |   ✅   |  ❌   |
| Lihat semua konten               |  ✅   |  ✅   |   ✅   |  ✅   |
| Komentar & Mention               |  ✅   |  ✅   |   ✅   |  ❌   |

---

## Modul 2 — Kelola Event

### Deskripsi

Event merepresentasikan sebuah proyek, milestone, atau acara penting dalam workspace. Event bisa memiliki task-task yang terhubung padanya, serta dilengkapi dengan fitur spreadsheet internal yang fleksibel untuk kebutuhan pencatatan dan perencanaan.

### Halaman & Fitur

#### Daftar Event

Tampilan semua event dalam workspace dengan informasi: nama event, tanggal mulai dan selesai, status (Upcoming / Ongoing / Completed), jumlah task yang terhubung, warna label, dan peserta yang di-assign.

Filter tersedia berdasarkan: status event, rentang tanggal, dan anggota yang terlibat.

#### Detail Event

Halaman detail event dibagi menjadi beberapa tab:

**Tab Overview**
Menampilkan informasi lengkap event: judul, deskripsi panjang (dengan dukungan format teks), tanggal mulai dan selesai, warna label, daftar peserta, dan status event saat ini.

**Tab Task Terkait**
Menampilkan semua task yang di-assign ke event ini dalam tampilan list atau mini kanban. Task bisa dibuat langsung dari tab ini dan otomatis terhubung ke event tersebut.

**Tab Spreadsheet**
Fitur spreadsheet internal yang bisa digunakan secara bebas oleh tim untuk kebutuhan apapun yang relevan dengan event — misalnya rundown acara, daftar vendor, anggaran, checklist persiapan, dan sebagainya.

**Tab Activity**
Riwayat semua perubahan yang terjadi pada event ini: siapa yang mengubah apa, kapan, beserta detail perubahan.

### Fitur Spreadsheet Event (Detail)

Setiap event memiliki spreadsheet dengan kemampuan:

**Multi-Sheet**
Satu event bisa memiliki beberapa sheet sekaligus, diakses via tab di bawah area spreadsheet. Sheet bisa diberi nama, ditambah, diduplikasi, dan dihapus.

**Tipe Kolom yang Tersedia**
Setiap kolom bisa diatur tipenya secara individual:

- **Teks** — Input teks bebas
- **Angka** — Nilai numerik dengan format opsional (mata uang, desimal)
- **Tanggal** — Date picker
- **Checkbox** — Status centang/tidak
- **Dropdown** — Pilihan dari daftar opsi yang bisa dikustomisasi
- **User** — Assign member workspace dari dropdown
- **URL** — Link yang bisa diklik
- **Formula Sederhana** — Mendukung SUM, AVERAGE, COUNT, MIN, MAX

**Manajemen Kolom & Baris**

- Tambah, hapus, dan rename kolom
- Reorder kolom via drag & drop
- Tambah dan hapus baris
- Resize lebar kolom

**Filter & Pengurutan**
Setiap kolom bisa difilter dan diurutkan (ascending/descending).

**Komentar per Cell**
Setiap cell bisa diberi komentar thread, berguna untuk diskusi spesifik tentang data di cell tersebut.

**Kolaborasi Real-time**
Perubahan pada spreadsheet langsung terlihat oleh semua user yang sedang membuka sheet yang sama.

**Export Sheet**
Ekspor satu sheet atau semua sheet ke format CSV atau Excel (.xlsx).

### Relasi Event & Task

Task bisa dihubungkan ke sebuah event, namun sifatnya opsional. Task yang terhubung ke event akan:

- Muncul di Tab Task Terkait pada halaman detail event
- Ditampilkan dengan warna label event di tampilan Kalender
- Bisa difilter berdasarkan event di tampilan Kanban

---

## Modul 3 — Kelola User

### Deskripsi

Halaman untuk mengelola semua aspek user dalam workspace — dari profil, role, hingga riwayat aktivitas.

### Halaman & Fitur

#### Daftar Member Workspace

Tabel semua member aktif dalam workspace beserta: foto profil, nama, email, role, status online/offline, tanggal bergabung, dan ringkasan aktivitas terakhir.

#### Profil User

Setiap user memiliki halaman profil yang menampilkan:

- Foto profil dan informasi dasar (nama, email)
- Nomor WhatsApp (digunakan untuk notifikasi)
- Daftar workspace yang diikuti
- Ringkasan kontribusi: jumlah task selesai, task aktif, event yang diikuti
- Riwayat aktivitas milik user tersebut

#### Pengaturan Akun (Milik Sendiri)

Halaman yang bisa diakses setiap user untuk mengatur akun pribadinya:

- Ubah nama dan foto profil
- Ubah nomor WhatsApp
- Atur preferensi notifikasi per tipe (in-app dan WhatsApp bisa diatur terpisah)
- Ubah password

#### Undang Member

Form untuk mengundang user baru ke workspace:

- Input email satu per satu atau bulk (pisah dengan koma atau baris baru)
- Pilih role yang akan diberikan saat bergabung
- Pesan undangan opsional
- Atau salin tautan undangan untuk dibagikan langsung

---

## Modul 4 — Kelola Task

### Deskripsi

Modul Task adalah inti dari manajemen pekerjaan sehari-hari. Task bisa dilihat dalam dua tampilan yang berbeda namun berbagi satu sumber data: Kanban Board dan Kalender. Perubahan di salah satu tampilan otomatis terefleksi di tampilan lainnya.

### Struktur Data Task

Setiap task memiliki informasi berikut:

- **Judul** — Nama singkat task
- **Deskripsi** — Penjelasan detail dengan format teks kaya (bold, italic, list, mention user)
- **Status** — Kolom/stage saat ini (dikustomisasi per workspace)
- **Assignee** — Satu atau lebih member yang bertanggung jawab
- **Start Date** — Tanggal mulai pengerjaan
- **Due Date** — Batas waktu pengerjaan
- **Prioritas** — Low, Medium, High, atau Critical
- **Label/Tag** — Kategorisasi bebas dengan warna
- **Event** — Relasi ke sebuah event (opsional)
- **Subtask** — Daftar task kecil di dalam task ini
- **Lampiran** — File atau gambar yang diunggah
- **Komentar** — Thread diskusi (lihat bagian Comment Thread)

### Tampilan Kanban Board

#### Papan & Kolom

Tampilan berbasis kolom yang merepresentasikan tahapan pengerjaan. Kolom default: To Do, In Progress, Review, Done — namun bisa sepenuhnya dikustomisasi:

- Tambah kolom baru dengan nama custom
- Rename dan hapus kolom
- Reorder kolom via drag & drop
- Atur warna per kolom

#### Kartu Task

Setiap task ditampilkan sebagai kartu yang menampilkan: judul, assignee (avatar), due date, prioritas (warna indikator), label, badge event jika terhubung ke event, dan jumlah komentar/subtask.

Kartu bisa dipindahkan antar kolom dengan drag & drop.

#### Filter & Pencarian

Filter task berdasarkan: event yang terhubung, assignee, label/tag, prioritas, rentang due date, dan kata kunci judul.

#### Detail Task

Klik kartu untuk membuka panel detail task di sisi kanan (atau halaman penuh di mobile) yang menampilkan semua informasi task dan memungkinkan pengeditan langsung.

### Tampilan Kalender

#### Konten yang Ditampilkan

- Task yang memiliki due date ditampilkan pada tanggal batas waktunya
- Event workspace ditampilkan dengan warna label eventnya
- Task yang terhubung ke event menggunakan warna event tersebut, berbeda dari task biasa

#### Mode Tampilan

- **Bulanan** — Overview satu bulan penuh
- **Mingguan** — Detail satu minggu dengan slot waktu
- **Harian** — Fokus satu hari

#### Interaksi

- Klik tanggal kosong untuk membuat task baru dengan due date otomatis diisi
- Klik event/task di kalender untuk membuka detail
- Extend task di kalender untuk mengubah start date dan due date-nya
- Drag task di kalender untuk mengubah due date-nya
- Toggle filter: tampilkan semua, per event, atau event saja

---

## Modul 5 — Brainstorming Board

### Deskripsi

Halaman canvas bebas tanpa batas (infinite canvas) yang bisa diisi dengan berbagai jenis widget. Digunakan untuk sesi brainstorming, perencanaan visual, pemetaan ide, dan kolaborasi kreatif tim.

### Daftar Board

Halaman yang menampilkan semua board brainstorming dalam workspace. Setiap board memiliki nama, thumbnail preview, tanggal terakhir diubah, dan pembuat. Board bisa dibuat, diduplikasi, dan dihapus.

### Canvas

#### Navigasi Canvas

- **Pan** — Klik dan drag area kosong untuk menggeser tampilan
- **Zoom** — Scroll mouse atau pinch gesture untuk zoom in/out
- **Fit to Screen** — Tombol untuk menyesuaikan tampilan ke semua widget yang ada
- **Minimap** — Peta kecil di sudut untuk orientasi posisi dalam canvas

#### Manajemen Widget

Semua widget di canvas mendukung operasi berikut:

- **Drag & Drop** — Pindahkan widget ke posisi manapun di canvas
- **Resize** — Ubah ukuran dengan menarik handle di sudut dan tepi widget
- **Layering** — Bring to Front, Send to Back, Bring Forward, Send Backward
- **Lock** — Kunci posisi widget agar tidak tidak bergeser
- **Collapse/Expand** — Ringkas widget menjadi header saja
- **Hapus** — Hapus widget dari canvas

### Tipe Widget

#### Widget Task

Menampilkan task dalam format mini kanban atau daftar. Data terhubung langsung ke modul Task utama — task yang diubah dari sini akan terupdate di Kanban dan Kalender, dan sebaliknya.

Bisa difilter untuk menampilkan task dari event tertentu, assignee tertentu, atau label tertentu.

#### Widget Diagram

Diagram freeform untuk memetakan ide, alur, dan hubungan secara visual — terinspirasi dari Draw.io dan FigJam. Fitur:

- Letakkan berbagai bentuk (rectangle, ellipse, diamond, sticky note, dll.) di mana saja
- Hubungkan node secara bebas ke segala arah dengan garis koneksi
- Beri label pada koneksi, atur gaya garis, warna, dan arah panah
- Ubah warna, bentuk, dan ukuran node
- Tambahkan ikon pada node
- Double-klik node untuk edit teks

#### Widget Gambar

Menampilkan gambar di canvas. Bisa diisi dengan:

- Upload file gambar dari perangkat
- Embed gambar dari URL
- Tambah caption di bawah gambar

#### Widget Teks (WYSIWYG)

Editor teks kaya dengan kemampuan format lengkap:

- Bold, italic, underline, strikethrough
- Heading (H1, H2, H3)
- Bullet list dan numbered list
- Tabel sederhana
- Highlight teks dengan warna
- Mention user dengan `@` (memicu notifikasi)

---

## Fitur Pendukung

### Mention User (@mention)

Sistem mention yang konsisten di seluruh aplikasi. Ketik `@` di mana pun teks bisa ditulis, dan dropdown akan muncul menampilkan daftar member workspace untuk dipilih.

**Lokasi yang mendukung mention:**

- Deskripsi task
- Komentar dan reply di task
- Komentar cell spreadsheet event
- Widget Teks di brainstorming
- Widget Task di brainstorming (bagian komentar)

**Efek mention:**

- User yang di-mention menerima notifikasi in-app segera
- User yang di-mention menerima pesan WhatsApp (jika diaktifkan)
- Nama yang di-mention menjadi tautan yang bisa diklik untuk melihat profil user

---

### Comment Thread & Reaction

Sistem komentar yang kaya dan mendukung diskusi terstruktur.

#### Struktur Komentar

- **Komentar utama** — Tulis komentar baru di bawah thread
- **Reply** — Balas komentar spesifik, ditampilkan nested satu level di bawah komentar yang dibalas
- **Edit komentar** — Penulis bisa mengedit komentarnya sendiri (ditandai label "diedit")
- **Hapus komentar** — Penulis dan Admin bisa menghapus komentar

#### Fitur Tambahan

- **Mention** — Gunakan `@` di dalam komentar untuk menyebut user lain
- **Emoji Reaction** — Tambahkan reaksi emoji ke komentar. Reaksi yang sama dari banyak user digabung dengan counter
- **Resolve Thread** — Tandai seluruh thread sebagai selesai (berguna di komentar cell spreadsheet)
- **Tampilkan/sembunyikan thread yang sudah resolve**

#### Lokasi Comment Thread

- Panel detail task
- Cell spreadsheet dalam event
- Widget di brainstorming (tipe Task dan Teks)

---

### Notifikasi In-App

#### Bell Icon & Panel Notifikasi

Bell icon di topbar menampilkan badge dengan jumlah notifikasi yang belum dibaca. Klik untuk membuka panel slide-in dari kanan yang menampilkan semua notifikasi terkini.

#### Tipe Notifikasi

| Tipe           | Contoh Pesan                                                  |
| -------------- | ------------------------------------------------------------- |
| Mention        | "Budi menyebut kamu di komentar task 'Desain Landing Page'"   |
| Assign Task    | "Sari menugaskan task 'Review Copywriting' kepadamu"          |
| Due Date Dekat | "Task 'Finalisasi Proposal' jatuh tempo besok"                |
| Komentar Baru  | "Ada komentar baru di task yang kamu ikuti"                   |
| Member Baru    | "Andi bergabung ke workspace Project Alpha"                   |
| Event Dimulai  | "Event 'Demo Product Q1' dimulai hari ini"                    |
| Update Task    | "Task milikmu 'Setup Database' dipindahkan ke Done oleh Reza" |

#### Manajemen Notifikasi

- Mark as read satu per satu atau semua sekaligus
- Filter notifikasi berdasarkan tipe
- Klik notifikasi langsung mengarahkan ke halaman yang relevan
- Notifikasi tersimpan dan bisa dilihat kembali meski setelah logout dan login ulang

#### Preferensi Notifikasi

Di halaman Pengaturan Akun, setiap user bisa mengatur:

- Aktifkan/nonaktifkan notifikasi in-app per tipe
- Aktifkan/nonaktifkan notifikasi WhatsApp per tipe
- Atur waktu jeda pengingat due date (H-1, H-3, atau hari-H)

---

### Notifikasi WhatsApp

Notifikasi otomatis yang dikirim ke nomor WhatsApp user yang terdaftar di profil.

**Format pesan:**
Pesan singkat dan informatif yang berisi: siapa yang melakukan aksi, konteks aksi (nama task/event/workspace), dan tautan langsung ke halaman yang relevan.

**Dikirim untuk:**

- Saat di-mention di task, komentar, spreadsheet, atau brainstorming
- Saat task di-assign kepada user
- Pengingat due date task (sesuai pengaturan)
- Pengingat event akan dimulai

User yang belum mendaftarkan nomor WhatsApp tidak akan menerima notifikasi WA dan akan mendapat pengingat untuk melengkapi profil.

---

### Activity Log & Audit Trail

Catatan otomatis dan permanen dari semua aksi penting yang terjadi dalam workspace. Log tidak bisa diedit atau dihapus.

#### Aksi yang Dicatat

**Task:** dibuat, diedit, dihapus, dipindahkan antar kolom, di-assign, diubah prioritas, diubah due date, ditambah/dihapus subtask, ditambah/dihapus lampiran

**Event:** dibuat, diedit, dihapus, ditambah/dihapus peserta, diubah status

**Spreadsheet Event:** cell diubah, kolom ditambah/dihapus/di-rename, sheet ditambah/dihapus/di-rename

**Workspace:** member diundang, member keluar/dikeluarkan, role member diubah, pengaturan workspace diubah

**User:** login, logout (opsional, bisa dinonaktifkan)

#### Format Tampilan Log

Setiap entri menampilkan: foto profil dan nama user pelaku, deskripsi aksi, nama objek yang terkena aksi, konteks (di task/event/workspace mana), dan waktu relatif (contoh: "3 jam lalu", "kemarin 14:32").

#### Akses Log

- **Halaman Activity Log Workspace** — Semua aktivitas dalam workspace dengan filter lengkap (per user, tipe aksi, rentang tanggal, modul)
- **Tab Activity di Detail Task** — Hanya riwayat task tersebut
- **Tab Activity di Detail Event** — Riwayat event dan spreadsheet di dalamnya

---

### Export Data

#### Export Task

- Daftar task (dengan filter aktif) ke **CSV** atau **Excel (.xlsx)**
- Snapshot visual Kanban Board ke **PDF**
- Task yang terhubung ke event tertentu ke **CSV/Excel**

#### Export Spreadsheet Event

- Satu sheet ke **CSV**
- Satu sheet atau semua sheet ke **Excel (.xlsx)**
- Detail event beserta task terkait ke **PDF**

#### Export Brainstorming

- Canvas penuh ke **PNG** (resolusi tinggi)
- Canvas penuh ke **PDF**
- Diagram spesifik ke **PNG**

#### Mekanisme Export

Untuk file berukuran besar, proses export dijalankan di background. User akan mendapat notifikasi in-app saat file sudah siap, lengkap dengan tautan untuk mengunduhnya.

---

## Pengalaman Mobile

Aplikasi dirancang dengan pendekatan mobile-first dan dapat diakses dari browser maupun diinstal sebagai aplikasi (PWA — Progressive Web App).

### Halaman yang Sepenuhnya Responsif

Semua halaman berikut tampil optimal di layar mobile:

- Dashboard
- Daftar dan Detail Event
- Daftar dan Detail Task
- Komentar dan Notifikasi
- Activity Log
- Profil User dan Pengaturan Akun

### Adaptasi Tampilan di Mobile

**Kanban Board**
Di mobile, kolom kanban ditampilkan satu per satu secara penuh. User bisa menggeser (swipe) ke kiri atau kanan untuk berpindah antar kolom. Nama kolom ditampilkan di bagian atas dengan indikator navigasi.

**Kalender**
Tampilan bulanan dioptimalkan dengan kartu task yang lebih kompak. Mode mingguan dan harian lebih diutamakan di mobile karena lebih mudah diinteraksi.

**Spreadsheet Event**
Ditampilkan sebagai tabel horizontal yang bisa di-scroll ke samping. Kolom pertama (biasanya identifier baris) bisa di-freeze agar selalu terlihat saat scroll.

**Brainstorming Board**
Di mobile, board brainstorming masuk ke mode **tampilan** — user bisa melihat dan zoom (pinch-to-zoom) seluruh canvas. Pengeditan widget tetap bisa dilakukan tapi tidak semua operasi tersedia. Untuk bekerja penuh dengan canvas, disarankan menggunakan tablet atau desktop.

### Fitur Khusus Mobile

- **Bottom Navigation Bar** — Navigasi utama berada di bawah layar agar mudah dijangkau ibu jari
- **Pull-to-Refresh** — Tarik ke bawah di halaman list untuk memuat ulang data
- **Swipe to Dismiss** — Geser notifikasi untuk menandainya sebagai sudah dibaca
- **PWA** — Bisa diinstal ke homescreen perangkat, mendukung notifikasi push, dan memiliki caching dasar untuk penggunaan offline terbatas

---

## Alur Pengguna

### Alur Onboarding User Baru

1. User menerima tautan undangan via email atau WhatsApp
2. Membuat akun (nama, email, password, nomor WhatsApp)
3. Masuk ke workspace yang mengundang
4. Tur singkat fitur utama (tooltip overlay, bisa dilewati)
5. Lengkapi profil — terutama nomor WhatsApp untuk notifikasi

### Alur Membuat & Mengelola Event

1. Buka menu **Event** di sidebar
2. Klik **Buat Event Baru**, isi judul, tanggal, warna label, dan peserta
3. Buka detail event → tab **Spreadsheet** untuk mulai mencatat data
4. Tambah sheet baru sesuai kebutuhan (rundown, budget, dll.)
5. Buka tab **Task Terkait** untuk membuat atau menghubungkan task ke event ini
6. Monitor perkembangan lewat tab **Activity**

### Alur Membuat & Mengelola Task

1. Buka **Kanban Board** atau **Kalender**
2. Klik tombol tambah atau klik tanggal di kalender
3. Isi judul, assignee, due date, prioritas
4. Opsional: hubungkan ke sebuah event dari field "Event"
5. Tambahkan deskripsi, subtask, dan lampiran
6. Task langsung muncul di kolom pertama Kanban dan di Kalender

### Alur Sesi Brainstorming

1. Buka **Brainstorming** → pilih board yang ada atau buat board baru
2. Tambahkan widget sesuai kebutuhan: mulai dengan teks atau diagram untuk menuangkan ide
3. Tambahkan widget task untuk menghubungkan ide dengan pekerjaan nyata
4. Mention anggota tim di widget teks untuk memberitahu mereka tentang ide atau tugas terkait
5. Atur posisi dan ukuran widget hingga tampilan sesuai keinginan
6. Export canvas ke PNG atau PDF untuk keperluan presentasi

### Alur Notifikasi

1. User A mention User B di komentar task: `@Budi cek bagian ini ya`
2. User B langsung menerima notifikasi in-app (bell icon berkedip dengan badge)
3. Secara bersamaan, pesan WhatsApp dikirim ke User B (jika diaktifkan): _"Andi menyebut kamu di task 'Review Desain UI' — [tautan]"_
4. User B klik notifikasi → langsung diarahkan ke komentar yang dimaksud

---

## Rencana Pengembangan

Pengembangan dibagi dalam enam fase berurutan, di mana setiap fase menghasilkan fitur yang bisa langsung digunakan.

### Fase 1 — Fondasi (Estimasi 4–5 Minggu)

Membangun infrastruktur dasar aplikasi:

- Sistem autentikasi (daftar, masuk, lupa password)
- Manajemen workspace dan member
- Manajemen user dan profil
- Task CRUD dasar (tanpa tampilan visual)
- Struktur database lengkap

Hasil akhir fase ini: tim sudah bisa membuat workspace, mengundang member, dan membuat task dasar.

### Fase 2 — Task Management Visual (Estimasi 5–6 Minggu)

Membangun tampilan utama task:

- Kanban Board dengan drag & drop
- Kalender View terintegrasi
- Filter dan pencarian task
- Relasi task ke event
- Event management dasar (tanpa spreadsheet)

Hasil akhir fase ini: tim bisa mengelola task secara visual di Kanban dan Kalender.

### Fase 3 — Event Spreadsheet & Activity Log (Estimasi 4–5 Minggu)

Menambahkan fitur data dan audit:

- Spreadsheet dalam event (multi-sheet, semua tipe kolom)
- Kolaborasi real-time di spreadsheet
- Activity Log & Audit Trail
- Export data (task dan spreadsheet)

Hasil akhir fase ini: event menjadi lebih powerful dengan spreadsheet, semua aktivitas tercatat.

### Fase 4 — Kolaborasi & Notifikasi (Estimasi 4–5 Minggu)

Mengaktifkan komunikasi antar tim:

- Comment Thread di task dan spreadsheet
- Emoji Reaction
- Mention user di semua lokasi
- Notifikasi in-app real-time
- Notifikasi WhatsApp

Hasil akhir fase ini: tim bisa berdiskusi, mention, dan tetap terinformasi tanpa meninggalkan aplikasi.

### Fase 5 — Brainstorming Board (Estimasi 4–5 Minggu)

Membangun fitur kreatif:

- Infinite canvas
- Semua tipe widget (Task, Diagram, Gambar, Teks WYSIWYG)
- Drag & drop dan resize widget
- Mention di widget
- Export canvas

Hasil akhir fase ini: tim bisa berkolaborasi secara visual dalam satu canvas bersama.

### Fase 6 — Polish & Mobile (Estimasi 3–4 Minggu)

Menyempurnakan pengalaman pengguna:

- Optimasi tampilan mobile di semua halaman
- PWA (installable, notifikasi push, offline cache)
- Dark mode
- Keyboard shortcuts untuk power user
- Optimasi performa dan loading
- QA dan bug fixing menyeluruh

---

## Ringkasan Fitur

### Fitur Utama

| Fitur                                 | Status          | Fase   |
| ------------------------------------- | --------------- | ------ |
| Kelola Workspace (CRUD, member, role) | 🔵 Direncanakan | Fase 1 |
| Kelola User (profil, invite, role)    | 🔵 Direncanakan | Fase 1 |
| Kelola Event (CRUD, peserta, status)  | 🔵 Direncanakan | Fase 2 |
| Spreadsheet dalam Event               | 🔵 Direncanakan | Fase 3 |
| Task Kanban Board                     | 🔵 Direncanakan | Fase 2 |
| Task Kalender View                    | 🔵 Direncanakan | Fase 2 |
| Relasi Task → Event (opsional)        | 🔵 Direncanakan | Fase 2 |
| Brainstorming — Widget Task           | 🔵 Direncanakan | Fase 5 |
| Brainstorming — Widget Diagram        | 🔵 Direncanakan | Fase 5 |
| Brainstorming — Widget Gambar         | 🔵 Direncanakan | Fase 5 |
| Brainstorming — Widget Teks WYSIWYG   | 🔵 Direncanakan | Fase 5 |

### Fitur Pendukung

| Fitur                            | Status          | Fase   |
| -------------------------------- | --------------- | ------ |
| Mention user (@) di semua lokasi | 🔵 Direncanakan | Fase 4 |
| Comment Thread & Reply           | 🔵 Direncanakan | Fase 4 |
| Emoji Reaction di komentar       | 🔵 Direncanakan | Fase 4 |
| Notifikasi In-App real-time      | 🔵 Direncanakan | Fase 4 |
| Notifikasi WhatsApp              | 🔵 Direncanakan | Fase 4 |
| Activity Log & Audit Trail       | 🔵 Direncanakan | Fase 3 |
| Export Task (CSV, Excel, PDF)    | 🔵 Direncanakan | Fase 3 |
| Export Spreadsheet (CSV, Excel)  | 🔵 Direncanakan | Fase 3 |
| Export Brainstorming (PNG, PDF)  | 🔵 Direncanakan | Fase 5 |
| Mobile Responsive                | 🔵 Direncanakan | Fase 6 |
| PWA (installable)                | 🔵 Direncanakan | Fase 6 |
| Dark Mode                        | 🔵 Direncanakan | Fase 6 |
| Drag & Drop widget (canvas)      | 🔵 Direncanakan | Fase 5 |
| Resize widget (canvas)           | 🔵 Direncanakan | Fase 5 |

---

_Dokumen ini merupakan plan produk hidup yang akan terus diperbarui seiring perkembangan proyek._

_Versi 1.0 — Dibuat sebagai acuan perencanaan awal_
