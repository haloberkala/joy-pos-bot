import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Eye, EyeOff, Loader2, ShieldCheck, UserCog, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Harap isi email dan password'); return; }
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Login berhasil!');
        const storedUser = localStorage.getItem('demo_user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        navigate(parsed?.role === 'owner' ? '/owner' : '/');
      } else { toast.error('Email atau password salah'); }
    } catch { toast.error('Terjadi kesalahan saat login'); }
    finally { setIsLoading(false); }
  };

  const handleQuickLogin = async (email: string, password: string, roleName: string) => {
    setEmail(email); setPassword(password); setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success(`Login sebagai ${roleName} berhasil!`);
        const storedUser = localStorage.getItem('demo_user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        navigate(parsed?.role === 'owner' ? '/owner' : '/');
      }
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-2">
            <Store className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-page-title">MiniPOS</h1>
          <p className="text-[13px] text-muted-foreground">Sistem Kasir & Back Office</p>
        </div>

        {/* Login Card */}
        <Card className="border border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center">Masuk ke Akun</CardTitle>
            <CardDescription className="text-center">
              Masukkan kredensial Anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px]">Email</Label>
                <Input id="email" type="email" placeholder="nama@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px]">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-9 pr-10 rounded-lg" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-9" disabled={isLoading}>
                {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>) : 'Masuk'}
              </Button>
            </form>

            {/* Demo Mode */}
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-[11px] text-center text-muted-foreground mb-3 uppercase tracking-wider font-medium">
                Mode Demo — Klik untuk login cepat
              </p>
              <div className="space-y-1.5">
                <button onClick={() => handleQuickLogin('owner@demo.com', 'owner123', 'Owner')} disabled={isLoading}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border hover:bg-primary-light transition-colors text-left">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Owner</p>
                    <p className="text-[11px] text-muted-foreground">Akses penuh semua fitur</p>
                  </div>
                </button>
                <button onClick={() => handleQuickLogin('admin@demo.com', 'admin123', 'Admin')} disabled={isLoading}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border hover:bg-primary-light transition-colors text-left">
                  <div className="w-2 h-2 rounded-full bg-[hsl(40,72%,42%)]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Admin</p>
                    <p className="text-[11px] text-muted-foreground">Kelola produk, stok, dan laporan</p>
                  </div>
                </button>
                <button onClick={() => handleQuickLogin('kasir@demo.com', 'kasir123', 'Kasir')} disabled={isLoading}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border hover:bg-primary-light transition-colors text-left">
                  <div className="w-2 h-2 rounded-full bg-[hsl(160,72%,27%)]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Kasir</p>
                    <p className="text-[11px] text-muted-foreground">Hanya transaksi penjualan</p>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          © 2024 MiniPOS. Sistem Kasir Terpadu.
        </p>
      </div>
    </div>
  );
}
