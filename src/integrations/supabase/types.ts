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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      login_logs: {
        Row: {
          device: string | null
          id: string
          ip: string | null
          login_time: string
          user_id: string
        }
        Insert: {
          device?: string | null
          id?: string
          ip?: string | null
          login_time?: string
          user_id: string
        }
        Update: {
          device?: string | null
          id?: string
          ip?: string | null
          login_time?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price_at_purchase: number
          product_id: string
        }
        Insert: {
          id?: string
          order_id: string
          price_at_purchase: number
          product_id: string
        }
        Update: {
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          buyer_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          buyer_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: []
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          product_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          author: string | null
          book_tag: string | null
          condition: Database["public"]["Enums"]["product_condition"]
          condition_note: string | null
          cover_image_url: string | null
          created_at: string
          defect_description: string | null
          description: string | null
          grade: string[] | null
          id: string
          name: string
          price: number
          publish_date: string | null
          publisher: string | null
          school: string | null
          seller_id: string
          semester: string | null
          status: Database["public"]["Enums"]["product_status"]
          translator: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
          view_count: number
        }
        Insert: {
          author?: string | null
          book_tag?: string | null
          condition: Database["public"]["Enums"]["product_condition"]
          condition_note?: string | null
          cover_image_url?: string | null
          created_at?: string
          defect_description?: string | null
          description?: string | null
          grade?: string[] | null
          id?: string
          name: string
          price: number
          publish_date?: string | null
          publisher?: string | null
          school?: string | null
          seller_id: string
          semester?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          translator?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          view_count?: number
        }
        Update: {
          author?: string | null
          book_tag?: string | null
          condition?: Database["public"]["Enums"]["product_condition"]
          condition_note?: string | null
          cover_image_url?: string | null
          created_at?: string
          defect_description?: string | null
          description?: string | null
          grade?: string[] | null
          id?: string
          name?: string
          price?: number
          publish_date?: string | null
          publisher?: string | null
          school?: string | null
          seller_id?: string
          semester?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          translator?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          child_grade: string | null
          child_semester: string | null
          city: string | null
          community: string | null
          created_at: string
          district: string | null
          id: string
          nickname: string
          phone: string
          province: string | null
          school: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          child_grade?: string | null
          child_semester?: string | null
          city?: string | null
          community?: string | null
          created_at?: string
          district?: string | null
          id?: string
          nickname: string
          phone: string
          province?: string | null
          school?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          child_grade?: string | null
          child_semester?: string | null
          city?: string | null
          community?: string | null
          created_at?: string
          district?: string | null
          id?: string
          nickname?: string
          phone?: string
          province?: string | null
          school?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string | null
          cooperation_score: number
          created_at: string
          description_match_score: number | null
          id: string
          is_default: boolean
          order_id: string
          reviewee_id: string
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["reviewer_role"]
        }
        Insert: {
          content?: string | null
          cooperation_score: number
          created_at?: string
          description_match_score?: number | null
          id?: string
          is_default?: boolean
          order_id: string
          reviewee_id: string
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["reviewer_role"]
        }
        Update: {
          content?: string | null
          cooperation_score?: number
          created_at?: string
          description_match_score?: number | null
          id?: string
          is_default?: boolean
          order_id?: string
          reviewee_id?: string
          reviewer_id?: string
          reviewer_role?: Database["public"]["Enums"]["reviewer_role"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_login_logs: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_product_status: {
        Args: { _product_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "enabled" | "disabled"
      app_role: "admin" | "moderator" | "user"
      order_status: "trading" | "completed" | "cancelled"
      product_condition:
        | "brand_new"
        | "almost_new"
        | "slightly_used"
        | "used"
        | "heavily_used"
      product_status: "on_sale" | "in_trade" | "sold" | "off_shelf"
      product_type: "book" | "other"
      reviewer_role: "buyer" | "seller"
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
    Enums: {
      account_status: ["enabled", "disabled"],
      app_role: ["admin", "moderator", "user"],
      order_status: ["trading", "completed", "cancelled"],
      product_condition: [
        "brand_new",
        "almost_new",
        "slightly_used",
        "used",
        "heavily_used",
      ],
      product_status: ["on_sale", "in_trade", "sold", "off_shelf"],
      product_type: ["book", "other"],
      reviewer_role: ["buyer", "seller"],
    },
  },
} as const
