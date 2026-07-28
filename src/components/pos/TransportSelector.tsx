import { useState, useEffect } from 'react';
import { Usb, Bluetooth } from 'lucide-react';
import { cn } from '@/lib/utils';
import { printerManager } from '@/lib/printer';
import { toast } from 'sonner';

export function TransportSelector() {
  const [activeTransport, setActiveTransport] = useState<'webusb' | 'serial'>('webusb');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const updateState = () => {
      const current = printerManager.getActiveTransportId();
      if (current) {
        setActiveTransport(current as 'webusb' | 'serial');
      }
    };

    updateState();
    const unsubscribe = printerManager.onChange(updateState);
    return unsubscribe;
  }, []);

  const handleToggle = async (mode: 'webusb' | 'serial') => {
    if (activeTransport === mode || isConnecting) return;

    setIsConnecting(true);
    try {
      setActiveTransport(mode);
      
      // Disconnect jika sedang terhubung
      if (printerManager.isConnected()) {
        await printerManager.disconnect();
      }

      // Set transport baru
      printerManager.setActiveTransport(mode);
      
      // Connect ke transport baru
      await printerManager.connect();
      
      toast.success(`Mode ${mode === 'webusb' ? 'USB' : 'Bluetooth'} siap digunakan!`);
    } catch (error: any) {
      console.warn('Batal ganti transport:', error);
      // Error sudah ditangani oleh printerManager dengan toast
    } finally {
      setIsConnecting(false);
    }
  };

  const transports = printerManager.getAvailableTransports();
  if (transports.length === 0) {
    return null; // Browser tidak support
  }

  return (
    <div className="flex items-center p-0.5 rounded-lg border border-border bg-surface overflow-hidden">
      <button
        onClick={() => handleToggle('webusb')}
        disabled={isConnecting}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium transition-all duration-200 rounded-md",
          activeTransport === 'webusb'
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          isConnecting && "opacity-50 cursor-wait"
        )}
        title="Gunakan koneksi Kabel USB (WebUSB)"
        aria-label="Transport: USB"
        aria-pressed={activeTransport === 'webusb'}
      >
        <Usb className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">USB</span>
      </button>

      <button
        onClick={() => handleToggle('serial')}
        disabled={isConnecting}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium transition-all duration-200 rounded-md",
          activeTransport === 'serial'
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          isConnecting && "opacity-50 cursor-wait"
        )}
        title="Gunakan koneksi Bluetooth (Web Serial)"
        aria-label="Transport: Bluetooth"
        aria-pressed={activeTransport === 'serial'}
      >
        <Bluetooth className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Bluetooth</span>
      </button>
    </div>
  );
}
