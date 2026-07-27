/**
 * lib/printer/webusb.ts — WebUSB API transport layer.
 *
 * Flow:
 * - connect()  → requestDevice() → simpan info di localStorage
 * - reconnect() → getDevices() → tidak ada popup jika permission masih ada
 * - write()    → open() → selectConfiguration() → claimInterface() → transferOut()
 *
 * Device dibuka dan ditutup per-job untuk menghindari kondisi "device already open".
 *
 * Target printer:
 * - Iware XS-80BT (VID 0x0418, PID 0x5011)
 * - USB Printer Class (Class 7)
 */

import { PrinterError, PrinterConfig } from './types';

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nadi_printer_device_info';

// ── Supported printers ────────────────────────────────────────────────────────

/**
 * Filter untuk WebUSB requestDevice().
 * Saat ini hanya Iware XS-80BT, tapi mudah ditambah printer lain.
 */
const PRINTER_FILTERS: USBDeviceFilter[] = [
  { vendorId: 0x0418, productId: 0x5011 }, // Iware XS-80BT
  // Tambahkan printer lain di sini jika diperlukan
];

// ── Device info persistence ───────────────────────────────────────────────────

interface DeviceInfo {
  vendorId: number;
  productId: number;
  label: string;
}

export function saveDeviceInfo(info: DeviceInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function loadDeviceInfo(): DeviceInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDeviceInfo(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Capability check ──────────────────────────────────────────────────────────

export function isWebUSBSupported(): boolean {
  return 'usb' in navigator;
}

// ── Cached device (in-memory untuk satu sesi browser) ────────────────────────

let _cachedDevice: USBDevice | null = null;

export function getCachedDevice(): USBDevice | null {
  return _cachedDevice;
}

export function setCachedDevice(device: USBDevice | null): void {
  _cachedDevice = device;
}

export function getDeviceLabel(): string | null {
  if (!_cachedDevice) return null;
  return _cachedDevice.productName || 'USB Printer';
}

// ── Connect (requestDevice — muncul dialog) ───────────────────────────────────

/**
 * Minta user memilih printer dari dialog WebUSB.
 * Simpan device ke in-memory cache dan localStorage.
 * Melempar PrinterError jika dibatalkan atau tidak didukung.
 */
export async function connectViaRequest(): Promise<USBDevice> {
  if (!isWebUSBSupported()) {
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung WebUSB API. Gunakan Chrome atau Edge.',
    );
  }

  let device: USBDevice;
  try {
    device = await navigator.usb.requestDevice({ filters: PRINTER_FILTERS });
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      throw new PrinterError('NO_PERMISSION', 'Pemilihan printer dibatalkan.', err);
    }
    throw new PrinterError('NO_PRINTER', `Gagal memilih printer: ${err?.message}`, err);
  }

  _cachedDevice = device;
  saveDeviceInfo({
    vendorId: device.vendorId,
    productId: device.productId,
    label: device.productName || 'USB Printer',
  });

  return device;
}

// ── Reconnect (getDevices — tanpa dialog jika permission masih ada) ──────────

/**
 * Coba sambungkan ulang ke device yang sudah pernah diberi permission.
 * Returns device jika berhasil, null jika tidak ada device tersimpan.
 */
export async function reconnectViaCache(): Promise<USBDevice | null> {
  if (!isWebUSBSupported()) return null;

  try {
    const devices = await navigator.usb.getDevices();
    if (devices.length === 0) return null;

    // Ambil device pertama yang match dengan filter printer kita
    const device = devices.find(d =>
      PRINTER_FILTERS.some(f => f.vendorId === d.vendorId && f.productId === d.productId)
    );

    if (!device) return null;

    _cachedDevice = device;
    saveDeviceInfo({
      vendorId: device.vendorId,
      productId: device.productId,
      label: device.productName || 'USB Printer',
    });

    return device;
  } catch {
    return null;
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectDevice(): Promise<void> {
  if (_cachedDevice && _cachedDevice.opened) {
    try {
      await _cachedDevice.close();
    } catch {
      // Ignore close errors
    }
  }
  _cachedDevice = null;
  clearDeviceInfo();
}

// ── Find printer endpoint ─────────────────────────────────────────────────────

/**
 * Cari endpoint OUT pertama pada interface Printer Class.
 * USB Printer Class = Class 7, Subclass 1, Protocol 1 atau 2.
 * Biasanya endpoint 0x01 atau 0x02.
 */
function findPrinterEndpoint(device: USBDevice): number | null {
  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      // USB Printer Class: class 7, subclass 1
      if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
        // Cari endpoint OUT (direction = out)
        const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
        if (endpoint) return endpoint.endpointNumber;
      }
    }
  }

  // Fallback: cari endpoint OUT pertama
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
      if (endpoint) return endpoint.endpointNumber;
    }
  }

  return null;
}

/**
 * Cari interface number untuk Printer Class.
 * Biasanya interface 0.
 */
function findPrinterInterface(device: USBDevice): number | null {
  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
        return iface.interfaceNumber;
      }
    }
  }

  // Fallback: interface 0
  return device.configuration.interfaces[0]?.interfaceNumber ?? null;
}

// ── Write (buka → tulis → tutup) ──────────────────────────────────────────────

/**
 * Kirim raw ESC/POS bytes ke printer melalui WebUSB.
 * Device dibuka per-job (open/close) untuk mencegah "device already open" error.
 */
export async function writeToDevice(data: Uint8Array, config: PrinterConfig): Promise<void> {
  if (!isWebUSBSupported()) {
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung WebUSB API. Gunakan Chrome atau Edge.',
    );
  }

  // Ambil device dari cache, atau coba getDevices() tanpa dialog
  let device = _cachedDevice;
  if (!device) {
    const devices = await navigator.usb.getDevices();
    if (devices.length > 0) {
      device = devices.find(d =>
        PRINTER_FILTERS.some(f => f.vendorId === d.vendorId && f.productId === d.productId)
      ) || devices[0];
      _cachedDevice = device;
    }
  }

  if (!device) {
    throw new PrinterError(
      'NO_PRINTER',
      'Printer belum dipilih. Kunjungi Pengaturan → Printer untuk menghubungkan printer.',
    );
  }

  let opened = false;
  let interfaceNumber: number | null = null;

  try {
    // Buka device jika belum terbuka
    if (!device.opened) {
      console.log('[WebUSB DEBUG] OPEN - Opening device...');
      await device.open();
      opened = true;
      console.log('[WebUSB DEBUG] OPEN - Device opened successfully');

      // Debug: tampilkan configuration sebelum selectConfiguration
      console.log('[WebUSB DEBUG] Configuration before select:', device.configuration);

      // Pilih konfigurasi pertama (biasanya configuration 1)
      if (device.configuration === null) {
        console.log('[WebUSB DEBUG] SELECT - Selecting configuration 1...');
        await device.selectConfiguration(1);
        console.log('[WebUSB DEBUG] SELECT - Configuration selected');
      }

      // Debug: tampilkan configuration setelah selectConfiguration
      console.log('[WebUSB DEBUG] Configuration after select:', device.configuration);

      // Debug: tampilkan semua interfaces dan endpoints
      if (device.configuration) {
        console.log('[WebUSB DEBUG] Interfaces:', device.configuration.interfaces);
        device.configuration.interfaces.forEach((iface: any, idx: number) => {
          console.log(`[WebUSB DEBUG] Interface ${idx}:`, {
            interfaceNumber: iface.interfaceNumber,
            alternates: iface.alternates.map((alt: any) => ({
              interfaceClass: alt.interfaceClass,
              interfaceSubclass: alt.interfaceSubclass,
              interfaceProtocol: alt.interfaceProtocol,
              endpoints: alt.endpoints.map((ep: any) => ({
                endpointNumber: ep.endpointNumber,
                direction: ep.direction,
                type: ep.type,
              })),
            })),
          });
        });
      }
    }

    // Cari interface printer
    interfaceNumber = findPrinterInterface(device);
    console.log('[WebUSB DEBUG] Found interface number:', interfaceNumber);
    if (interfaceNumber === null) {
      throw new PrinterError(
        'NO_PRINTER',
        'Interface printer tidak ditemukan pada device USB.',
      );
    }

    // Claim interface
    try {
      console.log('[WebUSB DEBUG] CLAIM - Claiming interface', interfaceNumber, '...');
      await device.claimInterface(interfaceNumber);
      console.log('[WebUSB DEBUG] CLAIM - Interface claimed successfully');
    } catch (err: any) {
      console.log('[WebUSB DEBUG] CLAIM - Error:', err);
      // Jika interface sudah di-claim, ignore error
      if (!err?.message?.includes('claimed')) {
        throw err;
      }
      console.log('[WebUSB DEBUG] CLAIM - Interface already claimed, continuing...');
    }

    // Cari endpoint OUT
    const endpoint = findPrinterEndpoint(device);
    console.log('[WebUSB DEBUG] Found endpoint:', endpoint);
    if (endpoint === null) {
      throw new PrinterError(
        'NO_PRINTER',
        'Endpoint OUT tidak ditemukan pada printer USB.',
      );
    }

    // Transfer data ke printer
    // Split data menjadi chunk jika terlalu besar (max 64KB per transfer untuk keamanan)
    const CHUNK_SIZE = 64 * 1024; // 64KB
    console.log('[WebUSB DEBUG] TRANSFER - Starting data transfer, total bytes:', data.length);
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
      console.log(`[WebUSB DEBUG] TRANSFER - Sending chunk ${offset}-${offset + chunk.length} to endpoint ${endpoint}...`);
      await device.transferOut(endpoint, chunk);
      console.log(`[WebUSB DEBUG] TRANSFER - Chunk sent successfully`);
    }
    console.log('[WebUSB DEBUG] DONE - All data transferred successfully');

  } catch (err) {
    console.log('[WebUSB DEBUG] ERROR - Caught error:', err);
    console.log('[WebUSB DEBUG] ERROR - Error type:', (err as any)?.constructor?.name);
    console.log('[WebUSB DEBUG] ERROR - Error message:', (err as any)?.message);
    console.log('[WebUSB DEBUG] ERROR - Error name:', (err as any)?.name);
    console.log('[WebUSB DEBUG] ERROR - Full error:', JSON.stringify(err, null, 2));

    if (err instanceof PrinterError) throw err;

    const msg = (err as any)?.message ?? '';

    if (msg.includes('The device was disconnected') || msg.includes('disconnected')) {
      _cachedDevice = null;
      throw new PrinterError('PORT_DISCONNECTED', 'Printer terputus. Silakan hubungkan kembali.', err);
    }

    if (msg.includes('busy') || msg.includes('claimed')) {
      throw new PrinterError('PORT_BUSY', `Printer sedang sibuk: ${msg}`, err);
    }

    throw new PrinterError('PRINT_FAILED', `Gagal mengirim data ke printer: ${msg}`, err);

  } finally {
    // Release interface dan close device hanya jika kita yang membukanya
    if (opened && device && interfaceNumber !== null) {
      try {
        await device.releaseInterface(interfaceNumber);
      } catch {
        // Ignore release errors
      }
      try {
        await device.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
