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

// ── Debug flag ────────────────────────────────────────────────────────────────

const DEBUG = true; // Set false untuk production

function log(...args: any[]) {
  if (DEBUG) console.log('[WebUSB]', ...args);
}

function logError(...args: any[]) {
  if (DEBUG) console.error('[WebUSB][ERROR]', ...args);
}

function logGroup(title: string) {
  if (DEBUG) console.group(`[WebUSB] ${title}`);
}

function logGroupEnd() {
  if (DEBUG) console.groupEnd();
}

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
  const supported = 'usb' in navigator;
  log('isWebUSBSupported:', supported);
  if (supported) {
    log('UserAgent:', navigator.userAgent);
  }
  return supported;
}

// ── Debug helper ──────────────────────────────────────────────────────────────

/**
 * Debug helper: cetak semua info USB device secara lengkap
 */
function debugUSBDevice(device: USBDevice, context: string = '') {
  logGroup(`DEBUG DEVICE ${context}`);
  
  log('Vendor ID:', `0x${device.vendorId.toString(16).padStart(4, '0')}`);
  log('Product ID:', `0x${device.productId.toString(16).padStart(4, '0')}`);
  log('Manufacturer:', device.manufacturerName || '(unknown)');
  log('Product:', device.productName || '(unknown)');
  log('Serial:', device.serialNumber || '(unknown)');
  log('Opened:', device.opened);
  log('Configuration:', device.configuration?.configurationValue || 'null');
  
  if (device.configurations) {
    log('Configurations count:', device.configurations.length);
    device.configurations.forEach((config, idx) => {
      log(`  Config ${idx}:`, config.configurationValue, `(${config.interfaces.length} interfaces)`);
    });
  }
  
  if (device.configuration) {
    log('Active configuration interfaces:');
    device.configuration.interfaces.forEach((iface) => {
      log(`  Interface ${iface.interfaceNumber}:`);
      iface.alternates.forEach((alt, altIdx) => {
        log(`    Alternate ${altIdx}:`);
        log(`      Class: ${alt.interfaceClass}`);
        log(`      Subclass: ${alt.interfaceSubclass}`);
        log(`      Protocol: ${alt.interfaceProtocol}`);
        log(`      Endpoints (${alt.endpoints.length}):`);
        alt.endpoints.forEach((ep) => {
          log(`        EP ${ep.endpointNumber}: ${ep.direction} ${ep.type} (packetSize: ${ep.packetSize})`);
        });
      });
    });
  }
  
  logGroupEnd();
}

/**
 * Helper: enumerate interfaces dengan format yang jelas
 */
function enumerateInterfaces(device: USBDevice) {
  logGroup('STEP 3: ENUMERATE INTERFACES');
  
  if (!device.configuration) {
    log('No active configuration');
    logGroupEnd();
    return;
  }
  
  log('Total interfaces:', device.configuration.interfaces.length);
  
  device.configuration.interfaces.forEach((iface) => {
    log('─────────────────────────────────────');
    log(`Interface ${iface.interfaceNumber}:`);
    log(`  Alternates: ${iface.alternates.length}`);
    
    iface.alternates.forEach((alt, altIdx) => {
      log(`  Alternate ${altIdx}:`);
      log(`    interfaceClass: ${alt.interfaceClass}`);
      log(`    interfaceSubclass: ${alt.interfaceSubclass}`);
      log(`    interfaceProtocol: ${alt.interfaceProtocol}`);
      log(`    Endpoints: ${alt.endpoints.length}`);
      
      alt.endpoints.forEach((ep) => {
        log(`      Endpoint ${ep.endpointNumber}:`);
        log(`        direction: ${ep.direction}`);
        log(`        type: ${ep.type}`);
        log(`        packetSize: ${ep.packetSize}`);
      });
    });
  });
  
  log('─────────────────────────────────────');
  logGroupEnd();
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
  logGroup('CONNECT (requestDevice)');
  
  if (!isWebUSBSupported()) {
    logError('Browser tidak support WebUSB');
    logGroupEnd();
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung WebUSB API. Gunakan Chrome atau Edge.',
    );
  }

  log('Browser:', navigator.userAgent);
  log('navigator.usb available:', !!navigator.usb);
  log('Requesting device with filters:', PRINTER_FILTERS);

  let device: USBDevice;
  try {
    device = await navigator.usb.requestDevice({ filters: PRINTER_FILTERS });
    log('Device selected by user');
  } catch (err: any) {
    logError('requestDevice failed:', err);
    logGroupEnd();
    
    if (err?.name === 'NotFoundError') {
      throw new PrinterError('NO_PERMISSION', 'Pemilihan printer dibatalkan.', err);
    }
    throw new PrinterError('NO_PRINTER', `Gagal memilih printer: ${err?.message}`, err);
  }

  debugUSBDevice(device, 'after requestDevice');

  _cachedDevice = device;
  saveDeviceInfo({
    vendorId: device.vendorId,
    productId: device.productId,
    label: device.productName || 'USB Printer',
  });

  log('Device cached and info saved');
  logGroupEnd();

  return device;
}

// ── Reconnect (getDevices — tanpa dialog jika permission masih ada) ──────────

/**
 * Coba sambungkan ulang ke device yang sudah pernah diberi permission.
 * Returns device jika berhasil, null jika tidak ada device tersimpan.
 */
export async function reconnectViaCache(): Promise<USBDevice | null> {
  logGroup('RECONNECT (getDevices)');
  
  if (!isWebUSBSupported()) {
    log('Browser tidak support WebUSB');
    logGroupEnd();
    return null;
  }

  try {
    const devices = await navigator.usb.getDevices();
    log('Devices found:', devices.length);
    
    if (devices.length === 0) {
      log('No devices with permission');
      logGroupEnd();
      return null;
    }

    // Log semua device
    devices.forEach((d, idx) => {
      log(`Device ${idx}:`, {
        vendorId: `0x${d.vendorId.toString(16)}`,
        productId: `0x${d.productId.toString(16)}`,
        productName: d.productName,
        manufacturerName: d.manufacturerName,
      });
    });

    // Ambil device pertama yang match dengan filter printer kita
    const device = devices.find(d =>
      PRINTER_FILTERS.some(f => f.vendorId === d.vendorId && f.productId === d.productId)
    );

    if (!device) {
      log('No matching printer device found');
      logGroupEnd();
      return null;
    }

    log('Matched device:', device.productName);
    debugUSBDevice(device, 'reconnected device');

    _cachedDevice = device;
    saveDeviceInfo({
      vendorId: device.vendorId,
      productId: device.productId,
      label: device.productName || 'USB Printer',
    });

    log('Device cached and info saved');
    logGroupEnd();
    return device;
    
  } catch (err) {
    logError('getDevices failed:', err);
    logGroupEnd();
    return null;
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectDevice(): Promise<void> {
  logGroup('DISCONNECT');
  
  if (_cachedDevice) {
    log('Device:', _cachedDevice.productName);
    log('Opened:', _cachedDevice.opened);
    
    if (_cachedDevice.opened) {
      log('Closing device...');
      try {
        await _cachedDevice.close();
        log('✓ Device closed');
      } catch (err) {
        logError('✗ Failed to close:', err);
      }
    } else {
      log('Device already closed');
    }
  } else {
    log('No cached device');
  }
  
  _cachedDevice = null;
  clearDeviceInfo();
  log('Cache cleared');
  
  logGroupEnd();
}

// ── Find printer endpoint ─────────────────────────────────────────────────────

/**
 * Cari endpoint OUT pertama pada interface Printer Class.
 * USB Printer Class = Class 7, Subclass 1, Protocol 1 atau 2.
 * Biasanya endpoint 0x01 atau 0x02.
 */
function findPrinterEndpoint(device: USBDevice): number | null {
  logGroup('STEP 6: FIND ENDPOINT');
  
  if (!device.configuration) {
    log('No active configuration');
    logGroupEnd();
    return null;
  }

  // Cari di Printer Class interface dulu
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      log('─────────────────────────────────────');
      log(`Checking interface ${iface.interfaceNumber}, alternate ${iface.alternates.indexOf(alt)}`);
      log(`  Class: ${alt.interfaceClass}, Subclass: ${alt.interfaceSubclass}`);
      
      if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
        log('  → Printer Class interface found');
        const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
        if (endpoint) {
          log(`  → Endpoint OUT found:`);
          log(`     endpointNumber: ${endpoint.endpointNumber}`);
          log(`     direction: ${endpoint.direction}`);
          log(`     type: ${endpoint.type}`);
          log(`     packetSize: ${endpoint.packetSize}`);
          logGroupEnd();
          return endpoint.endpointNumber;
        } else {
          log('  → No OUT endpoint found in this interface');
        }
      } else {
        log('  → Not printer class, skipping');
      }
    }
  }

  log('─────────────────────────────────────');
  log('Printer Class endpoint not found, trying fallback');

  // Fallback: cari endpoint OUT pertama
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
      if (endpoint) {
        log(`Fallback endpoint found:`);
        log(`  endpointNumber: ${endpoint.endpointNumber}`);
        log(`  interface: ${iface.interfaceNumber}`);
        log(`  direction: ${endpoint.direction}`);
        log(`  type: ${endpoint.type}`);
        logGroupEnd();
        return endpoint.endpointNumber;
      }
    }
  }

  log('No OUT endpoint found');
  logGroupEnd();
  return null;
}

/**
 * Cari interface number untuk Printer Class.
 * Biasanya interface 0.
 */
function findPrinterInterface(device: USBDevice): number | null {
  logGroup('STEP 4: FIND INTERFACE');
  
  if (!device.configuration) {
    log('No active configuration');
    logGroupEnd();
    return null;
  }

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      log('─────────────────────────────────────');
      log(`Checking interface ${iface.interfaceNumber}`);
      log(`  Class: ${alt.interfaceClass}`);
      log(`  Subclass: ${alt.interfaceSubclass}`);
      log(`  Protocol: ${alt.interfaceProtocol}`);
      
      if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
        log(`  → MATCH: Printer Class interface accepted`);
        log(`Selected interface: ${iface.interfaceNumber}`);
        logGroupEnd();
        return iface.interfaceNumber;
      } else {
        log(`  → SKIP: Not printer class (expected Class 7, Subclass 1)`);
      }
    }
  }

  log('─────────────────────────────────────');
  log('Printer Class interface not found, using fallback');
  
  // Fallback: interface 0
  const fallback = device.configuration.interfaces[0]?.interfaceNumber ?? null;
  log(`Fallback interface: ${fallback}`);
  logGroupEnd();
  return fallback;
}

// ── Write (buka → tulis → tutup) ──────────────────────────────────────────────

/**
 * Kirim raw ESC/POS bytes ke printer melalui WebUSB.
 * Device dibuka per-job (open/close) untuk mencegah "device already open" error.
 */
export async function writeToDevice(data: Uint8Array, _config?: PrinterConfig): Promise<void> {
  logGroup('WRITE TO DEVICE');
  log('Data size:', data.length, 'bytes');
  
  if (!isWebUSBSupported()) {
    logError('Browser tidak support WebUSB');
    logGroupEnd();
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung WebUSB API. Gunakan Chrome atau Edge.',
    );
  }

  // Ambil device dari cache, atau coba getDevices() tanpa dialog
  let device = _cachedDevice;
  if (!device) {
    log('No cached device, trying getDevices()');
    const devices = await navigator.usb.getDevices();
    log('getDevices() returned:', devices.length, 'devices');
    
    if (devices.length > 0) {
      device = devices.find(d =>
        PRINTER_FILTERS.some(f => f.vendorId === d.vendorId && f.productId === d.productId)
      ) || devices[0];
      _cachedDevice = device;
      log('Device retrieved from getDevices()');
    }
  } else {
    log('Using cached device');
  }

  if (!device) {
    logError('No device available');
    logGroupEnd();
    throw new PrinterError(
      'NO_PRINTER',
      'Printer belum dipilih. Kunjungi Pengaturan → Printer untuk menghubungkan printer.',
    );
  }

  debugUSBDevice(device, 'before operations');

  let shouldClose = false;
  let interfaceNumber: number | null = null;
  let interfaceClaimed = false;

  try {
    // ═══ STEP 1: OPEN DEVICE ═══
    logGroup('STEP 1: OPEN DEVICE');
    log('device.opened:', device.opened);
    log('device.configuration:', device.configuration?.configurationValue || 'null');
    log('device.configurations:', device.configurations?.length || 0);
    
    if (!device.opened) {
      log('Opening device...');
      try {
        await device.open();
        shouldClose = true;
        log('✓ Device opened successfully');
        log('device.opened:', device.opened);
      } catch (openErr: any) {
        logError('✗ device.open() failed');
        logError('Error name:', openErr.name);
        logError('Error message:', openErr.message);
        console.dir(openErr);
        throw openErr;
      }

      // ═══ STEP 2: SELECT CONFIGURATION ═══
      logGroup('STEP 2: SELECT CONFIGURATION');
      log('Current configuration:', device.configuration?.configurationValue || 'null');
      
      if (device.configuration === null) {
        log('No active configuration, selecting configuration 1...');
        try {
          await device.selectConfiguration(1);
          log('✓ Configuration 1 selected');
          log('Active configuration:', device.configuration?.configurationValue);
        } catch (configErr: any) {
          logError('✗ selectConfiguration(1) failed');
          logError('Error name:', configErr.name);
          logError('Error message:', configErr.message);
          console.dir(configErr);
          throw configErr;
        }
      } else {
        log('Configuration already active:', device.configuration.configurationValue);
      }
      logGroupEnd();
    } else {
      log('Device already opened');
    }
    logGroupEnd();

    // Enumerate interfaces
    enumerateInterfaces(device);

    // ═══ STEP 4: FIND INTERFACE ═══
    interfaceNumber = findPrinterInterface(device);
    if (interfaceNumber === null) {
      logError('Interface not found');
      logGroupEnd();
      throw new PrinterError(
        'NO_PRINTER',
        'Interface printer tidak ditemukan pada device USB.',
      );
    }
    log('Selected interface number:', interfaceNumber);

    // ═══ STEP 5: CLAIM INTERFACE ═══
    logGroup('STEP 5: CLAIM INTERFACE');
    log('Claiming interface:', interfaceNumber);
    
    try {
      await device.claimInterface(interfaceNumber);
      interfaceClaimed = true;
      log('✓ Interface claimed successfully');
    } catch (claimErr: any) {
      logError('✗ claimInterface() failed');
      logError('Error name:', claimErr.name);
      logError('Error message:', claimErr.message);
      logError('Error stack:', claimErr.stack);
      console.dir(claimErr);
      throw claimErr;
    }
    logGroupEnd();

    // ═══ STEP 6: FIND ENDPOINT ═══
    const endpoint = findPrinterEndpoint(device);
    if (endpoint === null) {
      logError('Endpoint not found');
      logGroupEnd();
      throw new PrinterError(
        'NO_PRINTER',
        'Endpoint OUT tidak ditemukan pada printer USB.',
      );
    }
    log('Selected endpoint:', endpoint);

    // ═══ STEP 7: TRANSFER DATA ═══
    logGroup('STEP 7: TRANSFER DATA');
    const CHUNK_SIZE = 64 * 1024; // 64KB
    const numChunks = Math.ceil(data.length / CHUNK_SIZE);
    log('Endpoint:', endpoint);
    log('Total data size:', data.length, 'bytes');
    log('Chunk size:', CHUNK_SIZE, 'bytes');
    log('Number of chunks:', numChunks);
    
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
      const chunkNum = Math.floor(offset / CHUNK_SIZE) + 1;
      log(`─────────────────────────────────────`);
      log(`Chunk ${chunkNum}/${numChunks}:`);
      log(`  offset: ${offset}`);
      log(`  size: ${chunk.length} bytes`);
      log(`  Transferring to endpoint ${endpoint}...`);
      
      try {
        await device.transferOut(endpoint, chunk);
        log(`  ✓ Transfer success`);
      } catch (transferErr: any) {
        logError(`✗ transferOut() failed on chunk ${chunkNum}`);
        logError('Error name:', transferErr.name);
        logError('Error message:', transferErr.message);
        logError('Error stack:', transferErr.stack);
        console.dir(transferErr);
        throw transferErr;
      }
    }
    
    log('─────────────────────────────────────');
    log('✓ All data transferred successfully');
    logGroupEnd();

  } catch (err) {
    console.group('[WebUSB ERROR]');
    console.error(err);
    if (err instanceof Error) {
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    console.dir(err);
    console.groupEnd();
    
    if (err instanceof PrinterError) {
      logGroupEnd();
      throw err;
    }

    const msg = (err as any)?.message ?? '';

    if (msg.includes('The device was disconnected') || msg.includes('disconnected')) {
      _cachedDevice = null;
      logGroupEnd();
      throw new PrinterError('PORT_DISCONNECTED', 'Printer terputus. Silakan hubungkan kembali.', err);
    }

    if (msg.includes('Access denied') || msg.includes('access denied')) {
      logGroupEnd();
      throw new PrinterError('NO_PERMISSION', 'Akses ke printer ditolak. Coba putuskan dan hubungkan ulang printer.', err);
    }

    if (msg.includes('busy') || msg.includes('in use')) {
      logGroupEnd();
      throw new PrinterError('PORT_BUSY', 'Printer sedang digunakan oleh aplikasi lain.', err);
    }

    logGroupEnd();
    throw new PrinterError('PRINT_FAILED', `Gagal mengirim data ke printer: ${msg}`, err);

  } finally {
    // ═══ STEP 8: CLEANUP - RELEASE & CLOSE ═══
    logGroup('STEP 8: CLEANUP');
    
    if (interfaceClaimed && device && interfaceNumber !== null) {
      log('Releasing interface:', interfaceNumber);
      try {
        await device.releaseInterface(interfaceNumber);
        log('✓ Interface released');
      } catch (releaseErr) {
        logError('✗ releaseInterface() failed:', releaseErr);
      }
    }
    
    if (shouldClose && device) {
      log('Closing device');
      try {
        await device.close();
        log('✓ Device closed');
      } catch (closeErr) {
        logError('✗ device.close() failed:', closeErr);
      }
    }
    
    logGroupEnd();
    logGroupEnd(); // End of WRITE TO DEVICE
  }
}
