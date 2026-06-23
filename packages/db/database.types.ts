export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          acquisition_product: string | null
          acquisition_source: string | null
          created_at: string
          id: string
          primary_email: string
        }
        Insert: {
          acquisition_product?: string | null
          acquisition_source?: string | null
          created_at?: string
          id?: string
          primary_email: string
        }
        Update: {
          acquisition_product?: string | null
          acquisition_source?: string | null
          created_at?: string
          id?: string
          primary_email?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          id: string
          page_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          forwarded_to: string | null
          id: string
          page_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          forwarded_to?: string | null
          id?: string
          page_id: string
          payload: Json
        }
        Update: {
          created_at?: string
          forwarded_to?: string | null
          id?: string
          page_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          account_id: string
          brand_color: string | null
          content_json: Json
          created_at: string
          custom_domain: string | null
          id: string
          logo_url: string | null
          published_at: string | null
          qr_code_id: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          brand_color?: string | null
          content_json: Json
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          published_at?: string | null
          qr_code_id?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          brand_color?: string | null
          content_json?: Json
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          published_at?: string | null
          qr_code_id?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_access: {
        Row: {
          account_id: string
          active: boolean
          id: string
          product: string
          source: string
          tier: string
          updated_at: string
        }
        Insert: {
          account_id: string
          active?: boolean
          id?: string
          product: string
          source?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          id?: string
          product?: string
          source?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_access_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          is_dynamic: boolean
          label: string | null
          scan_count: number
          slug: string
          source_product: string
          target_url: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_dynamic?: boolean
          label?: string | null
          scan_count?: number
          slug: string
          source_product?: string
          target_url: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_dynamic?: boolean
          label?: string | null
          scan_count?: number
          slug?: string
          source_product?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          country: string | null
          id: string
          qr_code_id: string
          referer: string | null
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          id?: string
          qr_code_id: string
          referer?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          id?: string
          qr_code_id?: string
          referer?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_id: string
          auth_provider: string
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          account_id: string
          auth_provider?: string
          created_at?: string
          email: string
          id: string
          role?: string
        }
        Update: {
          account_id?: string
          auth_provider?: string
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_account_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
