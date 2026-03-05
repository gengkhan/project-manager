# 🧩 Fitur 11 — Widget Diagram (Brainstorming)

## Ringkasan

Widget di brainstorming canvas untuk membuat **diagram freeform** yang memetakan ide, alur, dan hubungan secara visual. Pengguna bisa meletakkan berbagai bentuk di mana saja, menghubungkannya secara bebas ke segala arah, memberi label pada koneksi, dan mengkustomisasi semua aspek — tanpa dibatasi hierarki pohon (parent-child). Terinspirasi dari **Draw.io** dan **FigJam**.

---

## Tampilan Widget

### Ukuran Default

- Width: 600px
- Height: 500px
- Resizable (minimum: 300x250)

### Header Widget

| Elemen     | Deskripsi                            |
| ---------- | ------------------------------------ |
| Ikon       | 🧩 (diagram icon)                    |
| Judul      | "Diagram" (editable)                 |
| Menu "..." | Lock, Collapse, Layer, Hapus, Export |

---

## Operasi Node (Shape)

### Buat Node

| Cara                         | Hasil                                      |
| ---------------------------- | ------------------------------------------ |
| Double-klik area kosong      | Buat node baru (bentuk default: rectangle) |
| Klik tombol shape di Palette | Buat node dengan bentuk tertentu           |
| Drag dari palette ke canvas  | Buat node di posisi drop                   |

### Edit Node

- **Double-klik** node untuk masuk mode edit teks
- Teks bisa multi-line (Shift+Enter untuk baris baru)
- **Enter** untuk selesai edit
- **Escape** untuk batal edit

### Hapus Node

- Select node → tekan **Delete** key
- Atau klik kanan → Hapus Node
- Koneksi terkait otomatis terhapus

### Move Node

- Drag node ke posisi lain
- Garis koneksi mengikuti otomatis

---

## Bentuk Node (Shapes)

| Bentuk        | Deskripsi                                      |
| ------------- | ---------------------------------------------- |
| Rectangle     | Persegi panjang dengan sudut tajam (default)   |
| Rounded Rect  | Persegi panjang dengan sudut membulat          |
| Ellipse       | Oval / lingkaran                               |
| Diamond       | Bentuk belah ketupat (decision shape)          |
| Parallelogram | Jajar genjang (input/output shape)             |
| Hexagon       | Segi enam                                      |
| Triangle      | Segitiga                                       |
| Sticky Note   | Catatan tempel (kuning default, lipatan sudut) |

---

## Koneksi Antar Node (Edges)

Semua koneksi bersifat freeform — bisa dibuat dari node mana pun ke node mana pun, ke segala arah.

### Membuat Koneksi

- Hover di tepi node → muncul **connection point** (handle) di 4 sisi
- Klik dan drag dari handle → drag ke handle node lain
- Garis koneksi terbentuk antara kedua node

### Properti Koneksi

| Properti   | Opsi                           |
| ---------- | ------------------------------ |
| Gaya garis | Solid, dashed, dotted          |
| Warna      | Color picker (hex)             |
| Arrow      | None, one-way (→), two-way (↔) |
| Label      | Teks opsional di tengah garis  |

### Label Koneksi

- Klik label untuk edit teks
- Label muncul di tengah garis koneksi
- Bisa dikosongkan

### Hapus Koneksi

- Klik garis → tekan Delete
- Atau klik kanan garis → Hapus Koneksi

---

## Kustomisasi Node

### Properti Visual

| Properti | Opsi                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| Warna    | Background color picker (palet + custom hex)                                        |
| Bentuk   | Rectangle, Rounded, Ellipse, Diamond, Parallelogram, Hexagon, Triangle, Sticky Note |
| Ukuran   | Small, Medium (default), Large                                                      |
| Border   | Solid, Dashed, None                                                                 |
| Ikon     | Pilih dari set ikon (Lucide icon name)                                              |

### Context Menu (Klik Kanan Node)

- Ubah Warna
- Ubah Bentuk
- Ubah Ukuran
- Tambah/Ubah Ikon
- Duplikasi Node
- Hubungkan ke Node Lain
- Hapus Node

---

## Auto-Arrange

- Tombol **"Auto Arrange"** di toolbar
- Meng-arrange semua node secara otomatis menggunakan dagre layout
- Berguna untuk merapikan diagram yang berantakan
- Setelah auto-arrange, node bisa di-move secara manual

---

## Export Diagram

- Menu "..." → **Export PNG**
- Export hanya area diagram widget ini (bukan seluruh canvas)
- Resolusi tinggi (2x scale)

---

## Struktur Data Widget (field `data`)

```json
{
  "title": "string (custom title, default: 'Diagram')",
  "nodes": [
    {
      "_id": "string",
      "text": "string",
      "x": "number (posisi dalam widget)",
      "y": "number",
      "shape": "string (rectangle|rounded|ellipse|diamond|parallelogram|hexagon|triangle|sticky-note)",
      "size": "string (small|medium|large)",
      "color": "string (hex)",
      "borderStyle": "string (solid|dashed|none)",
      "icon": "string (lucide icon name, nullable)",
      "width": "number (optional, custom width when resized)",
      "height": "number (optional, custom height when resized)"
    }
  ],
  "edges": [
    {
      "_id": "string",
      "source": "string (nodeId)",
      "target": "string (nodeId)",
      "label": "string (nullable)",
      "lineStyle": "string (solid|dashed|dotted)",
      "color": "string (hex)",
      "arrowType": "string (none|one-way|two-way)"
    }
  ]
}
```
