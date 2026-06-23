import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole } from '@/types/pos';
import { toast } from 'sonner';
import * as authService from '@/services/authService';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  storeIds: number[];
  storeId: number | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User }>;
  logout: () => void;
  hasAccess: (requiredRoles: UserRole[]) => boolean;
  activeStoreId: number;
  setActiveStoreId: (id: number) => void;
  accessibleStoreIds: number[];
  canSwitchStore: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStoreId, setActiveStoreIdState] = useState<number>(1);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const sessionToken = authService.getSessionToken();
        
        if (!sessionToken) {
          setIsLoading(false);
          return;
        }

        // Check if session expired
        if (authService.isSessionExpired()) {
          authService.clearSessionToken();
          setIsLoading(false);
          return;
        }

        // Validate session
        const authUser = await authService.validateSession(sessionToken);
        
        if (!authUser) {
          authService.clearSessionToken();
          setIsLoading(false);
          return;
        }

        // Fetch actual store IDs from database
        let storeIds: number[] = [];
        
        if (authUser.role === 'owner') {
          // Owner can access all stores - fetch from database
          const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .order('id', { ascending: true });
          
          storeIds = stores?.map(s => s.id) || [];
        } else {
          // Admin/Cashier only access their assigned store
          storeIds = authUser.store_id ? [authUser.store_id] : [];
        }

        const userProfile: User = {
          id: authUser.id,
          username: authUser.username,
          name: authUser.name,
          role: authUser.role as UserRole,
          storeIds,
          storeId: authUser.store_id,
        };

        setUser(userProfile);

        // Restore active store from localStorage
        const storedStoreId = localStorage.getItem('active_store_id');
        if (storedStoreId && storeIds.includes(Number(storedStoreId))) {
          setActiveStoreIdState(Number(storedStoreId));
        } else if (storeIds.length > 0) {
          // Use first available store
          setActiveStoreIdState(storeIds[0]);
          localStorage.setItem('active_store_id', String(storeIds[0]));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.clearSessionToken();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; user?: User }> => {
    try {
      const result = await authService.login(username, password);

      if (!result.success || !result.user) {
        toast.error('Login gagal', {
          description: result.message || 'Username atau password salah',
        });
        return { success: false };
      }

      // Save session token
      if (result.session_token && result.expires_at) {
        authService.saveSessionToken(result.session_token, result.expires_at);
      }

      // Fetch actual store IDs from database
      let storeIds: number[] = [];
      
      if (result.user.role === 'owner') {
        // Owner can access all stores - fetch from database
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .order('id', { ascending: true });
        
        storeIds = stores?.map(s => s.id) || [];
      } else {
        // Admin/Cashier only access their assigned store
        storeIds = result.user.store_id ? [result.user.store_id] : [];
      }

      const userProfile: User = {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role as UserRole,
        storeIds,
        storeId: result.user.store_id,
      };

      setUser(userProfile);

      // Set active store
      const storedStoreId = localStorage.getItem('active_store_id');
      if (storedStoreId && storeIds.includes(Number(storedStoreId))) {
        setActiveStoreIdState(Number(storedStoreId));
      } else if (storeIds.length > 0) {
        // Use first available store
        setActiveStoreIdState(storeIds[0]);
        localStorage.setItem('active_store_id', String(storeIds[0]));
      }

      return { success: true, user: userProfile };
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login gagal', {
        description: 'Terjadi kesalahan saat login',
      });
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      const sessionToken = authService.getSessionToken();
      if (sessionToken) {
        await authService.logout(sessionToken);
      }
      
      authService.clearSessionToken();
      setUser(null);
      setActiveStoreIdState(1);
      
      toast.success('Logout berhasil');
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear even if logout fails
      authService.clearSessionToken();
      setUser(null);
      toast.error('Logout gagal, tapi session sudah dibersihkan');
    }
  };

  const hasAccess = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  const setActiveStoreId = (id: number) => {
    if (!user) return;
    // Owner can switch to any store, admin/cashier only their assigned stores
    if (user.role === 'owner' || user.storeIds.includes(id)) {
      setActiveStoreIdState(id);
      localStorage.setItem('active_store_id', String(id));
    }
  };

  const accessibleStoreIds = user?.storeIds || [];
  const canSwitchStore = user?.role === 'owner';

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, logout, hasAccess,
      activeStoreId, setActiveStoreId,
      accessibleStoreIds, canSwitchStore,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based menu access configuration
export const MENU_ACCESS: Record<string, UserRole[]> = {
  'pos': ['owner', 'admin', 'cashier'],
  'dashboard': ['owner', 'admin'],
  'products': ['owner', 'admin'],
  'transactions': ['owner', 'admin', 'cashier'],
  'expenses': ['owner'],
  'reports': ['owner'],
  'purchases': ['owner', 'admin'],
  'shipping': ['owner', 'admin'],
  'sdm': ['owner', 'admin'],
  'settings': ['owner'],
};

export function canAccessMenu(role: UserRole | undefined, menuKey: string): boolean {
  if (!role) return false;
  const allowedRoles = MENU_ACCESS[menuKey];
  return allowedRoles ? allowedRoles.includes(role) : false;
}
