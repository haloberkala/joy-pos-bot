export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: number
          name: string
          address: string
          phone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          address: string
          phone: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          address?: string
          phone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'owner' | 'admin' | 'cashier'
          store_id: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: 'owner' | 'admin' | 'cashier'
          store_id?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'owner' | 'admin' | 'cashier'
          store_id?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_accessible_stores: {
        Args: {
          user_id: string
        }
        Returns: number[]
      }
      can_access_store: {
        Args: {
          user_id: string
          target_store_id: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
