import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole } from '@/types/pos';

// Demo users for UI testing (no backend yet)
const DEMO_USERS = [
  { id: 'owner-1', email: 'owner@demo.com', password: 'owner123', name: 'Ahmad Owner', role: 'owner' as UserRole, storeIds: ['store-1', 'store-2', 'store-3'] },
  { id: 'admin-1', email: 'admin@demo.com', password: 'admin123', name: 'Budi Admin', role: 'admin' as UserRole, storeIds: ['store-1', 'store-2'] },
  { id: 'cashier-1', email: 'kasir@demo.com', password: 'kasir123', name: 'Citra Kasir', role: 'cashier' as UserRole, storeIds: ['store-1'] },
];

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeIds: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasAccess: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('demo_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('demo_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('demo_user', JSON.stringify(userWithoutPassword));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('demo_user');
  };

  const hasAccess = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasAccess }}>
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
  // POS Access
  'pos': ['owner', 'admin', 'cashier'],
  
  // Back Office Access
  'dashboard': ['owner', 'admin'],
  'products': ['owner', 'admin'],
  'stock': ['owner', 'admin'],
  'transactions': ['owner', 'admin', 'cashier'],
  'expenses': ['owner', 'admin'],
  'reports': ['owner', 'admin'],
  'settings': ['owner'],
};

// Helper to check menu access
export function canAccessMenu(role: UserRole | undefined, menuKey: string): boolean {
  if (!role) return false;
  const allowedRoles = MENU_ACCESS[menuKey];
  return allowedRoles ? allowedRoles.includes(role) : false;
}
