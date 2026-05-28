# 🎨 PURCHASES PAGE - VISUAL FEATURE GUIDE

## 📸 FEATURE OVERVIEW

### **BEFORE** (Old Version)
```
┌─────────────────────────────────────────────────────────┐
│ RIWAYAT KULAKAN TABLE                                   │
├──────────┬─────────┬──────────┬────────┬────────┬───────┤
│ Ref      │ Tanggal │ Supplier │ Bukti  │ Total  │ Aksi  │
├──────────┼─────────┼──────────┼────────┼────────┼───────┤
│ PO-001   │ 20/5/26 │ Toko A   │ [Ada]  │ 500K   │ [👁️] │
│ PO-002   │ 19/5/26 │ Toko B   │ [Tidak]│ 300K   │ [👁️] │
└──────────┴─────────┴──────────┴────────┴────────┴───────┘

❌ Badge "Ada" tidak bisa diklik
❌ Tidak ada tombol hapus
❌ Detail tidak menampilkan gambar bukti
```

### **AFTER** (New Version)
```
┌─────────────────────────────────────────────────────────┐
│ RIWAYAT KULAKAN TABLE                                   │
├──────────┬─────────┬──────────┬────────┬────────┬───────┤
│ Ref      │ Tanggal │ Supplier │ Bukti  │ Total  │ Aksi  │
├──────────┼─────────┼──────────┼────────┼────────┼───────┤
│ PO-001   │ 20/5/26 │ Toko A   │ [Ada]🖱️│ 500K   │ [👁️] │
│ PO-002   │ 19/5/26 │ Toko B   │ [Tidak]│ 300K   │ [👁️] │
└──────────┴─────────┴──────────┴────────┴────────┴───────┘
                                   ↓ KLIK
                    ┌──────────────────────────┐
                    │  BUKTI PEMBELIAN         │
                    │  ┌────────────────────┐  │
                    │  │                    │  │
                    │  │   [GAMBAR BUKTI]   │  │
                    │  │                    │  │
                    │  └────────────────────┘  │
                    │         [Tutup]          │
                    └──────────────────────────┘

✅ Badge "Ada" bisa diklik → Buka gambar
✅ Tombol hapus untuk Owner
✅ Detail menampilkan gambar bukti
```

---

## 🎯 FEATURE 1: DELETE PURCHASE (Owner Only)

### Visual Flow:
```
[Klik Eye Icon] → [Detail Dialog Opens]
                         ↓
    ┌────────────────────────────────────────┐
    │ DETAIL PEMBELIAN                       │
    ├────────────────────────────────────────┤
    │ Referensi: PO-001                      │
    │ Tanggal: 20 Mei 2026                   │
    │ Supplier: Toko A                       │
    │ Total: Rp 500.000                      │
    ├────────────────────────────────────────┤
    │ BUKTI PEMBELIAN                        │
    │ [GAMBAR STRUK]                         │
    ├────────────────────────────────────────┤
    │ ITEM PEMBELIAN                         │
    │ • Produk A x10 = Rp 300.000           │
    │ • Produk B x5  = Rp 200.000           │
    ├────────────────────────────────────────┤
    │ [🗑️ Hapus Riwayat]      [Tutup]       │
    └────────────────────────────────────────┘
              ↓ KLIK (Owner only)
    ┌────────────────────────────────────────┐
    │ ⚠️  KONFIRMASI                         │
    │                                        │
    │ Yakin ingin menghapus pembelian        │
    │ PO-001?                                │
    │                                        │
    │ Data ini tidak dapat dikembalikan.     │
    │                                        │
    │     [Batal]        [OK]                │
    └────────────────────────────────────────┘
              ↓ KLIK OK
    ✅ Riwayat pembelian berhasil dihapus
```

### Role-Based Display:
```
┌─────────────────────────────────────────────────────┐
│ OWNER VIEW:                                         │
│ [🗑️ Hapus Riwayat]                    [Tutup]     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ADMIN/CASHIER VIEW:                                 │
│                                        [Tutup]      │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 FEATURE 2: CLICKABLE "ADA" BADGE

### Visual Flow:
```
TABLE VIEW:
┌──────────────────────────────────────┐
│ Bukti Column                         │
├──────────────────────────────────────┤
│ [Ada] 🖱️ ← Hover: cursor pointer    │
│         ← Hover: background darker   │
└──────────────────────────────────────┘
         ↓ KLIK
┌──────────────────────────────────────────────┐
│ BUKTI PEMBELIAN                    [X]       │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │                                        │ │
│  │                                        │ │
│  │         [GAMBAR BUKTI STRUK]          │ │
│  │         (Full Size Display)           │ │
│  │                                        │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                              │
│                          [Tutup]             │
└──────────────────────────────────────────────┘
```

### Badge States:
```
┌─────────────────────────────────────────┐
│ HAS IMAGE:                              │
│ [Ada] 🖱️ ← Blue badge, clickable       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ NO IMAGE:                               │
│ [Tidak ada] ← Gray badge, not clickable │
└─────────────────────────────────────────┘
```

---

## 🎯 FEATURE 3: IMAGE IN DETAIL DIALOG

### Visual Layout:
```
┌────────────────────────────────────────────────────┐
│ DETAIL PEMBELIAN                         [X]       │
├────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐        │
│ │ Referensi        │  │ Tanggal          │        │
│ │ PO-001           │  │ 20 Mei 2026      │        │
│ └──────────────────┘  └──────────────────┘        │
│ ┌──────────────────┐  ┌──────────────────┐        │
│ │ Supplier         │  │ Total            │        │
│ │ Toko A           │  │ Rp 500.000       │        │
│ └──────────────────┘  └──────────────────┘        │
├────────────────────────────────────────────────────┤
│ BUKTI PEMBELIAN                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │                                                │ │
│ │         [GAMBAR STRUK PEMBELIAN]              │ │
│ │         (Max Height: 256px)                   │ │
│ │         🖱️ Clickable                          │ │
│ │                                                │ │
│ └────────────────────────────────────────────────┘ │
│ Klik gambar untuk memperbesar                      │
├────────────────────────────────────────────────────┤
│ CATATAN                                            │
│ Pembelian rutin bulanan                            │
├────────────────────────────────────────────────────┤
│ ITEM PEMBELIAN                                     │
│ • Minyak Goreng x10 = Rp 300.000                  │
│ • Gula Pasir x5 = Rp 200.000                      │
├────────────────────────────────────────────────────┤
│ [🗑️ Hapus Riwayat]                    [Tutup]    │
└────────────────────────────────────────────────────┘
                ↓ KLIK GAMBAR
┌────────────────────────────────────────────────────┐
│ BUKTI PEMBELIAN (Full Screen)         [X]         │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │                                              │ │
│  │                                              │ │
│  │                                              │ │
│  │         [GAMBAR BUKTI STRUK]                │ │
│  │         (Max Height: 70vh)                  │ │
│  │         (Full Width Display)                │ │
│  │                                              │ │
│  │                                              │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│                                    [Tutup]         │
└────────────────────────────────────────────────────┘
```

---

## 🎨 STYLING DETAILS

### Badge Styling:
```css
/* "Ada" Badge (Has Image) */
- variant="default" (Blue)
- cursor-pointer
- hover:bg-primary/80
- gap-1 (icon spacing)
- Icon: ImagePlus

/* "Tidak ada" Badge (No Image) */
- variant="secondary" (Gray)
- Not clickable
- No hover effect
```

### Image Display:
```css
/* In Detail Dialog */
- max-h-64 (256px max height)
- object-contain (maintain aspect ratio)
- bg-muted (background)
- cursor-pointer (clickable)
- hover:opacity-90 (hover effect)
- border + rounded-lg

/* In Full Screen Viewer */
- max-h-[70vh] (70% viewport height)
- object-contain
- bg-muted
- w-full
- max-w-4xl (modal width)
```

### Delete Button:
```css
/* Owner Only */
- variant="destructive" (Red)
- size="sm"
- gap-2 (icon spacing)
- Icon: Trash2
- Position: bottom-left
```

---

## 🔄 USER INTERACTION FLOWS

### Flow 1: View Image from Table
```
1. User sees purchase list
2. Sees "Ada" badge in Bukti column
3. Hovers → cursor changes, background darkens
4. Clicks badge
5. Image Viewer Modal opens
6. Views full-size image
7. Clicks "Tutup" to close
```

### Flow 2: View Image from Detail
```
1. User clicks Eye icon on purchase row
2. Detail Dialog opens
3. Sees "Bukti Pembelian" section
4. Sees image preview (max 256px height)
5. Reads helper text "Klik gambar untuk memperbesar"
6. Clicks image
7. Full-screen Image Viewer opens
8. Views full-size image (70vh)
9. Clicks "Tutup" to close viewer
10. Back to Detail Dialog
```

### Flow 3: Delete Purchase (Owner)
```
1. Owner clicks Eye icon on purchase row
2. Detail Dialog opens
3. Sees red "Hapus Riwayat" button (bottom-left)
4. Clicks delete button
5. Confirmation dialog appears
6. Reads warning: "Data ini tidak dapat dikembalikan"
7. Clicks "OK" to confirm
8. Purchase deleted from database
9. Success toast appears
10. Dialog closes
11. Purchase list reloads (deleted item gone)
```

### Flow 4: Delete Attempt (Non-Owner)
```
1. Admin/Cashier clicks Eye icon
2. Detail Dialog opens
3. NO delete button visible
4. Only "Tutup" button available
5. Cannot delete purchase
```

---

## 📱 RESPONSIVE DESIGN

### Desktop (>768px):
```
┌────────────────────────────────────────────────────┐
│ Detail Dialog: max-w-2xl (672px)                   │
│ Image Viewer: max-w-4xl (896px)                    │
│ Image Height: max-h-64 (detail), max-h-[70vh] (viewer) │
└────────────────────────────────────────────────────┘
```

### Mobile (<768px):
```
┌──────────────────────────────────┐
│ Dialog: Full width with padding │
│ Image: Responsive width          │
│ Buttons: Stack vertically        │
└──────────────────────────────────┘
```

---

## ✅ TESTING SCENARIOS

### Scenario 1: Owner Delete
- [x] Login as Owner
- [x] Open purchase detail
- [x] See delete button
- [x] Click delete
- [x] Confirm deletion
- [x] Purchase deleted
- [x] Toast shows success

### Scenario 2: Admin Cannot Delete
- [x] Login as Admin
- [x] Open purchase detail
- [x] Delete button NOT visible
- [x] Only close button available

### Scenario 3: View Image from Badge
- [x] Click "Ada" badge
- [x] Image viewer opens
- [x] Image displays correctly
- [x] Close button works

### Scenario 4: View Image from Detail
- [x] Open detail dialog
- [x] Image section visible
- [x] Click image
- [x] Full-screen viewer opens
- [x] Image displays correctly

### Scenario 5: No Image
- [x] Purchase without image
- [x] Badge shows "Tidak ada"
- [x] Badge not clickable
- [x] Detail dialog has no image section

---

## 🎉 COMPLETION SUMMARY

| Feature | Implementation | UI/UX | Testing |
|---------|---------------|-------|---------|
| Delete Purchase | ✅ | ✅ | Ready |
| Clickable Badge | ✅ | ✅ | Ready |
| Image in Detail | ✅ | ✅ | Ready |

**ALL FEATURES COMPLETE AND READY FOR USER TESTING** 🚀
