/**
 * Permission Configuration - Single Source of Truth
 * 
 * This file defines all role-based access control for the application.
 * Used by:
 * - AuthContext: for menu visibility (canAccessMenu)
 * - App.tsx: for route protection (ProtectedRoute)
 * 
 * DO NOT duplicate these permissions elsewhere!
 */

import { UserRole } from '@/types/pos';

/**
 * Permission map: feature -> allowed roles
 * 
 * Features:
 * - pos: Point of Sale page
 * - dashboard: Dashboard & analytics
 * - products: Product management
 * - transactions: View transaction history
 * - expenses: Expense management
 * - reports: Financial reports
 * - purchases: Purchase orders & restocking
 * - shipping: Shipping management
 * - sdm: Human resources (attendance, payroll, employees)
 * - settings: Store settings & printer config
 * - customers: Customer management
 * - ownerPortal: Owner-only portal
 */
export const PERMISSIONS: Record<string, UserRole[]> = {
  // POS - All roles can access
  pos: ['owner', 'admin', 'cashier'],
  
  // Backoffice - Owner & Admin
  dashboard: ['owner', 'admin'],
  products: ['owner', 'admin'],
  purchases: ['owner', 'admin'],
  transactions: ['owner', 'admin', 'cashier'],
  customers: ['owner', 'admin'],
  shipping: ['owner', 'admin'],
  sdm: ['owner', 'admin'],
  settings: ['owner', 'admin'],
  
  // Owner Only
  expenses: ['owner'],
  reports: ['owner'],
  ownerPortal: ['owner'],
};

/**
 * Check if a role has access to a feature
 */
export function hasPermission(role: UserRole | undefined, feature: string): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[feature];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

/**
 * Get allowed roles for a feature
 */
export function getAllowedRoles(feature: string): UserRole[] {
  return PERMISSIONS[feature] || [];
}
