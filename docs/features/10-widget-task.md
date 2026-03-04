# 🗂️ Fitur 10 — Widget Task (Brainstorming)

## Ringkasan

Widget di brainstorming canvas yang menampilkan satu **kartu task tunggal**. Data **terhubung langsung** ke modul Task utama — perubahan pada task (misal di Kanban/Kalender) otomatis terupdate di widget. Widget dapat digunakan untuk membuat _shortcut_ referensi ke suatu task penting.

---

## Tampilan Widget

## Tampilan Widget

### Ukuran Default

- Width: 320px
- Height: auto (menyesuaikan card)
- Resizable: tidak diperlukan jika hanya menampilkan card.

### Header Widget

| Elemen     | Deskripsi           |
| ---------- | ------------------- |
| Ikon       | 📋 (clipboard icon) |
| Judul      | "Task"              |
| Menu "..." | Lock, Layer, Hapus  |

---

## State "Belum Dihubungkan"

Jika widget belum memilih task, tampilkan:

- Teks "Pilih Task untuk ditampilkan di widget ini"
- Input pencarian autocomplete (Dropdown) untuk memilih task dari workspace.
- Atau tombol "Buat Task Baru" (Quick Create).

## State "Task Terpilih"

Menampilkan satu kartu task utama, mirip dengan `TaskCard`.

- Judul task
- Status / Kolom
- Assignee
- Due Date
- Prioritas
- Subtask progress
- Klik pada card akan membuka detail task di sebelah kanan layar (buka panel task).

---

## Sinkronisasi Data

| Aksi di Modul Task      | Efek di Widget                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| Task diedit             | Tampilan card di widget terupdate                                              |
| Task dihapus/diarsipkan | Widget kembali ke state "Belum Dihubungkan" (atau menampilkan status archived) |

---

## Struktur Data Widget (field `data`)

```json
{
  "taskId": "ObjectId (nullable)"
}
```
