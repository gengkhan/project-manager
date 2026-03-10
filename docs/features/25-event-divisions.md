# 👥 Fitur 25 — Event Divisions (Divisi Event)

## Ringkasan

Setiap event dapat memiliki beberapa divisi untuk mengelompokkan anggota. Alih-alih menambahkan peserta langsung ke event, user membuat divisi terlebih dahulu dan menugaskan member workspace ke divisi tersebut. Setiap anggota divisi memiliki role: **leader** atau **member**. Field `participants` pada Event tetap dipertahankan sebagai field denormalisasi yang otomatis disinkronisasi dari seluruh anggota divisi, menjaga kompatibilitas mundur dengan kalender, kanban filter, dan event card.

---

## Lokasi

| Lokasi               | Modul | Detail                                                   |
| -------------------- | ----- | -------------------------------------------------------- |
| Halaman detail event | Event | Bagian "Divisi" di tab Overview (menggantikan "Peserta") |

---

## Operasi Divisi

### Buat Divisi

- Klik tombol **"Tambah Divisi"** di bagian divisi pada tab Overview
- Form inline muncul: input **nama divisi** (wajib, maks 100 karakter) dan pilihan **warna**
- Tombol **"Buat"** atau **"Batal"**
- Hanya bisa dilakukan oleh **Owner**, **Admin**, atau **Member**

### Edit Divisi

- Klik menu "..." pada header divisi → **"Edit Divisi"**
- Edit inline nama dan warna divisi
- Hanya bisa dilakukan oleh **Owner**, **Admin**, atau **Member**

### Hapus Divisi

- Klik menu "..." pada header divisi → **"Hapus Divisi"**
- Semua anggota divisi tersebut akan dikeluarkan
- Soft delete: data disembunyikan
- Hanya bisa dilakukan oleh **Owner**, **Admin**, atau **Member**

---

## Operasi Anggota Divisi

### Tambah Anggota

- Klik menu "..." pada header divisi → **"Tambah Anggota"** atau tombol "Tambah Anggota" di divisi kosong
- Pencarian inline untuk memilih workspace member
- Member yang sudah ada di divisi tersebut tidak ditampilkan
- Default role: **member**

### Ubah Role

- Hover pada anggota → klik ikon mahkota (crown)
- Toggle antara **leader** dan **member**
- Leader ditandai dengan ikon mahkota kuning

### Hapus Anggota

- Hover pada anggota → klik ikon hapus (UserMinus)
- Anggota langsung dikeluarkan dari divisi

### Pindah Anggota

- Hover pada anggota → klik ikon pindah (ArrowRightLeft)
- Dialog muncul untuk memilih divisi tujuan
- Anggota dipindahkan beserta role-nya
- Hanya tersedia jika event memiliki lebih dari satu divisi

---

## Auto-Sync Participants

Setiap kali terjadi perubahan anggota divisi (tambah, hapus, pindah, hapus divisi), sistem otomatis:

1. Mengagregasi semua `userId` unik dari seluruh divisi non-deleted
2. Memperbarui field `event.participants` pada dokumen Event
3. Mengirim socket event untuk sinkronisasi real-time

Hal ini menjaga kompatibilitas mundur dengan fitur yang bergantung pada `event.participants`:
- Kalender view (warna event pada task)
- Kanban filter per event
- Event card (avatar stack peserta)
- Embedding content (daftar peserta di RAG)

---

## Tampilan

### Bagian Divisi di Tab Overview

Menggantikan card "Peserta" sebelumnya. Setiap divisi ditampilkan sebagai card collapsible:

```
┌─────────────────────────────────────────────────┐
│ ▼ ● Divisi Acara                          3  ⋯ │
│ ─────────────────────────────────────────────── │
│  [Avatar] Ahmad (leader)  👑    ↔  ✕           │
│  [Avatar] Budi                  ↔  ✕           │
│  [Avatar] Citra                 ↔  ✕           │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ ▶ ● Divisi Konsumsi                       2  ⋯ │
└─────────────────────────────────────────────────┘
```

### Empty State

Jika belum ada divisi, tampilkan pesan "Belum ada divisi" dengan tombol untuk membuat divisi pertama.

### Hak Akses

| Aksi                    | Owner | Admin | Member | Guest |
| ----------------------- | :---: | :---: | :----: | :---: |
| Lihat divisi & anggota  |  ✅   |  ✅   |   ✅   |  ✅   |
| Buat divisi             |  ✅   |  ✅   |   ✅   |  ❌   |
| Edit divisi             |  ✅   |  ✅   |   ✅   |  ❌   |
| Hapus divisi            |  ✅   |  ✅   |   ✅   |  ❌   |
| Tambah anggota          |  ✅   |  ✅   |   ✅   |  ❌   |
| Ubah role anggota       |  ✅   |  ✅   |   ✅   |  ❌   |
| Hapus anggota           |  ✅   |  ✅   |   ✅   |  ❌   |
| Pindah anggota          |  ✅   |  ✅   |   ✅   |  ❌   |

---

## Notifikasi

- Saat anggota ditambahkan ke divisi, ia menerima **notifikasi in-app**
- Saat anggota dihapus dari divisi, ia menerima **notifikasi in-app**
- Notifikasi **WhatsApp** juga dikirim (jika diaktifkan di preferensi user)

---

## Struktur Data

### Collection: `event_divisions`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId (ref: events)",
  "workspaceId": "ObjectId (ref: workspaces)",
  "name": "string (wajib, maks 100 karakter)",
  "description": "string (opsional, maks 500 karakter)",
  "color": "string (hex, opsional)",
  "members": [
    {
      "userId": "ObjectId (ref: users)",
      "role": "string (enum: leader, member)"
    }
  ],
  "order": "number (default: 0)",
  "createdBy": "ObjectId (ref: users)",
  "isDeleted": "boolean (default: false)",
  "deletedAt": "Date (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Indexes

- `(eventId, isDeleted)` — query divisi per event
- `(workspaceId, eventId)` — query per workspace
- `(members.userId)` — query divisi per user

---

## API Endpoints

| Method | Endpoint                                                                         | Deskripsi             | Akses   |
| ------ | -------------------------------------------------------------------------------- | --------------------- | ------- |
| GET    | `/api/workspaces/:id/events/:eventId/divisions`                                  | Daftar divisi         | Member+ |
| POST   | `/api/workspaces/:id/events/:eventId/divisions`                                  | Buat divisi           | Member+ |
| PUT    | `/api/workspaces/:id/events/:eventId/divisions/:divisionId`                      | Update divisi         | Member+ |
| DELETE | `/api/workspaces/:id/events/:eventId/divisions/:divisionId`                      | Hapus divisi (soft)   | Member+ |
| POST   | `/api/workspaces/:id/events/:eventId/divisions/:divisionId/members`              | Tambah anggota        | Member+ |
| PUT    | `/api/workspaces/:id/events/:eventId/divisions/:divisionId/members/:userId`      | Update role anggota   | Member+ |
| DELETE | `/api/workspaces/:id/events/:eventId/divisions/:divisionId/members/:userId`      | Hapus anggota         | Member+ |
| POST   | `/api/workspaces/:id/events/:eventId/divisions/:divisionId/members/:userId/move` | Pindah anggota        | Member+ |

### Request Body: POST (Buat divisi)

```json
{
  "name": "string (wajib)",
  "description": "string (opsional)",
  "color": "string hex (opsional)",
  "order": "number (opsional)"
}
```

### Request Body: POST (Tambah anggota)

```json
{
  "memberId": "string (ObjectId user, wajib)",
  "role": "string (leader|member, default: member)"
}
```

### Request Body: PUT (Update role)

```json
{
  "role": "string (leader|member, wajib)"
}
```

### Request Body: POST (Pindah anggota)

```json
{
  "targetDivisionId": "string (ObjectId divisi tujuan, wajib)"
}
```

### Response: GET list

```json
{
  "status": "success",
  "data": {
    "divisions": [
      {
        "_id": "...",
        "eventId": "...",
        "workspaceId": "...",
        "name": "Divisi Acara",
        "description": "",
        "color": "#8B5CF6",
        "members": [
          {
            "userId": { "_id": "...", "name": "...", "email": "...", "avatar": "..." },
            "role": "leader"
          }
        ],
        "order": 0,
        "createdBy": { "_id": "...", "name": "...", "email": "...", "avatar": "..." },
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

---

## Socket.io Events

| Event                           | Direction     | Payload                                                                              |
| ------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `event:division:created`        | Server → Room | `{ eventId, division, userId }`                                                      |
| `event:division:updated`        | Server → Room | `{ eventId, division, userId }`                                                      |
| `event:division:deleted`        | Server → Room | `{ eventId, divisionId, userId }`                                                    |
| `event:division:member:added`   | Server → Room | `{ eventId, divisionId, member, division, userId }`                                  |
| `event:division:member:removed` | Server → Room | `{ eventId, divisionId, memberId, division, userId }`                                |
| `event:division:member:updated` | Server → Room | `{ eventId, divisionId, member, division, userId }`                                  |
| `event:division:member:moved`   | Server → Room | `{ eventId, sourceDivisionId, targetDivisionId, memberId, sourceDivision, targetDivision, userId }` |

Room = `workspace:{workspaceId}`

---

## RAG / Embedding

Divisi event diindeks ke dalam sistem embedding untuk pencarian AI:

- **Source type**: `division`
- **Content builder**: `_buildDivisionContent(division, eventTitle)` — menggabungkan nama divisi, nama event, deskripsi, dan daftar anggota beserta role
- **Sync**: Create/update → `EmbeddingService.upsert()`, Delete → `EmbeddingService.remove()`
- **Full sync**: Termasuk dalam `syncWorkspace()` untuk re-index workspace

---

## Komponen Frontend

| Komponen                 | File                                                          | Deskripsi                                       |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------- |
| `EventDivisionsSection`  | `client/components/events/event-divisions-section.js`         | Komponen utama (list, create, edit, delete)      |
| `useEventDivisions`      | `client/hooks/use-event-divisions.js`                         | Hook CRUD + real-time sync                       |
| `EventOverviewTab`       | `client/components/events/event-overview-tab.js`              | Tab Overview (sekarang menggunakan Divisions)    |
