import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if there's a stale session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || (session && error)) {
        setShowClearButton(true);
      }
    };
    checkSession();
  }, []);

  const handleClearSession = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Session berhasil dibersihkan. Silakan login kembali.');
      setShowClearButton(false);
      window.location.reload();
    } catch (error) {
      console.error('Error clearing session:', error);
      // Force clear anyway
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Storage dibersihkan. Silakan login kembali.');
      window.location.reload();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { 
      toast.error('Harap isi username dan password'); 
      return; 
    }
    
    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (result.success && result.user) {
        toast.success('Login berhasil!');
        navigate(result.user.role === 'owner' ? '/owner' : '/');
      } else { 
        toast.error('Username atau password salah'); 
      }
    } catch { 
      toast.error('Terjadi kesalahan saat login'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleQuickLogin = async (user: string, pass: string, roleName: string) => {
    setUsername(user);
    setPassword(pass);
    setIsLoading(true);
    
    try {
      const result = await login(user, pass);
      if (result.success && result.user) {
        toast.success(`Login sebagai ${roleName} berhasil!`);
        navigate(result.user.role === 'owner' ? '/owner' : '/');
      }
    } finally { 
      setIsLoading(false); 
    }
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
              Masukkan username dan password Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[13px]">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="Contoh: admin1" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)} 
                  disabled={isLoading} 
                  className="h-9 rounded-lg"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px]">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={isLoading} 
                    className="h-9 pr-10 rounded-lg"
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-9" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            {/* Clear Session Button (shown when there's an error) */}
            {showClearButton && (
              <div className="mt-4">
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleClearSession}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Bersihkan Session & Coba Lagi
                </Button>
                <p className="text-[11px] text-center text-muted-foreground mt-2">
                  Klik tombol ini jika mengalami error login
                </p>
              </div>
            )}

            {/* Demo Mode */}
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-[11px] text-center text-muted-foreground mb-3 uppercase tracking-wider font-medium">
                Mode Demo — Klik untuk login cepat
              </p>
              <div className="space-y-1.5">
                <button 
                  onClick={() => handleQuickLogin('owner', 'owner123', 'Owner')} 
                  disabled={isLoading}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border hover:bg-primary-light transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Owner</p>
                    <p className="text-[11px] text-muted-foreground">Username: owner</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickLogin('admin1', 'admin123', 'Admin Toko 1')} 
                  disabled={isLoading}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border hover:bg-primary-light transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full bg-[hsl(40,72%,42%)]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Admin Toko 1</p>
                    <p className="text-[11px] text-muted-foreground">Username: admin1</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleQuickLogin('kasir1', 'kasir123', 'Kasir Toko 1')} 
                  disabled={isLoading}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border hover:bg-primary-light transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full bg-[hsl(160,72%,27%)]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Kasir Toko 1</p>
                    <p className="text-[11px] text-muted-foreground">Username: kasir1</p>
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
