import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-[480px] space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden mb-1 shadow-lg">
            <img src="/logo.png" alt="Nadi" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nadi</h1>
          <p className="text-sm text-muted-foreground">Pusat Kendali Bisnismu</p>
        </div>

        {/* Login Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="space-y-1 pb-6 pt-8 px-8">
            <CardTitle className="text-center text-xl">Masuk ke Akun</CardTitle>
            <CardDescription className="text-center text-sm">
              Masukkan username dan password Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="Contoh: admin1" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)} 
                  disabled={isLoading} 
                  className="h-11 rounded-lg text-base"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={isLoading} 
                    className="h-11 pr-12 rounded-lg text-base"
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
                  className="w-full h-11 text-base text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleClearSession}
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Bersihkan Session & Coba Lagi
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Klik tombol ini jika mengalami error login
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          © 2026 Nadi. Pusat Kendali Bisnismu.
        </p>
      </div>
    </div>
  );
}
