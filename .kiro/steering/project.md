---
inclusion: always
---

# Life Dashboard — RevoU Coding Camp Mini Project

## Identitas Proyek
- **Nama**     : Rakesa
- **Tanggal**  : 12 Oktober 2026
- **Proyek**   : Mini Project - Life Dashboard

## Struktur File
```
CodingCamp-12Oktober-Rakesa/
├── index.html          # Halaman utama
├── css/
│   └── style.css       # Styling & theming (CSS Variables, dark mode)
├── js/
│   └── app.js          # Logika JavaScript (vanilla JS)
└── .kiro/
    ├── settings/
    │   └── mcp.json
    └── steering/
        └── project.md
```

## Fitur MVP
1. **Jam Live + Greeting** — Jam real-time dengan sapaan dinamis (Pagi/Siang/Sore/Malam)
2. **Focus Timer (Pomodoro)** — Timer 25 menit yang bisa dikustomisasi, dengan Start/Stop/Reset
3. **To-Do List** — Tambah, centang, dan hapus tugas, disimpan di localStorage, cegah duplikat
4. **Quick Links** — Tambah dan hapus shortcut URL, disimpan di localStorage
5. **Dark Mode** — Toggle tema terang/gelap, preferensi disimpan di localStorage

## Aturan Koding
- Gunakan vanilla HTML, CSS, dan JavaScript (tanpa framework/library eksternal kecuali Google Fonts)
- Tidak ada inline event handler (`onclick`, `onchange`) di HTML — semua event listener dipasang via JS
- Semua data pengguna disimpan di `localStorage`
- CSS menggunakan custom properties (variables) untuk konsistensi tema
- Responsive: layout menyesuaikan di layar ≤768px
