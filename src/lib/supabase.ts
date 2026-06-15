import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/**
 * Supabase client tanpa type checking — digunakan untuk tabel-tabel yang belum
 * di-generate di src/types/supabase.ts (hanya stores & users yang ter-generate).
 *
 * Aman digunakan karena semua tabel tersebut memang ada di DB (lihat schema).
 * Ganti dengan `supabase` yang fully-typed setelah menjalankan `supabase gen types`.
 *
 * @example
 * import { supabaseAny } from '@/lib/supabase';
 * const { data } = await supabaseAny.from('products').select('*');
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAny = supabase as any;

// Type exports for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Specific table types
export type Store = Tables<'stores'>;
export type User = Tables<'users'>;
export type UserInsert = Inserts<'users'>;
export type UserUpdate = Updates<'users'>;
