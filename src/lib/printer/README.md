# Printer Module — WebUSB Implementation

## Overview

Module ini menangani komunikasi langsung antara browser dan printer thermal ESC/POS menggunakan **WebUSB API**.

### Hardware Target

- **Printer**: Iware XS-80BT
- **Protocol**: ESC/POS Compatible
- **Connection**: USB (Class 7 - USB Printer Class)
- **Features**: Auto Cutter, Cash Drawer RJ-11
- **Device Info**:
  - USB Vendor ID: `0x0418`
  - Product ID: `0x5011`
  - Device Class: USB Printer Class (Class 7)

## Architecture

```
src/lib/printer/
├── types.ts           # Type definitions & error handling
├── escpos.ts          # ESC/POS command generator (pure functions)
├── receipt.ts         # Receipt & kitchen ticket builders
├── webusb.ts          # WebUSB transport layer ⭐ NEW
├── printer.ts         # PrinterManager singleton (public API)
└── index.ts           # Public exports
```

## Key Changes from Web Serial

### Before (Web Serial)
```typescript
// webserial.ts - tidak dapat berfungsi dengan USB Printer Class
navigator.serial.requestPort()  // ❌ Printer tidak muncul di dialog
```

### After (WebUSB)
```typescript
// webusb.ts - komunikasi langsung dengan USB Printer Class
navigator.usb.requestDevice({ filters: [
  { vendorId: 0x0418, productId: 0x5011 }  // ✅ Filter printer USB
]})
device.transferOut(endpoint, data)         // ✅ Transfer ESC/POS bytes
```

## Public API

API publik **tidak berubah** — semua komponen tetap menggunakan interface yang sama:

```typescript
import { printer } from '@/lib/printer';

// Connection
await printer.connect()       // Dialog WebUSB muncul
await printer.reconnect()     // Auto-reconnect tanpa dialog
await printer.disconnect()

// Printing
await printer.printReceipt(transaction)
await printer.printKitchenTicket(transaction)
await printer.openCashDrawer()
await printer.testPrint()

// Configuration
printer.setPaperWidth(80)
printer.setDrawerPin('pin2')
printer.getInfo()
```

## Browser Support

- ✅ **Google Chrome** (v61+)
- ✅ **Microsoft Edge** (Chromium)
- ❌ Firefox (WebUSB not implemented)
- ❌ Safari (WebUSB not implemented)

## How It Works

### 1. Device Discovery & Permission

```typescript
// Pertama kali connect
const device = await navigator.usb.requestDevice({
  filters: [{ vendorId: 0x0418, productId: 0x5011 }]
});
```

Browser menampilkan dialog dengan daftar printer USB yang match dengan filter.

### 2. Auto Reconnect

```typescript
// Reconnect tanpa dialog (permission sudah ada)
const devices = await navigator.usb.getDevices();
const device = devices.find(d => d.vendorId === 0x0418);
```

### 3. Data Transfer

```typescript
await device.open()
await device.selectConfiguration(1)
await device.claimInterface(interfaceNumber)
await device.transferOut(endpoint, escposBytes)
await device.releaseInterface(interfaceNumber)
await device.close()
```

Device dibuka dan ditutup per-job untuk menghindari konflik state.

### 4. Endpoint Detection

Module secara otomatis mencari:
1. Interface Printer Class (Class 7, Subclass 1)
2. Endpoint OUT pertama pada interface tersebut
3. Fallback ke endpoint OUT pertama jika Printer Class tidak ditemukan

## Cash Drawer Integration

Cash drawer **tidak menggunakan komunikasi terpisah**. Perintah kick drawer dikirim dalam satu stream ESC/POS:

```
Print Receipt
    ↓
Feed Paper
    ↓
Cut Paper
    ↓
Kick Drawer (ESC p)
```

Semua dalam satu `transferOut()` call, tidak ada race condition.

## Error Handling

Module menangani berbagai kondisi error:

| Error Code | Deskripsi |
|------------|-----------|
| `UNSUPPORTED_BROWSER` | Browser tidak support WebUSB |
| `NO_PERMISSION` | User cancel dialog / permission ditolak |
| `NO_PRINTER` | Device tidak ditemukan |
| `PORT_BUSY` | Interface sudah claimed |
| `PORT_DISCONNECTED` | Printer dicabut saat operasi |
| `PRINT_FAILED` | Transfer gagal |

## Storage & Persistence

```typescript
localStorage.setItem('nadi_printer_device_info', JSON.stringify({
  vendorId: 0x0418,
  productId: 0x5011,
  label: 'USB Printer'
}))
```

Info device disimpan untuk reconnect otomatis. **USBDevice object tidak disimpan** karena tidak serializable — module menggunakan `getDevices()` untuk reconnect.

## Adding New Printers

Untuk menambah printer lain, edit filter di `webusb.ts`:

```typescript
const PRINTER_FILTERS: USBDeviceFilter[] = [
  { vendorId: 0x0418, productId: 0x5011 }, // Iware XS-80BT
  { vendorId: 0x04b8, productId: 0x0202 }, // Epson TM-T88
  { vendorId: 0x0dd4, productId: 0x0205 }, // Custom printer
];
```

## Security Notes

1. **User permission required**: WebUSB membutuhkan user action (klik) untuk membuka dialog
2. **HTTPS only**: WebUSB hanya bekerja di HTTPS (kecuali localhost)
3. **No automatic access**: Browser tidak memberi akses otomatis ke device tanpa user consent

## Testing

```typescript
// Settings page
await printer.connect()      // Buka dialog, pilih printer
await printer.testPrint()    // Cetak test receipt
await printer.openDrawer()   // Test cash drawer

// POS checkout
await printer.printReceipt({
  invoiceNumber: 'INV-001',
  storeName: 'Toko ABC',
  items: [...],
  grandTotal: 100000,
  paymentMethod: 'cash',
  // ...
})
```

## Migration Notes

### Files Removed
- ❌ `webserial.ts` — Web Serial implementation (tidak berfungsi dengan USB Printer Class)

### Files Added
- ✅ `webusb.ts` — WebUSB transport layer

### Files Modified
- `printer.ts` — Import dari `webusb` instead of `webserial`
- `index.ts` — Export `isWebUSBSupported` instead of `isWebSerialSupported`
- `Settings.tsx` — Import dan display text updated

### Breaking Changes
**None** — Public API tetap sama, hanya transport layer yang diganti.

## Future Enhancements

1. **Multiple transport support**:
   ```typescript
   interface Transport {
     connect(): Promise<void>
     write(data: Uint8Array): Promise<void>
     disconnect(): Promise<void>
   }
   
   class WebUSBTransport implements Transport { ... }
   class WebSerialTransport implements Transport { ... }
   class BluetoothTransport implements Transport { ... }
   ```

2. **Printer profiles**: Simpan multiple printer dengan label berbeda
3. **Advanced QR codes**: Error correction level configuration
4. **Logo printing**: Bitmap image support

## References

- [WebUSB API Specification](https://wicg.github.io/webusb/)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/)
- [USB Printer Class Specification](https://www.usb.org/document-library/usb-device-class-definition-printing-devices-v11)
