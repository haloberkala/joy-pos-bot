import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole } from '@/types/pos';

// Demo users for UI testing (no backend yet)
// Admin hanya punya akses ke 1 toko, Owner bisa akses semua
const DEMO_USERS = [
  { id: 'owner-1', email: 'owner@demo.com', password: 'owner123', name: 'Ahmad Owner', role: 'owner' as UserRole, storeIds: [1, 2, 3] },
  { id: 'admin-1', email: 'admin@demo.com', password: 'admin123', name: 'Budi Admin', role: 'admin' as UserRole, storeIds: [1] },
  { id: 'admin-2', email: 'admin2@demo.com', password: 'admin123', name: 'Dewi Admin', role: 'admin' as UserRole, storeIds: [2] },
  { id: 'cashier-1', email: 'kasir@demo.com', password: 'kasir123', name: 'Citra Kasir', role: 'cashier' as UserRole, storeIds: [1] },
  { id: 'cashier-2', email: 'kasir2@demo.com', password: 'kasir123', name: 'Eko Kasir', role: 'cashier' as UserRole, storeIds: [2] },
];

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeIds: number[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasAccess: (requiredRoles: UserRole[]) => boolean;
  /** The active store for the current user session */
  activeStoreId: number;
  setActiveStoreId: (id: number) => void;
  /** All stores this user can access */
  accessibleStoreIds: number[];
  /** Whether user can switch stores (owner only) */
  canSwitchStore: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStoreId, setActiveStoreIdState] = useState<number>(1);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('demo_user');
    const storedStoreId = localStorage.getItem('demo_active_store');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (storedStoreId) {
          setActiveStoreIdState(Number(storedStoreId));
        } else if (parsed.storeIds?.length > 0) {
          setActiveStoreIdState(parsed.storeIds[0]);
        }
      } catch {
        localStorage.removeItem('demo_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('demo_user', JSON.stringify(userWithoutPassword));
      // Set active store to user's first store
      const firstStore = foundUser.storeIds[0] || 1;
      setActiveStoreIdState(firstStore);
      localStorage.setItem('demo_active_store', String(firstStore));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_active_store');
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
      localStorage.setItem('demo_active_store', String(id));
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
  'expenses': ['owner', 'admin'],
  'reports': ['owner', 'admin'],
  'purchases': ['owner', 'admin'],
  'shipping': ['owner', 'admin'],
  'settings': ['owner'],
};

export function canAccessMenu(role: UserRole | undefined, menuKey: string): boolean {
  if (!role) return false;
  const allowedRoles = MENU_ACCESS[menuKey];
  return allowedRoles ? allowedRoles.includes(role) : false;
}
