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

const PRINTER_FILTERS: USBDeviceFilter[] = [
  { vendorId: 0x0418, productId: 0x5011 }, // Iware XS-80BT
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

// ── Cached device ─────────────────────────────────────────────────────────────

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

// ── Connect ───────────────────────────────────────────────────────────────────

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

// ── Reconnect ─────────────────────────────────────────────────────────────────

export async function reconnectViaCache(): Promise<USBDevice | null> {
  if (!isWebUSBSupported()) return null;

  try {
    const devices = await navigator.usb.getDevices();
    if (devices.length === 0) return null;

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

// ── Find printer interface ────────────────────────────────────────────────────

function findPrinterInterface(device: USBDevice): number | null {
  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
        return iface.interfaceNumber;
      }
    }
  }

  return device.configuration.interfaces[0]?.interfaceNumber ?? null;
}

// ── Find printer endpoint ─────────────────────────────────────────────────────

function findPrinterEndpoint(device: USBDevice): number | null {
  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
        const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
        if (endpoint) return endpoint.endpointNumber;
      }
    }
  }

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
      if (endpoint) return endpoint.endpointNumber;
    }
  }

  return null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function writeToDevice(data: Uint8Array, _config?: PrinterConfig): Promise<void> {
  if (!isWebUSBSupported()) {
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung WebUSB API. Gunakan Chrome atau Edge.',
    );
  }

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

  let shouldClose = false;
  let interfaceNumber: number | null = null;
  let interfaceClaimed = false;

  try {
    if (!device.opened) {
      await device.open();
      shouldClose = true;

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
    }

    interfaceNumber = findPrinterInterface(device);
    if (interfaceNumber === null) {
      throw new PrinterError(
        'NO_PRINTER',
        'Interface printer tidak ditemukan pada device USB.',
      );
    }

    await device.claimInterface(interfaceNumber);
    interfaceClaimed = true;

    const endpoint = findPrinterEndpoint(device);
    if (endpoint === null) {
      throw new PrinterError(
        'NO_PRINTER',
        'Endpoint OUT tidak ditemukan pada printer USB.',
      );
    }

    const CHUNK_SIZE = 64 * 1024;
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
      await device.transferOut(endpoint, chunk);
    }

  } catch (err) {
    if (err instanceof PrinterError) throw err;

    const msg = (err as any)?.message ?? '';

    if (msg.includes('disconnected')) {
      _cachedDevice = null;
      throw new PrinterError('PORT_DISCONNECTED', 'Printer terputus. Silakan hubungkan kembali.', err);
    }

    if (msg.includes('Access denied') || msg.includes('access denied')) {
      throw new PrinterError('NO_PERMISSION', 'Akses ke printer ditolak. Gunakan mode Bluetooth di Windows.', err);
    }

    if (msg.includes('busy') || msg.includes('in use')) {
      throw new PrinterError('PORT_BUSY', 'Printer sedang digunakan oleh aplikasi lain.', err);
    }

    throw new PrinterError('PRINT_FAILED', `Gagal mengirim data ke printer: ${msg}`, err);

  } finally {
    if (interfaceClaimed && device && interfaceNumber !== null) {
      try {
        await device.releaseInterface(interfaceNumber);
      } catch {
        // Ignore
      }
    }
    
    if (shouldClose && device) {
      try {
        await device.close();
      } catch {
        // Ignore
      }
    }
  }
}
