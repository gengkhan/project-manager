# 📋 Development Progress Tracker

> File ini digunakan untuk tracking progress pengembangan seluruh fitur aplikasi Project Management.
> Update status: `[ ]` belum dimulai · `[/]` sedang dikerjakan · `[x]` selesai

---

## Fase 1 — Fondasi (Estimasi 4–5 Minggu)

### 1.1 Setup Project & Infrastruktur

- [x] Inisialisasi monorepo (Next.js frontend + Express.js backend)
- [x] Setup MongoDB connection & konfigurasi Mongoose
- [x] Setup Socket.io server & client
- [x] Setup environment variables (.env)
- [x] Setup Puter.js SDK untuk file storage
- [x] Setup ESLint, Prettier, dan konfigurasi project
- [x] Setup folder structure (routes, controllers, services, models, middlewares)
- [x] Setup CORS, helmet, dan security middleware
- [x] Setup error handling middleware global
- [x] Setup logging (winston/morgan)

### 1.2 Autentikasi (Ref: `01-autentikasi-onboarding.md`)

- [x] **Model**: Buat schema `users`
- [x] **Model**: Buat schema `password_reset_tokens`
- [x] **API**: `POST /api/auth/register` — Registrasi user baru
- [x] **API**: `POST /api/auth/login` — Login (generate JWT)
- [x] **API**: `POST /api/auth/logout` — Logout
- [x] **API**: `POST /api/auth/refresh` — Refresh access token
- [x] **API**: `POST /api/auth/forgot-password` — Kirim email reset
- [x] **API**: `POST /api/auth/reset-password` — Reset password dengan token
- [x] **Middleware**: Auth middleware (verifikasi JWT)
- [x] **Service**: Email service (Nodemailer SMTP) untuk forgot password
- [x] **Frontend**: Halaman Register (`/register`)
- [x] **Frontend**: Halaman Login (`/login`)
- [x] **Frontend**: Halaman Lupa Password (`/forgot-password`)
- [x] **Frontend**: Halaman Reset Password (`/reset-password/:token`)
- [x] **Frontend**: Auth context/provider (state management)
- [x] **Frontend**: Protected route wrapper
- [ ] **Test**: Unit test auth API
- [ ] **Test**: Integration test auth flow

### 1.3 Kelola Workspace (Ref: `02-kelola-workspace.md`)

- [x] **Model**: Buat schema `workspaces`
- [x] **Model**: Buat schema `workspace_members`
- [x] **Model**: Buat schema `workspace_invitations`
- [x] **API**: `GET /api/workspaces` — Daftar workspace user
- [x] **API**: `POST /api/workspaces` — Buat workspace baru (+ default kanban columns)
- [x] **API**: `GET /api/workspaces/:id` — Detail workspace
- [x] **API**: `PUT /api/workspaces/:id` — Update workspace
- [x] **API**: `DELETE /api/workspaces/:id` — Hapus workspace (soft delete)
- [x] **API**: `POST /api/workspaces/:id/archive` — Arsipkan
- [x] **API**: `POST /api/workspaces/:id/unarchive` — Unarsipkan
- [x] **API**: `GET /api/workspaces/:id/members` — Daftar member
- [x] **API**: `POST /api/workspaces/:id/invite` — Undang via email
- [x] **API**: `POST /api/workspaces/:id/invite-link/regenerate` — Regenerate invite link
- [x] **API**: `POST /api/workspaces/join/:inviteCode` — Join via link
- [x] **API**: `PUT /api/workspaces/:id/members/:userId/role` — Ubah role
- [x] **API**: `DELETE /api/workspaces/:id/members/:userId` — Keluarkan member
- [x] **API**: `POST /api/workspaces/:id/leave` — Leave workspace
- [x] **API**: `POST /api/workspaces/:id/transfer-ownership` — Transfer ownership
- [x] **Middleware**: Role-based access control (RBAC) middleware
- [x] **Frontend**: Halaman Daftar Workspace (`/workspaces`)
- [x] **Frontend**: Form Buat Workspace (`/workspaces/new`)
- [x] **Frontend**: Halaman Pengaturan Workspace — Tab Umum
- [x] **Frontend**: Halaman Pengaturan Workspace — Tab Member
- [x] **Frontend**: Halaman Pengaturan Workspace — Tab Kolom Kanban
- [x] **Frontend**: Dialog Undang Member (email + invite link)
- [x] **Frontend**: Dialog Transfer Ownership
- [x] **Frontend**: Dialog Konfirmasi Hapus Workspace
- [ ] **Test**: Unit test workspace API
- [ ] **Test**: Unit test RBAC middleware

### 1.4 Kelola User & Profil (Ref: `03-kelola-user-profil.md`)

- [x] **API**: `GET /api/users/me` — Profil saat ini
- [x] **API**: `PUT /api/users/me` — Update profil
- [x] **API**: `PUT /api/users/me/password` — Ubah password
- [x] **API**: `PUT /api/users/me/avatar` — Upload avatar (Puter.js)
- [x] **API**: `PUT /api/users/me/notifications` — Update preferensi notifikasi
- [x] **API**: `GET /api/workspaces/:id/members/:userId/profile` — Profil member
- [x] **API**: `GET /api/workspaces/:id/members/:userId/stats` — Statistik kontribusi
- [x] **Socket.io**: Presence system (online/offline via heartbeat)
- [x] **Frontend**: Halaman Pengaturan Akun (`/settings/account`)
- [x] **Frontend**: Form ubah profil (nama, avatar, WhatsApp)
- [x] **Frontend**: Form ubah password
- [x] **Frontend**: Form preferensi notifikasi (toggle per tipe)
- [x] **Frontend**: Halaman Profil User (`/workspace/:id/members/:userId`)
- [x] **Frontend**: Online/offline indicator (titik hijau/abu)
- [ ] **Test**: Unit test user API

### 1.5 Onboarding (Ref: `01-autentikasi-onboarding.md`)

- [ ] **Model**: Buat schema `user_onboarding`
- [ ] **API**: `GET /api/onboarding/:workspaceId` — Cek status tur
- [ ] **API**: `POST /api/onboarding/:workspaceId/complete` — Selesai
- [ ] **API**: `POST /api/onboarding/:workspaceId/skip` — Skip
- [ ] **API**: `POST /api/onboarding/:workspaceId/reset` — Reset tur
- [ ] **Frontend**: Komponen tur overlay (react-joyride)
- [ ] **Frontend**: Tur step berbeda per role (Owner/Admin, Member, Guest)
- [ ] **Frontend**: Tombol "Tampilkan Tur Ulang" di Pengaturan Akun

---

## Fase 2 — Task Management Visual (Estimasi 5–6 Minggu)

### 2.1 Kelola Task — CRUD (Ref: `06-kelola-task.md`)

- [x] **Model**: Buat schema `tasks`
- [x] **Model**: Buat schema `workspace_labels`
- [x] **API**: `GET /api/workspaces/:id/tasks` — Daftar task (filter, sort, paginate)
- [x] **API**: `POST /api/workspaces/:id/tasks` — Buat task
- [x] **API**: `GET /api/workspaces/:id/tasks/:taskId` — Detail task
- [x] **API**: `PUT /api/workspaces/:id/tasks/:taskId` — Update task
- [x] **API**: `DELETE /api/workspaces/:id/tasks/:taskId` — Hapus task (soft)
- [x] **API**: `POST /api/workspaces/:id/tasks/:taskId/archive` — Arsipkan
- [x] **API**: `POST /api/workspaces/:id/tasks/:taskId/unarchive` — Unarsipkan
- [x] **API**: `POST /api/workspaces/:id/tasks/archive-done` — Bulk arsipkan Done
- [x] **API**: `POST /api/workspaces/:id/tasks/:taskId/watch` — Watch task
- [x] **API**: `DELETE /api/workspaces/:id/tasks/:taskId/watch` — Unwatch
- [x] **API**: `POST /api/workspaces/:id/tasks/:taskId/attachments` — Upload lampiran
- [x] **API**: `DELETE /api/workspaces/:id/tasks/:taskId/attachments/:id` — Hapus lampiran
- [x] **API**: `GET /api/workspaces/:id/labels` — Daftar label
- [x] **API**: `POST /api/workspaces/:id/labels` — Buat label
- [x] **API**: `PUT /api/workspaces/:id/labels/:labelId` — Update label
- [x] **API**: `DELETE /api/workspaces/:id/labels/:labelId` — Hapus label
- [x] **Service**: Upload file ke Puter.js (validasi 1MB, gambar + PDF)
- [x] **Service**: Task dependency validation (no circular)
- [x] **Socket.io**: Task events (created, updated, moved, deleted, archived)
- [ ] **Test**: Unit test task CRUD API

### 2.2 Kanban Board (Ref: `07-kanban-board.md`)

- [x] **Frontend**: Halaman Kanban Board (`/workspace/:id/tasks/kanban`)
- [x] **Frontend**: Render kolom kanban dari data workspace
- [x] **Frontend**: Kartu task (judul, assignee avatar, due date, prioritas, label, subtask progress)
- [x] **Frontend**: Drag & drop task antar kolom (@hello-pangea/dnd)
- [x] **Frontend**: Drag & drop reorder task dalam kolom
- [x] **Frontend**: Quick create task (modal ringkas dari tombol "+")
- [x] **Frontend**: Filter toolbar (event, assignee, label, prioritas, due date, keyword, arsip)
- [x] **Frontend**: Panel detail task (slide-in dari kanan)
- [x] **Frontend**: Detail task — semua field editable inline
- [x] **Frontend**: Detail task — Tab Detail
- [x] **Frontend**: Detail task — Tab Komentar (placeholder, implementasi di Fase 4)
- [x] **Frontend**: Detail task — Tab Activity (placeholder, implementasi di Fase 3)
- [x] **Frontend**: Subtask checklist (reorder, toggle, CRUD)
- [x] **Frontend**: Dependency indicator (🔒 ikon di kartu)
- [x] **Frontend**: Watcher toggle (ikon mata)
- [x] **Frontend**: Lampiran upload & preview (gambar thumbnail, PDF ikon)
- [x] **Frontend**: Bulk actions (select, pindah kolom, ubah assignee/prioritas, arsip, hapus)
- [x] **Frontend**: Real-time sync via Socket.io (task CRUD oleh user lain)
- [x] **Frontend**: Keyboard shortcuts (N, F, Escape, arrow keys)
- [ ] **Test**: E2E test drag & drop kanban

### 2.3 Kalender View (Ref: `08-kalender-view.md`)

- [x] **API**: `GET /api/workspaces/:id/calendar` — Data kalender (task + event)
- [x] **Frontend**: Halaman Kalender (`/workspace/:id/tasks/calendar`)
- [x] **Frontend**: Integrasi FullCalendar (mode bulanan, mingguan, harian)
- [x] **Frontend**: Tampilkan task pada due date (dot/chip)
- [x] **Frontend**: Tampilkan task dengan start+due sebagai bar rentang waktu
- [x] **Frontend**: Tampilkan event sebagai bar warna di area all-day
- [x] **Frontend**: Warna task berdasarkan prioritas / warna event
- [x] **Frontend**: Klik tanggal kosong → buat task baru (due date otomatis)
- [x] **Frontend**: Klik task/event → buka detail
- [x] **Frontend**: Drag task → ubah due date
- [x] **Frontend**: Extend/resize task bar → ubah start/due date
- [x] **Frontend**: Filter toggle (semua, per event, event saja, assignee, prioritas)
- [x] **Frontend**: Tooltip on hover (judul, assignee, due date, status)
- [x] **Frontend**: Real-time sync dengan Kanban Board
- [ ] **Test**: E2E test kalender interaksi

### 2.4 Kelola Event — Dasar (Ref: `04-kelola-event.md`)

- [x] **Model**: Buat schema `events`
- [x] **API**: `GET /api/workspaces/:id/events` — Daftar event (filter, sort)
- [x] **API**: `POST /api/workspaces/:id/events` — Buat event
- [x] **API**: `GET /api/workspaces/:id/events/:eventId` — Detail event
- [x] **API**: `PUT /api/workspaces/:id/events/:eventId` — Update event
- [x] **API**: `DELETE /api/workspaces/:id/events/:eventId` — Hapus (soft)
- [x] **API**: `POST /api/workspaces/:id/events/:eventId/participants` — Tambah peserta
- [x] **API**: `DELETE /api/workspaces/:id/events/:eventId/participants/:userId` — Hapus peserta
- [x] **API**: `GET /api/workspaces/:id/events/:eventId/tasks` — Task terkait
- [x] **Socket.io**: Event events (created, updated, deleted, participant changes)
- [x] **Frontend**: Halaman Daftar Event (`/workspace/:id/events`)
- [x] **Frontend**: Filter (status, tanggal, peserta) & sorting
- [x] **Frontend**: Dialog Buat Event Baru
- [x] **Frontend**: Halaman Detail Event — Tab Overview (semua field editable)
- [x] **Frontend**: Halaman Detail Event — Tab Task Terkait (list + mini kanban)
- [x] **Frontend**: Halaman Detail Event — Tab Spreadsheet (placeholder, Fase 3)
- [x] **Frontend**: Halaman Detail Event — Tab Activity (placeholder, Fase 3)
- [x] **Frontend**: Relasi task-event (field event di task, warna di kalender)
- [ ] **Test**: Unit test event API

---

## Fase 3 — Event Spreadsheet & Activity Log (Estimasi 4–5 Minggu)

### 3.1 Spreadsheet Event (Ref: `05-spreadsheet-event.md`)

- [x] **Model**: Buat schema `spreadsheet_sheets`
- [x] **Model**: Buat schema `spreadsheet_rows`
- [x] **Model**: Buat schema `spreadsheet_row_groups`
- [x] **API**: CRUD sheet (`GET/POST/PUT/DELETE /api/events/:eventId/sheets`)
- [x] **API**: `POST /api/events/:eventId/sheets/:sheetId/duplicate` — Duplikasi
- [x] **API**: `PUT /api/events/:eventId/sheets/reorder` — Reorder
- [x] **API**: `GET /api/events/:eventId/sheets/:sheetId/data` — Ambil semua data
- [x] **API**: CRUD kolom (tambah, update, hapus, reorder)
- [x] **API**: CRUD baris (tambah, update cell, hapus, batch update untuk paste)
- [x] **API**: CRUD row group (buat, update, hapus)
- [x] **API**: Export CSV (`GET /api/events/:eventId/sheets/:sheetId/export/csv`)
- [x] **API**: Export Excel (`GET /api/events/:eventId/sheets/export/xlsx`)
- [x] **Socket.io**: Spreadsheet events (cell update, row/column CRUD)
- [x] **Frontend**: Integrasi FortuneSheet di Tab Spreadsheet event
- [x] **Frontend**: Multi-sheet tab navigation
- [x] **Frontend**: Semua tipe kolom (Teks, Angka, Tanggal, Checkbox, Dropdown, User, URL)
- [x] **Frontend**: Formula footer (SUM, AVERAGE, COUNT, MIN, MAX)
- [x] **Frontend**: Manajemen kolom (tambah, hapus, rename, reorder, resize, ubah tipe)
- [x] **Frontend**: Manajemen baris (tambah, hapus, insert above/below)
- [x] **Frontend**: Row grouping (collapsible groups)
- [x] **Frontend**: Filter & sorting per kolom (via FortuneSheet built-in)
- [x] **Frontend**: Undo/Redo (Ctrl+Z / Ctrl+Y) (via FortuneSheet built-in)
- [x] **Frontend**: Copy-paste dari/ke Excel dan Google Sheets (via FortuneSheet built-in)
- [x] **Frontend**: Freeze kolom pertama (via FortuneSheet built-in)
- [ ] **Frontend**: Komentar per cell (indikator titik, panel thread) — Fase 4
- [x] **Frontend**: Kolaborasi real-time (sync data antar user via Socket.io)
- [x] **Frontend**: Read-only mode untuk Guest
- [x] **Frontend**: Export dialog (CSV / Excel)
- [ ] **Test**: Unit test spreadsheet API
- [ ] **Test**: E2E test spreadsheet interaksi

### 3.2 Activity Log & Audit Trail (Ref: `18-activity-log.md`)

- [x] **Model**: Buat schema `activity_logs` (TTL index 1 tahun)
- [x] **Service**: `ActivityLogService.log()` — service untuk mencatat aksi
- [x] **Integrasi**: Panggil ActivityLogService di semua controller (Task, Event, Spreadsheet, Workspace)
- [x] **API**: `GET /api/workspaces/:id/activity` — Activity log workspace (paginated, filter)
- [x] **API**: `GET /api/workspaces/:id/tasks/:taskId/activity` — Log per task
- [x] **API**: `GET /api/workspaces/:id/events/:eventId/activity` — Log per event
- [x] **API**: `GET /api/workspaces/:id/members/:userId/activity` — Log per user
- [x] **Frontend**: Halaman Activity Log (`/workspace/:id/activity`)
- [x] **Frontend**: Filter (user, tipe aksi, rentang tanggal, modul)
- [x] **Frontend**: Timeline entry (avatar, nama, aksi, waktu relatif)
- [x] **Frontend**: Pagination / infinite scroll
- [x] **Frontend**: Tab Activity di Detail Task (scoped)
- [x] **Frontend**: Tab Activity di Detail Event (scoped)
- [x] **Frontend**: Aktivitas di Profil User (scoped ke workspace)
- [ ] **Test**: Unit test activity log service

### 3.3 Export Data (Ref: `19-export-data.md`)

- [x] **Model**: Buat schema `export_jobs`
- [x] **Service**: Export Task ke CSV (fast-csv)
- [x] **Service**: Export Task ke Excel (exceljs)
- [x] **Service**: Export Kanban ke PDF (pdfkit)
- [ ] **Service**: Export Spreadsheet ke CSV
- [ ] **Service**: Export Spreadsheet ke Excel (luckyexcel)
- [x] **Service**: Export Event detail ke PDF
- [x] **Service**: Background job processing (in-process async)
- [x] **API**: Semua export endpoints (task CSV/XLSX/PDF, event PDF)
- [x] **API**: `GET /api/export-jobs/:jobId` — Status job
- [x] **API**: `GET /api/export-jobs/:jobId/download` — Download file
- [x] **Frontend**: Menu export di Kanban Board
- [x] **Frontend**: Menu export di Spreadsheet
- [x] **Frontend**: Menu export di Detail Event
- [x] **Frontend**: Toast "Export sedang diproses..." untuk background jobs
- [x] **Frontend**: Notifikasi file siap + link download
- [ ] **Test**: Unit test export services

---

## Fase 4 — Kolaborasi & Notifikasi (Estimasi 4–5 Minggu)

### 4.1 Comment Thread & Reaction (Ref: `15-comment-thread-reaction.md`)

- [x] **Model**: Buat schema `comments`
- [x] **API**: `GET /api/comments` — Daftar komentar (by targetType & targetId)
- [x] **API**: `POST /api/comments` — Buat komentar / reply
- [x] **API**: `PUT /api/comments/:commentId` — Edit komentar
- [x] **API**: `DELETE /api/comments/:commentId` — Hapus komentar
- [x] **API**: `POST /api/comments/:commentId/reactions` — Tambah reaction
- [x] **API**: `DELETE /api/comments/:commentId/reactions/:emoji` — Hapus reaction
- [x] **API**: `POST /api/comments/:commentId/resolve` — Resolve thread
- [x] **API**: `POST /api/comments/:commentId/unresolve` — Unresolve
- [x] **Socket.io**: Comment events (created, updated, deleted, reaction, resolve)
- [x] **Frontend**: Komponen CommentThread (reusable)
- [x] **Frontend**: Tulis komentar baru (BlockNote ringan + mention)
- [x] **Frontend**: Reply ke komentar (nested 1 level)
- [x] **Frontend**: Edit komentar (inline, label "diedit")
- [x] **Frontend**: Hapus komentar (placeholder text)
- [x] **Frontend**: Emoji reaction picker (emoji-mart)
- [x] **Frontend**: Reaction badges (counter, hover tooltip)
- [x] **Frontend**: Resolve/unresolve thread
- [x] **Frontend**: Toggle tampilkan resolved threads
- [x] **Frontend**: Integrasi di Tab Komentar detail task
- [ ] **Frontend**: Integrasi di panel komentar cell spreadsheet
- [x] **Test**: Unit test comment API

### 4.2 Mention User (Ref: `14-mention-user.md`)

- [x] **API**: `GET /api/workspaces/:id/members/search` — Autocomplete member
- [x] **Frontend**: Komponen MentionEditor (BlockNote + custom suggestion menu)
- [x] **Frontend**: Custom inline content type "mention"
- [x] **Frontend**: Dropdown autocomplete (avatar + nama + role)
- [x] **Frontend**: Tampilan mention tag (badge berwarna, klikabel ke profil)
- [x] **Frontend**: Hover card profil saat hover mention
- [x] **Frontend**: Integrasi mention di: deskripsi task, komentar, widget teks
- [ ] **Backend**: Trigger notifikasi saat mention terdeteksi
- [ ] **Test**: Unit test mention autocomplete

### 4.3 Notifikasi In-App (Ref: `16-notifikasi-in-app.md`)

- [ ] **Model**: Buat schema `notifications` (indexes)
- [ ] **Service**: `NotificationService.create()` — buat notifikasi
- [ ] **Integrasi**: Trigger notifikasi dari semua aksi (mention, assign, due date, komentar, dll)
- [ ] **Cron**: Due date reminder (daily cron job)
- [ ] **Cron**: Event start reminder (daily cron job)
- [ ] **API**: `GET /api/notifications` — Polling notifikasi baru
- [ ] **API**: `GET /api/notifications/unread-count` — Badge counter
- [ ] **API**: `PUT /api/notifications/:id/read` — Mark as read
- [ ] **API**: `PUT /api/notifications/read-all` — Mark all read
- [ ] **Frontend**: Bell icon di topbar (badge counter)
- [ ] **Frontend**: Panel notifikasi (slide-in kanan)
- [ ] **Frontend**: Render notifikasi (avatar, pesan, waktu, dot unread)
- [ ] **Frontend**: Filter notifikasi per tipe
- [ ] **Frontend**: Klik notifikasi → navigasi ke halaman terkait
- [ ] **Frontend**: Polling mechanism (15 detik aktif, 60 detik idle)
- [ ] **Frontend**: Mark as read (per satu / semua)
- [ ] **Test**: Unit test notification service & API

### 4.4 Notifikasi WhatsApp (Ref: `17-notifikasi-whatsapp.md`)

- [ ] **Model**: Buat schema `whatsapp_logs`
- [ ] **Service**: WhatsAppService singleton (Baileys)
- [ ] **Service**: Inisialisasi Baileys (QR code, auth state persist)
- [ ] **Service**: Auto-reconnect handler
- [ ] **Service**: sendMessage function (format nomor → JID)
- [ ] **Service**: Message queue untuk rate limiting (30/menit, delay 1-3 detik)
- [ ] **Integrasi**: Cek preferensi user → kirim WA setelah notifikasi in-app
- [ ] **API**: `GET /api/admin/whatsapp/status` — Status koneksi
- [ ] **API**: `GET /api/admin/whatsapp/qr` — QR code
- [ ] **API**: `POST /api/admin/whatsapp/reconnect` — Reconnect
- [ ] **API**: `POST /api/admin/whatsapp/test` — Test kirim
- [ ] **API**: `GET /api/admin/whatsapp/logs` — Log pengiriman
- [ ] **Frontend**: Admin panel WhatsApp (status, QR, reconnect, test, logs)
- [ ] **Frontend**: Banner reminder "Lengkapi nomor WhatsApp" di dashboard
- [ ] **Test**: Unit test WhatsApp service

---

## Fase 5 — Brainstorming Board (Estimasi 4–5 Minggu)

### 5.1 Board & Canvas (Ref: `09-brainstorming-board.md`)

- [ ] **Model**: Buat schema `brainstorming_boards`
- [ ] **Model**: Buat schema `brainstorming_widgets`
- [ ] **Model**: Buat schema `brainstorming_connections`
- [ ] **API**: CRUD boards (daftar, buat, detail, update, hapus, duplikasi)
- [ ] **API**: CRUD widgets (tambah, update, hapus)
- [ ] **API**: CRUD connections (buat, update, hapus)
- [ ] **API**: Export canvas PNG (`GET /api/boards/:boardId/export/png`)
- [ ] **API**: Export canvas PDF (`GET /api/boards/:boardId/export/pdf`)
- [ ] **Socket.io**: Board events (widget CRUD, move, resize, connection CRUD)
- [ ] **Frontend**: Halaman Daftar Board (`/workspace/:id/brainstorming`)
- [ ] **Frontend**: Board cards (nama, thumbnail, diubah, pembuat)
- [ ] **Frontend**: Buat, duplikasi, rename, hapus board
- [ ] **Frontend**: Canvas dasar (React Flow — infinite canvas)
- [ ] **Frontend**: Pan (klik+drag area kosong, middle mouse)
- [ ] **Frontend**: Zoom (scroll, pinch, slider toolbar)
- [ ] **Frontend**: Fit to Screen button
- [ ] **Frontend**: Minimap (sudut kanan bawah, toggle show/hide)
- [ ] **Frontend**: Toolbar (tambah widget, zoom, fit, minimap, export)
- [ ] **Frontend**: Widget operations — drag & drop (reposition)
- [ ] **Frontend**: Widget operations — resize (handle sudut + tepi)
- [ ] **Frontend**: Widget operations — layering (bring front/back, forward/backward)
- [ ] **Frontend**: Widget operations — lock/unlock
- [ ] **Frontend**: Widget operations — collapse/expand
- [ ] **Frontend**: Widget operations — hapus
- [ ] **Frontend**: Koneksi antar widget (connection points, drag to connect)
- [ ] **Frontend**: Properti koneksi (gaya garis, warna, arrow, label)
- [ ] **Frontend**: Kolaborasi real-time (sync widget CRUD antar user)
- [ ] **Test**: E2E test canvas interaksi

### 5.2 Widget Task (Ref: `10-widget-task.md`)

- [ ] **Frontend**: Custom React Flow node — TaskWidgetNode
- [ ] **Frontend**: Mode mini kanban (kolom workspace, drag & drop)
- [ ] **Frontend**: Mode list (sortable)
- [ ] **Frontend**: Filter per widget (event, assignee, label, prioritas)
- [ ] **Frontend**: Buat task dari widget (quick create)
- [ ] **Frontend**: Sinkronisasi 2-arah dengan modul Task utama
- [ ] **Test**: Test widget task

### 5.3 Widget Mind Map (Ref: `11-widget-mind-map.md`)

- [ ] **Frontend**: Custom React Flow node — MindMapWidgetNode
- [ ] **Frontend**: Nested React Flow instance di dalam widget
- [ ] **Frontend**: Buat node (double-klik, tombol "+", Enter sibling, Tab child)
- [ ] **Frontend**: Edit node (double-klik teks, Enter selesai)
- [ ] **Frontend**: Hapus node (Delete key, context menu)
- [ ] **Frontend**: Move node (drag)
- [ ] **Frontend**: Koneksi parent-child otomatis
- [ ] **Frontend**: Cross-link antar node
- [ ] **Frontend**: Kustomisasi node (warna, bentuk, ukuran, border, ikon)
- [ ] **Frontend**: Auto Layout (horizontal, vertical, radial)
- [ ] **Frontend**: Export mind map ke PNG
- [ ] **Test**: Test widget mind map

### 5.4 Widget Gambar (Ref: `12-widget-gambar.md`)

- [ ] **Frontend**: Custom React Flow node — ImageWidgetNode
- [ ] **Frontend**: Upload file (Puter.js, maks 1MB, JPG/PNG/GIF/WebP)
- [ ] **Frontend**: Embed dari URL
- [ ] **Frontend**: Drag & drop file ke canvas → auto-create widget
- [ ] **Frontend**: Caption (editable, maks 500 char)
- [ ] **Frontend**: Klik gambar → modal preview full-size
- [ ] **Frontend**: Ganti gambar, download
- [ ] **Frontend**: Resize dengan aspect ratio terjaga
- [ ] **Test**: Test widget gambar

### 5.5 Widget Teks WYSIWYG (Ref: `13-widget-teks-wysiwyg.md`)

- [ ] **Frontend**: Custom React Flow node — TextWidgetNode
- [ ] **Frontend**: Integrasi BlockNote.js di dalam widget
- [ ] **Frontend**: Slash menu (heading, paragraph, list, table)
- [ ] **Frontend**: Formatting toolbar (bold, italic, underline, highlight)
- [ ] **Frontend**: Drag & drop blocks
- [ ] **Frontend**: @mention (custom suggestion menu → notifikasi)
- [ ] **Frontend**: Tabel sederhana (insert, tambah/hapus row/col)
- [ ] **Frontend**: Kolaborasi real-time (Yjs)
- [ ] **Test**: Test widget teks

---

## Fase 6 — Polish & Mobile (Estimasi 3–4 Minggu)

### 6.1 Dashboard (Ref: `21-dashboard.md`)

- [ ] **API**: `GET /api/workspaces/:id/dashboard` — Data teragregasi
- [ ] **Frontend**: Halaman Dashboard (`/workspace/:id`)
- [ ] **Frontend**: Header welcome
- [ ] **Frontend**: Stats cards (task aktif, selesai minggu ini, overdue, event ongoing)
- [ ] **Frontend**: My Tasks — daftar task saya (sortir due date)
- [ ] **Frontend**: Event Mendatang & Berlangsung
- [ ] **Frontend**: Aktivitas Terkini (10 terakhir)
- [ ] **Frontend**: Member Online (avatar stack)
- [ ] **Frontend**: Auto refresh (polling 60 detik)
- [ ] **Test**: Test dashboard API

### 6.2 Mobile Responsive (Ref: `20-mobile-responsive-pwa.md`)

- [ ] **Frontend**: Bottom Navigation Bar (mobile)
- [ ] **Frontend**: Menu "Lainnya" (drawer)
- [ ] **Frontend**: Kanban — 1 kolom per view, swipe antar kolom
- [ ] **Frontend**: Kalender — mode harian default, dot indicator bulanan
- [ ] **Frontend**: Spreadsheet — horizontal scroll, freeze kolom 1, modal edit cell
- [ ] **Frontend**: Brainstorming — view-only + pinch-to-zoom, edit terbatas
- [ ] **Frontend**: Detail Task — halaman penuh (bukan side panel)
- [ ] **Frontend**: Notifikasi — full-width panel
- [ ] **Frontend**: Pull-to-Refresh di semua halaman list
- [ ] **Frontend**: Swipe to Dismiss notifikasi
- [ ] **Frontend**: Long press untuk drag task di mobile
- [ ] **Frontend**: Responsive breakpoints (mobile ≤768, tablet 769-1024, desktop >1024)
- [ ] **Test**: Responsive testing (Chrome DevTools + real device)

### 6.3 PWA (Ref: `20-mobile-responsive-pwa.md`)

- [ ] **Frontend**: `manifest.json` (name, icons, display standalone)
- [ ] **Frontend**: Service Worker (caching app shell, static assets)
- [ ] **Frontend**: Offline cache — network first with cache fallback untuk API
- [ ] **Frontend**: Offline banner "Menampilkan data tersimpan"
- [ ] **Frontend**: Disable create/edit saat offline
- [ ] **Frontend**: Push notification (Web Push API, VAPID keys)
- [ ] **Backend**: Push subscription storage & send push notifications
- [ ] **Frontend**: Install prompt "Instal Aplikasi"
- [ ] **Frontend**: Splash screen
- [ ] **Frontend**: Meta tags mobile (viewport, theme-color, apple-mobile)
- [ ] **Test**: PWA audit (Lighthouse)

### 6.4 Dark Mode (Ref: `22-dark-mode-keyboard-shortcuts.md`)

- [ ] **Frontend**: CSS custom properties (semua token warna)
- [ ] **Frontend**: Palet gelap (bg, text, border, accent, dll)
- [ ] **Frontend**: Toggle di topbar profil dropdown + Pengaturan Akun
- [ ] **Frontend**: Pilihan: Terang / Gelap / Sistem
- [ ] **Frontend**: Simpan di localStorage + database user
- [ ] **Frontend**: Transisi smooth (300ms)
- [ ] **Frontend**: Pastikan semua komponen menggunakan token warna
- [ ] **Test**: Visual testing dark mode

### 6.5 Keyboard Shortcuts & Command Palette (Ref: `22-dark-mode-keyboard-shortcuts.md`)

- [ ] **Frontend**: Command Palette (Ctrl+K) — search task, event, board, member, navigasi
- [ ] **Frontend**: Global shortcuts (Ctrl+K, Ctrl+/, Ctrl+Shift+D)
- [ ] **Frontend**: Navigasi shortcuts (G+D, G+E, G+K, G+C, G+B, G+A, G+S)
- [ ] **Frontend**: Kanban shortcuts (N, F, Escape, arrows, Enter)
- [ ] **Frontend**: Detail Task shortcuts (E, A, P, L, D, S, Ctrl+Enter, Escape)
- [ ] **Frontend**: Spreadsheet shortcuts (Tab, arrows, Ctrl+Z/Y/C/V, F2, Delete)
- [ ] **Frontend**: Brainstorming shortcuts (Space+drag, Ctrl+±0, Delete)
- [ ] **Frontend**: Shortcuts Help Modal (Ctrl+/ atau ikon "?" di sidebar)
- [ ] **Test**: Unit test keyboard shortcuts

### 6.6 QA & Bug Fixing

- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Responsive testing di berbagai device
- [ ] Performance audit (Lighthouse, Web Vitals)
- [ ] Optimasi bundle size & code splitting
- [ ] Optimasi query database (index review)
- [ ] Security audit (XSS, CSRF, injection, auth)
- [ ] Accessibility audit (WCAG dasar)
- [ ] Bug fixing dari semua fase
- [ ] Final deployment preparation

---

## Fase 7 — AI Chat Agent (Estimasi 3–4 Minggu)

### 7.1 RAG Infrastructure (Ref: `23-ai-chat-agent.md`)

- [ ] **Model**: Buat schema `embeddings` (vector field 768 dimensi)
- [ ] **Config**: Setup MongoDB Atlas Vector Search Index (`embedding_vector_index`)
- [ ] **Service**: `EmbeddingService` — generate embedding via Google `text-embedding-004`
- [ ] **Service**: `EmbeddingService.upsert()` — create/update embedding per dokumen
- [ ] **Service**: `EmbeddingService.remove()` — hapus embedding saat dokumen dihapus
- [ ] **Service**: `EmbeddingService.syncWorkspace()` — full re-index seluruh workspace
- [ ] **Service**: `RAGService.retrieve()` — vector similarity search (workspace-scoped, top-K)
- [ ] **Service**: `RAGService.buildContext()` — gabungkan dokumen relevan jadi context string
- [ ] **Integrasi**: Hook embedding sync di Task controller (create, update, delete)
- [ ] **Integrasi**: Hook embedding sync di Event controller (create, update, delete)
- [ ] **Integrasi**: Hook embedding sync di Workspace controller (member join/leave/role change)
- [ ] **Integrasi**: Hook embedding sync di Comment controller (create, edit, delete)
- [ ] **Integrasi**: Hook embedding sync di Activity Log service (log created)
- [ ] **Integrasi**: Hook embedding sync di Spreadsheet controller (sheet/column update)
- [ ] **Cron**: Re-index workspace harian (opsional, fallback, 03:00)
- [ ] **API**: `POST /api/workspaces/:id/embeddings/sync` — Trigger manual re-index (Admin+)
- [ ] **API**: `GET /api/workspaces/:id/embeddings/stats` — Statistik embeddings per tipe (Admin+)
- [ ] **Test**: Unit test embedding service
- [ ] **Test**: Unit test RAG retrieval

### 7.2 CopilotKit Runtime & Actions (Ref: `23-ai-chat-agent.md`)

- [ ] **Config**: Setup Google Generative AI (Gemini 2.0 Flash) adapter
- [ ] **Config**: Environment variables (GOOGLE_AI_API_KEY, GEMINI_MODEL, RAG_TOP_K, dll)
- [ ] **Service**: `AIActionsService.createTask()` — buat task via AI
- [ ] **Service**: `AIActionsService.updateTask()` — update task via AI
- [ ] **Service**: `AIActionsService.createEvent()` — buat event via AI
- [ ] **Service**: `AIActionsService.assignMember()` — assign/unassign member via AI
- [ ] **Service**: `AIActionsService.searchData()` — cari data workspace via AI
- [ ] **Service**: `AIActionsService.getWorkspaceSummary()` — ringkasan workspace
- [ ] **Service**: `AIActionsService.suggestActions()` — saran cerdas (prioritas, distribusi, deadline)
- [ ] **Controller**: `copilotkit.controller.js` — setup CopilotKit Runtime dengan Express adapter
- [ ] **Route**: `POST /api/copilotkit` — CopilotKit Runtime endpoint (streaming, auth required)
- [ ] **Middleware**: Rate limiting AI chat (30 msg/min, 500/day, 10 aksi/min per user)
- [ ] **Middleware**: RBAC — block Guest dari AI Chat endpoint
- [ ] **System Prompt**: Definisi system prompt dengan konteks workspace
- [ ] **Test**: Unit test AI actions service
- [ ] **Test**: Integration test CopilotKit endpoint

### 7.3 Frontend AI Chat Page (Ref: `23-ai-chat-agent.md`)

- [ ] **Frontend**: Halaman AI Chat (`/workspace/:id/ai-chat`)
- [ ] **Frontend**: CopilotKit Provider wrapper di layout workspace (`runtimeUrl` ke backend)
- [ ] **Frontend**: Chat UI menggunakan CopilotKit `<CopilotChat />` (kustomisasi styling shadcn/Tailwind)
- [ ] **Frontend**: Welcome message dengan daftar kemampuan AI
- [ ] **Frontend**: Suggestion chips (contoh pertanyaan yang bisa diklik)
- [ ] **Frontend**: Streaming text response (karakter per karakter)
- [ ] **Frontend**: Typing indicator ("AI sedang mengetik...")
- [ ] **Frontend**: Action confirmation cards (preview task/event sebelum dibuat)
- [ ] **Frontend**: `useCopilotReadable` — provide workspace context (nama, member, kolom kanban, event aktif)
- [ ] **Frontend**: `useCopilotAction` — `createTask` (buat task baru)
- [ ] **Frontend**: `useCopilotAction` — `updateTask` (update field task)
- [ ] **Frontend**: `useCopilotAction` — `createEvent` (buat event baru)
- [ ] **Frontend**: `useCopilotAction` — `assignMember` (assign/unassign member)
- [ ] **Frontend**: `useCopilotAction` — `searchData` (cari task/event/member)
- [ ] **Frontend**: `useCopilotAction` — `getWorkspaceSummary` (ringkasan workspace)
- [ ] **Frontend**: `useCopilotAction` — `suggestActions` (saran cerdas)
- [ ] **Frontend**: Link navigasi "AI Chat" di sidebar (ikon robot/sparkle)
- [ ] **Frontend**: Rate limit feedback ("Batas penggunaan tercapai, coba lagi nanti")
- [ ] **Frontend**: Empty state & error handling
- [ ] **Test**: E2E test AI chat interaksi

---

## Navigasi & Layout Global

- [ ] **Frontend**: Sidebar navigasi (Dashboard, Event, Task Kanban, Task Kalender, Brainstorming, Activity Log, Settings)
- [ ] **Frontend**: Topbar (Notifikasi bell, Profil dropdown, Workspace selector)
- [ ] **Frontend**: Workspace selector dropdown (jika user punya >1 workspace)
- [ ] **Frontend**: Loading states & skeleton screens
- [ ] **Frontend**: Error boundary & error pages (404, 500)
- [ ] **Frontend**: Toast notification system
- [ ] **Frontend**: Confirm dialog system (reusable)
