# Arsitektur Transport Printer

## Tujuan

Aplikasi POS memiliki **dua transport printer** yang hidup berdampingan:
- **WebUSB** (untuk Linux, direct USB connection)
- **Web Serial** (untuk Bluetooth / COM port, terutama Windows)

**User yang memilih transport melalui UI, bukan aplikasi yang auto-detect.**

## Prinsip Desain

### ❌ TIDAK BOLEH
- Auto-detection berdasarkan OS (Windows/Linux)
- Auto-switching transport
- Fallback otomatis ke transport lain
- Logic seperti: `if (Windows) use WebSerial; if (Linux) use WebUSB`

### ✅ HARUS
- User memilih transport via UI
- Aplikasi hanya meneruskan ke transport aktif
- Satu transport aktif pada satu waktu
- State transport disimpan di localStorage

## Diagram Alur

### User memilih USB:
```
┌─────────────────────┐
│   TransportSelector │
│   [USB] Bluetooth   │ ← User klik USB
└──────────┬──────────┘
           │
           ▼
┌──────────────────────┐
│   PrinterManager     │
│   setTransport("usb")│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  WebUSBTransport     │
│  connect()           │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Printer Device      │
└──────────────────────┘
```

### User memilih Bluetooth:
```
┌─────────────────────┐
│   TransportSelector │
│   USB [Bluetooth]   │ ← User klik Bluetooth
└──────────┬──────────┘
           │
           ▼
┌──────────────────────┐
│   PrinterManager     │
│   setTransport("serial")│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  WebSerialTransport  │
│  connect()           │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Printer Device      │
│  (via COM port)      │
└──────────────────────┘
```

### Saat print receipt:
```
┌─────────────────────┐
│   ReceiptModal      │
│   printer.printReceipt() │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────┐
│   printer.ts         │
│   (backward compat)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   PrinterManager     │
│   activeTransport    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Active Transport    │
│  (USB or Serial)     │
└──────────────────────┘
```

## Struktur File

### Core Files
```
src/lib/printer/
├── types.ts              # Type definitions
├── transport.ts          # Interface PrinterTransport
├── printerManager.ts     # Koordinasi semua transport
├── printer.ts            # Backward compatibility layer
├── receipt.ts            # Receipt builder
├── escpos.ts             # ESC/POS commands
└── transports/
    ├── webusb.ts         # WebUSB implementation
    └── webserial.ts      # Web Serial implementation
```

### UI Components
```
src/components/pos/
└── TransportSelector.tsx # Segmented control untuk pilih transport

src/pages/
├── POS.tsx              # Header dengan TransportSelector
└── backoffice/
    └── Settings.tsx     # Menampilkan transport aktif
```

## PrinterManager API

### Transport Management
```typescript
// Set transport (user choice)
printerManager.setActiveTransport('webusb' | 'serial')

// Get available transports
printerManager.getAvailableTransports() // [WebUSBTransport, WebSerialTransport]

// Get active transport
printerManager.getActiveTransport() // WebUSBTransport | WebSerialTransport | null
```

### Connection
```typescript
// Connect ke transport aktif
await printerManager.connect()

// Disconnect dari transport aktif
await printerManager.disconnect()

// Check status
printerManager.isConnected() // boolean
```

### Printing
```typescript
// Print receipt (diteruskan ke transport aktif)
await printerManager.printReceipt(transaction)

// Open cash drawer
await printerManager.openCashDrawer()

// Test print
await printerManager.testPrint()
```

### Configuration
```typescript
// Paper width
printerManager.setPaperWidth(80 | 58)
printerManager.getPaperWidth()

// Drawer pin
printerManager.setDrawerPin('pin2' | 'pin5')

// Get config
printerManager.getConfig()
```

## TransportSelector UI

Segmented control di header POS:

```tsx
<TransportSelector />
```

Tampilan:
```
┌───────────────────────────────┐
│   USB   │   Bluetooth         │  (USB aktif)
└───────────────────────────────┘

┌───────────────────────────────┐
│   USB   │   Bluetooth         │  (Bluetooth aktif)
└───────────────────────────────┘
```

Behaviour:
- Saat klik USB → `setActiveTransport('webusb')` → `connect()`
- Saat klik Bluetooth → `setActiveTransport('serial')` → `connect()`
- Tidak ada fallback
- Tidak ada auto-reconnect ke transport lain

## Backward Compatibility

API lama tetap bekerja:

```typescript
// OLD API (masih berfungsi)
printer.connect()
printer.disconnect()
printer.printReceipt()
printer.openCashDrawer()
```

Secara internal, semua proxy ke `printerManager` dengan transport aktif.

## Settings Page

Menampilkan status transport aktif:

```
┌─────────────────────────────┐
│ Status      │ 🟢 Terhubung  │
│ Printer     │ USB Printer   │
│ Transport   │ USB           │  ← Dynamic, mengikuti pilihan user
└─────────────────────────────┘
```

atau

```
┌─────────────────────────────┐
│ Status      │ 🟢 Terhubung  │
│ Printer     │ Serial Port   │
│ Transport   │ Serial/Bluetooth │  ← Dynamic
└─────────────────────────────┘
```

## Flow User

### Pertama Kali
1. User buka POS
2. User klik segmented button "USB" atau "Bluetooth"
3. Browser menampilkan dialog pemilihan device
4. User pilih printer
5. Aplikasi connect dan menyimpan pilihan di localStorage

### Print Receipt
1. User checkout
2. Aplikasi panggil `printer.printReceipt()`
3. PrinterManager meneruskan ke transport aktif
4. Receipt tercetak

### Ganti Transport
1. User klik transport lain di header
2. Aplikasi disconnect dari transport lama
3. Aplikasi set transport baru
4. Aplikasi connect ke transport baru

## Tidak Ada Auto-Detection

Tidak ada kode seperti ini:
```typescript
// ❌ SALAH - tidak boleh ada
if (navigator.platform.includes('Win')) {
  useWebSerial()
} else {
  useWebUSB()
}
```

Semua keputusan transport berasal dari user via UI.

## Storage

Transport yang dipilih disimpan di:
```typescript
localStorage.setItem('nadi_printer_transport', 'webusb' | 'serial')
```

Saat aplikasi reload, transport terakhir akan otomatis aktif (tapi tidak auto-connect).

## Error Handling

Setiap transport memiliki error handling sendiri:

**WebUSB errors:**
- `NO_PERMISSION` → "Pemilihan printer dibatalkan"
- `UNSUPPORTED_BROWSER` → "Gunakan Chrome atau Edge"
- `PORT_BUSY` → "Printer sedang sibuk"

**WebSerial errors:**
- `NO_PERMISSION` → "Pemilihan port dibatalkan"
- `UNSUPPORTED_BROWSER` → "Gunakan Chrome atau Edge"
- `PORT_DISCONNECTED` → "Port terputus"

Tidak ada fallback ke transport lain saat error.

## Testing

Build test:
```bash
npm run build
```

Manual test:
1. Buka POS
2. Klik USB → verifikasi dialog WebUSB muncul
3. Klik Bluetooth → verifikasi dialog Web Serial muncul
4. Print receipt → verifikasi menggunakan transport yang dipilih
5. Cek Settings → verifikasi transport ditampilkan dengan benar

## Kesimpulan

✅ **User yang memilih transport**
✅ **Tidak ada auto-detection**
✅ **Tidak ada fallback otomatis**
✅ **Backward compatible**
✅ **Clean production code** (no debugging logs)
