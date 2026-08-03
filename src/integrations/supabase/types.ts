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
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          address: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          address?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      employees: {
        Row: {
          id: string
          store_id: number | null
          username: string
          name: string
          phone: string | null
          role: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          password_hash: string | null
          position: string | null
          daily_salary: number | null
          fingerprint_id: string | null
        }
        Insert: {
          id?: string
          store_id?: number | null
          username: string
          name: string
          phone?: string | null
          role: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          password_hash?: string | null
          position?: string | null
          daily_salary?: number | null
          fingerprint_id?: string | null
        }
        Update: {
          id?: string
          store_id?: number | null
          username?: string
          name?: string
          phone?: string | null
          role?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          password_hash?: string | null
          position?: string | null
          daily_salary?: number | null
          fingerprint_id?: string | null
        }
        Relationships: any[]
      }
      products: {
        Row: {
          id: number
          store_id: number
          code: string
          name: string
          quantity: number
          min_stock_alert: number | null
          cost_price: number
          selling_price_retail: number
          selling_price_wholesale: number
          selling_price_special: number
          wholesale_min_qty: number | null
          special_min_qty: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          category_id: number
          brand_id: number | null
          unit_id: number
          main_product_id: number
          variant_id: number | null
          specification_id: number | null
          size_id: number | null
          short_name: string | null
        }
        Insert: {
          id?: number
          store_id: number
          code: string
          name: string
          quantity?: number
          min_stock_alert?: number | null
          cost_price?: number
          selling_price_retail: number
          selling_price_wholesale: number
          selling_price_special: number
          wholesale_min_qty?: number | null
          special_min_qty?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          category_id: number
          brand_id?: number | null
          unit_id: number
          main_product_id: number
          variant_id?: number | null
          specification_id?: number | null
          size_id?: number | null
          short_name?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          code?: string
          name?: string
          quantity?: number
          min_stock_alert?: number | null
          cost_price?: number
          selling_price_retail?: number
          selling_price_wholesale?: number
          selling_price_special?: number
          wholesale_min_qty?: number | null
          special_min_qty?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          category_id?: number
          brand_id?: number | null
          unit_id?: number
          main_product_id?: number
          variant_id?: number | null
          specification_id?: number | null
          size_id?: number | null
          short_name?: string | null
        }
        Relationships: any[]
      }
      customers: {
        Row: {
          id: number
          store_id: number
          name: string
          phone: string
          address: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          phone: string
          address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          phone?: string
          address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      sales: {
        Row: {
          id: number
          store_id: number
          customer_id: number | null
          invoice_number: string
          sale_date: string
          sub_total: number
          discount: number
          tax: number
          grand_total: number
          payment_method: "cash" | "transfer" | "qris" | "debt"
          payment_status: "paid" | "debt" | "partial" | "refunded"
          amount_received: number
          change_amount: number
          due_date: string | null
          note: string | null
          cashier_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          customer_id?: number | null
          invoice_number: string
          sale_date?: string
          sub_total?: number
          discount?: number
          tax?: number
          grand_total: number
          payment_method: "cash" | "transfer" | "qris" | "debt"
          payment_status: "paid" | "debt" | "partial" | "refunded"
          amount_received?: number
          change_amount?: number
          due_date?: string | null
          note?: string | null
          cashier_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          customer_id?: number | null
          invoice_number?: string
          sale_date?: string
          sub_total?: number
          discount?: number
          tax?: number
          grand_total?: number
          payment_method?: "cash" | "transfer" | "qris" | "debt"
          payment_status?: "paid" | "debt" | "partial" | "refunded"
          amount_received?: number
          change_amount?: number
          due_date?: string | null
          note?: string | null
          cashier_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      sale_items: {
        Row: {
          id: number
          sale_id: number
          product_id: number | null
          product_name: string
          product_code: string | null
          quantity: number
          price_per_unit: number
          cost_per_unit: number
          total_price: number
          price_mode: "retail" | "wholesale" | "special" | null
          is_service: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          sale_id: number
          product_id?: number | null
          product_name: string
          product_code?: string | null
          quantity: number
          price_per_unit: number
          cost_per_unit?: number
          total_price: number
          price_mode?: "retail" | "wholesale" | "special" | null
          is_service?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          sale_id?: number
          product_id?: number | null
          product_name?: string
          product_code?: string | null
          quantity?: number
          price_per_unit?: number
          cost_per_unit?: number
          total_price?: number
          price_mode?: "retail" | "wholesale" | "special" | null
          is_service?: boolean | null
          created_at?: string | null
        }
        Relationships: any[]
      }
      shipments: {
        Row: {
          id: number
          store_id: number
          sale_id: number | null
          invoice_number: string | null
          customer_id: number | null
          recipient_name: string
          recipient_phone: string
          recipient_address: string
          items_description: string | null
          shipping_cost: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          sale_id?: number | null
          invoice_number?: string | null
          customer_id?: number | null
          recipient_name: string
          recipient_phone: string
          recipient_address: string
          items_description?: string | null
          shipping_cost?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          sale_id?: number | null
          invoice_number?: string | null
          customer_id?: number | null
          recipient_name?: string
          recipient_phone?: string
          recipient_address?: string
          items_description?: string | null
          shipping_cost?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      suppliers: {
        Row: {
          id: number
          store_id: number
          name: string
          phone: string
          address: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          phone: string
          address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          phone?: string
          address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      purchases: {
        Row: {
          id: number
          store_id: number
          supplier_id: number | null
          reference_no: string
          purchase_date: string
          total_amount: number
          image_proof: string | null
          note: string | null
          created_at: string | null
          updated_at: string | null
          payment_status: "unpaid" | "partial" | "paid" | null
        }
        Insert: {
          id?: number
          store_id: number
          supplier_id?: number | null
          reference_no: string
          purchase_date?: string
          total_amount?: number
          image_proof?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
          payment_status?: "unpaid" | "partial" | "paid" | null
        }
        Update: {
          id?: number
          store_id?: number
          supplier_id?: number | null
          reference_no?: string
          purchase_date?: string
          total_amount?: number
          image_proof?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
          payment_status?: "unpaid" | "partial" | "paid" | null
        }
        Relationships: any[]
      }
      purchase_items: {
        Row: {
          id: number
          purchase_id: number
          product_id: number | null
          product_name: string
          product_code: string | null
          quantity: number
          cost_price: number
          sub_total: number
          created_at: string | null
        }
        Insert: {
          id?: number
          purchase_id: number
          product_id?: number | null
          product_name: string
          product_code?: string | null
          quantity: number
          cost_price: number
          sub_total: number
          created_at?: string | null
        }
        Update: {
          id?: number
          purchase_id?: number
          product_id?: number | null
          product_name?: string
          product_code?: string | null
          quantity?: number
          cost_price?: number
          sub_total?: number
          created_at?: string | null
        }
        Relationships: any[]
      }
      stock_opnames: {
        Row: {
          id: number
          store_id: number
          opname_number: string
          opname_date: string
          note: string | null
          status: "draft" | "completed"
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          opname_number: string
          opname_date?: string
          note?: string | null
          status?: "draft" | "completed"
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          opname_number?: string
          opname_date?: string
          note?: string | null
          status?: "draft" | "completed"
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      stock_opname_items: {
        Row: {
          id: number
          opname_id: number
          product_id: number
          system_stock: number
          physical_stock: number
          difference: number
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          opname_id: number
          product_id: number
          system_stock: number
          physical_stock: number
          difference: number
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          opname_id?: number
          product_id?: number
          system_stock?: number
          physical_stock?: number
          difference?: number
          note?: string | null
          created_at?: string | null
        }
        Relationships: any[]
      }
      debt_payments: {
        Row: {
          id: number
          sale_id: number
          amount: number
          payment_date: string
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          sale_id: number
          amount: number
          payment_date?: string
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          sale_id?: number
          amount?: number
          payment_date?: string
          note?: string | null
          created_at?: string | null
        }
        Relationships: any[]
      }
      expense_categories: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          created_at?: string | null
        }
        Relationships: any[]
      }
      expenses: {
        Row: {
          id: number
          store_id: number
          category_id: number
          title: string
          amount: number
          expense_date: string
          note: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          category_id: number
          title: string
          amount: number
          expense_date?: string
          note?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          category_id?: number
          title?: string
          amount?: number
          expense_date?: string
          note?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      categories: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: string | null
          store_id: number | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          created_at?: string | null
          store_id?: number | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          created_at?: string | null
          store_id?: number | null
        }
        Relationships: any[]
      }
      brands: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: string | null
          store_id: number | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          created_at?: string | null
          store_id?: number | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          created_at?: string | null
          store_id?: number | null
        }
        Relationships: any[]
      }
      attendances: {
        Row: {
          id: number
          employee_id: string
          store_id: number
          attendance_date: string
          clock_in: string | null
          clock_out: string | null
          break_out: string | null
          break_in: string | null
          duration_minutes: number | null
          penalty_minutes: number | null
          status: "complete" | "partial" | "incomplete"
          note: string | null
          is_manual_edit: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          employee_id: string
          store_id: number
          attendance_date: string
          clock_in?: string | null
          clock_out?: string | null
          break_out?: string | null
          break_in?: string | null
          duration_minutes?: number | null
          penalty_minutes?: number | null
          status: "complete" | "partial" | "incomplete"
          note?: string | null
          is_manual_edit?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          employee_id?: string
          store_id?: number
          attendance_date?: string
          clock_in?: string | null
          clock_out?: string | null
          break_out?: string | null
          break_in?: string | null
          duration_minutes?: number | null
          penalty_minutes?: number | null
          status?: "complete" | "partial" | "incomplete"
          note?: string | null
          is_manual_edit?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      payrolls: {
        Row: {
          id: number
          employee_id: string
          store_id: number
          month: number
          year: number
          daily_salary: number
          days_present: number
          total_salary: number
          status: "pending" | "transferred"
          transferred_at: string | null
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          employee_id: string
          store_id: number
          month: number
          year: number
          daily_salary: number
          days_present?: number
          total_salary: number
          status?: "pending" | "transferred"
          transferred_at?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          employee_id?: string
          store_id?: number
          month?: number
          year?: number
          daily_salary?: number
          days_present?: number
          total_salary?: number
          status?: "pending" | "transferred"
          transferred_at?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      supplier_payments: {
        Row: {
          id: number
          store_id: number
          purchase_id: number
          supplier_id: number | null
          amount: number
          payment_date: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          purchase_id: number
          supplier_id?: number | null
          amount: number
          payment_date?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          purchase_id?: number
          supplier_id?: number | null
          amount?: number
          payment_date?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: any[]
      }
      units: {
        Row: {
          id: number
          store_id: number
          name: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          description?: string | null
          created_at?: string | null
        }
        Relationships: any[]
      }
      main_products: {
        Row: {
          id: number
          store_id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: any[]
      }
      variants: {
        Row: {
          id: number
          store_id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: any[]
      }
      specifications: {
        Row: {
          id: number
          store_id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: any[]
      }
      sizes: {
        Row: {
          id: number
          store_id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          store_id: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          store_id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: any[]
      }
      user_sessions: {
        Row: {
          id: string
          employee_id: string
          session_token: string
          expires_at: string
          created_at: string | null
          last_activity: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          session_token: string
          expires_at: string
          created_at?: string | null
          last_activity?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          session_token?: string
          expires_at?: string
          created_at?: string | null
          last_activity?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: any[]
      }
    }
    Views: {
      supplier_debt_summary: {
        Row: {
          purchase_id: number
          supplier_id: number
          supplier_name: string
          reference_no: string
          purchase_date: string
          total_amount: number
          paid_amount: number
          status: "unpaid" | "partial" | "paid"
          due_date: string | null
          note: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      hash_password: {
        Args: {
          plain_password: string
        }
        Returns: string
      }
      verify_password: {
        Args: {
          plain_password: string
          hashed_password: any
        }
        Returns: boolean
      }
      create_session: {
        Args: {
          p_employee_id: string
          p_ip_address?: string | null
          p_user_agent?: string | null
        }
        Returns: string
      }
      validate_session: {
        Args: {
          p_session_token: string
        }
        Returns: {
          id: string
          store_id: number | null
          username: string
          name: string
          role: string
          is_active: boolean
        }[]
      }
      delete_session: {
        Args: {
          p_session_token: string
        }
        Returns: void
      }
      get_total_paid_for_purchase: {
        Args: {
          p_purchase_id: number
        }
        Returns: number
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

type PublicSchema = Database["public"]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
