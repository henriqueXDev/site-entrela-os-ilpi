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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          mes_referencia: string | null
          observacoes: string | null
          status: string
          valor: number | null
        }
        Insert: {
          categoria: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          status?: string
          valor?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          status?: string
          valor?: number | null
        }
        Relationships: []
      }
      folha_pagamento: {
        Row: {
          cargo: string | null
          created_at: string
          custo_total: number | null
          data_pagamento: string | null
          fgts: number | null
          funcionario: string
          id: string
          inss: number | null
          mes_referencia: string | null
          observacoes: string | null
          outros_descontos: number | null
          plantao_extra: number | null
          salario_bruto: number | null
          salario_liquido: number | null
          status: string
          vale_transporte: number | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          custo_total?: number | null
          data_pagamento?: string | null
          fgts?: number | null
          funcionario: string
          id?: string
          inss?: number | null
          mes_referencia?: string | null
          observacoes?: string | null
          outros_descontos?: number | null
          plantao_extra?: number | null
          salario_bruto?: number | null
          salario_liquido?: number | null
          status?: string
          vale_transporte?: number | null
        }
        Update: {
          cargo?: string | null
          created_at?: string
          custo_total?: number | null
          data_pagamento?: string | null
          fgts?: number | null
          funcionario?: string
          id?: string
          inss?: number | null
          mes_referencia?: string | null
          observacoes?: string | null
          outros_descontos?: number | null
          plantao_extra?: number | null
          salario_bruto?: number | null
          salario_liquido?: number | null
          status?: string
          vale_transporte?: number | null
        }
        Relationships: []
      }
      mensalidades: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          forma_pagamento: string | null
          id: string
          mes_referencia: string | null
          observacoes: string | null
          residente: string
          status: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          residente: string
          status?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          residente?: string
          status?: string
          valor?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
