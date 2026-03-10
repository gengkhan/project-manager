# 📝 Fitur 24 — Event Notes (Catatan Event)

## Ringkasan

Setiap event dapat memiliki banyak catatan (notes) yang berisi teks kaya dengan dukungan @mention. Catatan menggunakan komponen `MentionEditor` (BlockNote.js) sehingga mendukung formatting (bold, italic, list, heading), slash commands, dan mention user workspace. Fitur ini ditampilkan sebagai tab **"Notes"** di halaman detail event, di antara tab Task dan Spreadsheet.

---

## Lokasi

| Lokasi                     | Modul | Detail                                    |
| -------------------------- | ----- | ----------------------------------------- |
| Halaman detail event       | Event | Tab "Notes" di detail event               |

---

## Operasi Catatan

### Buat Catatan Baru

- Klik tombol **"Tambah Catatan"** di tab Notes
- Form muncul inline di atas daftar catatan
- Input **judul** (opsional, maks 200 karakter)
- **MentionEditor** untuk isi catatan (wajib)
  - Mendukung `@mention` untuk menyebut member workspace
  - Mendukung slash commands (`/`) untuk heading, list, table, dll
  - Mendukung formatting toolbar (bold, italic, underline, highlight)
- Tombol **"Simpan"** atau **"Batal"**

### Edit Catatan

- Hover kartu catatan → menu "..." → **"Edit"**
- Catatan masuk mode edit inline (form replace kartu)
- Hanya bisa dilakukan oleh **penulis catatan** atau **Admin/Owner**
- Setelah save, catatan diperbarui langsung

### Hapus Catatan

- Hover kartu catatan → menu "..." → **"Hapus"**
- Dialog konfirmasi muncul
- Hanya bisa dilakukan oleh **penulis catatan** atau **Admin/Owner**
- Soft delete: data disembunyikan

---

## Tampilan

### Tab Notes di Detail Event

Tab kelima di halaman detail event (setelah Task, sebelum Spreadsheet) dengan ikon `StickyNote`.

### Kartu Catatan

```
┌─────────────────────────────────────────────┐
│ [Avatar] Nama User         3 jam lalu  ...  │
│                                             │
│ Judul Catatan (jika ada)                    │
│                                             │
│ Isi catatan dengan rich text. Bisa ada      │
│ @mention dan berbagai formatting.           │
└─────────────────────────────────────────────┘
```

### Empty State

Jika belum ada catatan, tampilkan pesan "Belum ada catatan" dengan tombol untuk menambahkan catatan pertama.

### Hak Akses

| Aksi              | Owner | Admin | Member | Guest |
| ----------------- | :---: | :---: | :----: | :---: |
| Lihat catatan     |  ✅   |  ✅   |   ✅   |  ✅   |
| Buat catatan      |  ✅   |  ✅   |   ✅   |  ❌   |
| Edit catatan      |  ✅   |  ✅   |  ✅*   |  ❌   |
| Hapus catatan     |  ✅   |  ✅   |  ✅*   |  ❌   |

*Member hanya bisa edit/hapus catatan milik sendiri.

---

## Mention di Catatan

- Ketik `@` di MentionEditor → dropdown autocomplete member workspace
- User yang di-mention menerima **notifikasi in-app**
- User yang di-mention menerima **notifikasi WhatsApp** (jika diaktifkan)
- Mention ditampilkan sebagai badge berwarna yang bisa diklik ke profil
- Saat edit catatan, hanya mention **baru** yang memicu notifikasi (mention lama diabaikan)

---

## Struktur Data

### Collection: `event_notes`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId (ref: events)",
  "workspaceId": "ObjectId (ref: workspaces)",
  "authorId": "ObjectId (ref: users)",
  "title": "string (opsional, maks 200 karakter)",
  "content": "string (BlockNote JSON)",
  "mentions": [
    {
      "userId": "ObjectId",
      "name": "string"
    }
  ],
  "isDeleted": "boolean (default: false)",
  "deletedAt": "Date (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Indexes

- `(eventId, isDeleted, createdAt)` — query catatan per event
- `(workspaceId, createdAt)` — query per workspace

---

## API Endpoints

| Method | Endpoint                                                        | Deskripsi          | Akses          |
| ------ | --------------------------------------------------------------- | ------------------ | -------------- |
| GET    | `/api/workspaces/:id/events/:eventId/notes`                     | Daftar catatan     | Member+        |
| POST   | `/api/workspaces/:id/events/:eventId/notes`                     | Buat catatan baru  | Member+        |
| GET    | `/api/workspaces/:id/events/:eventId/notes/:noteId`             | Detail catatan     | Member+        |
| PUT    | `/api/workspaces/:id/events/:eventId/notes/:noteId`             | Update catatan     | Author/Admin+  |
| DELETE | `/api/workspaces/:id/events/:eventId/notes/:noteId`             | Hapus catatan      | Author/Admin+  |

### Request Body: POST / PUT

```json
{
  "title": "string (opsional)",
  "content": "string (BlockNote JSON, wajib)"
}
```

### Response: GET list

```json
{
  "status": "success",
  "data": {
    "notes": [
      {
        "_id": "...",
        "eventId": "...",
        "workspaceId": "...",
        "authorId": { "_id": "...", "name": "...", "email": "...", "avatar": "..." },
        "title": "...",
        "content": "...",
        "mentions": [...],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

---

## Socket.io Events

| Event                    | Direction     | Payload                                    |
| ------------------------ | ------------- | ------------------------------------------ |
| `event:note:created`     | Server → Room | `{ eventId, note, userId }`                |
| `event:note:updated`     | Server → Room | `{ eventId, note, userId }`                |
| `event:note:deleted`     | Server → Room | `{ eventId, noteId, userId }`              |

Room = `workspace:{workspaceId}`

---

## RAG / Embedding

Catatan event diindeks ke dalam sistem embedding untuk pencarian AI:

- **Source type**: `event_note`
- **Content builder**: `_buildEventNoteContent(note, eventTitle)` — menggabungkan judul catatan + isi teks (parsed dari BlockNote JSON) + nama event
- **Sync**: Create/update → `EmbeddingService.upsert()`, Delete → `EmbeddingService.remove()`
- **Full sync**: Termasuk dalam `syncWorkspace()` untuk re-index workspace

---

## Komponen Frontend

| Komponen          | File                                                | Deskripsi                                 |
| ----------------- | --------------------------------------------------- | ----------------------------------------- |
| `EventNotesTab`   | `client/components/events/event-notes-tab.js`       | Tab komponen utama (list, create, edit)    |
| `useEventNotes`   | `client/hooks/use-event-notes.js`                   | Hook CRUD + real-time sync                 |
| `MentionEditor`   | `client/components/mention-editor.js`               | Rich text editor dengan @mention (reused)  |
| `MentionReadOnly` | `client/components/mention-editor.js`               | Read-only renderer (reused)                |
