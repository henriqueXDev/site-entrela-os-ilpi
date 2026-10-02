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
      clinical_assignments: {
        Row: {
          assigned_at: string
          profile: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          profile: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          profile?: string
          user_id?: string
        }
        Relationships: []
      }
      clinical_audit: {
        Row: {
          action: string
          actor_id: string
          details: Json
          id: string
          occurred_at: string
          paciente_id: string | null
          record_id: string | null
          record_type: string
        }
        Insert: {
          action: string
          actor_id: string
          details?: Json
          id?: string
          occurred_at?: string
          paciente_id?: string | null
          record_id?: string | null
          record_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          details?: Json
          id?: string
          occurred_at?: string
          paciente_id?: string | null
          record_id?: string | null
          record_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          document_date: string | null
          encounter_id: string | null
          id: string
          kind: string
          mime_type: string
          original_filename: string
          paciente_id: string
          replaces_id: string | null
          size_bytes: number
          status: string
          storage_path: string
          title: string
          uploaded_by: string
          version_group_id: string
          version_number: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          document_date?: string | null
          encounter_id?: string | null
          id?: string
          kind: string
          mime_type: string
          original_filename: string
          paciente_id: string
          replaces_id?: string | null
          size_bytes: number
          status?: string
          storage_path: string
          title: string
          uploaded_by?: string
          version_group_id?: string
          version_number?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          document_date?: string | null
          encounter_id?: string | null
          id?: string
          kind?: string
          mime_type?: string
          original_filename?: string
          paciente_id?: string
          replaces_id?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          title?: string
          uploaded_by?: string
          version_group_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_documents_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "evolucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_replaces_id_fkey"
            columns: ["replaces_id"]
            isOneToOne: false
            referencedRelation: "clinical_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_permissions: {
        Row: {
          action: string
          allowed: boolean
          profile: string
        }
        Insert: {
          action: string
          allowed?: boolean
          profile: string
        }
        Update: {
          action?: string
          allowed?: boolean
          profile?: string
        }
        Relationships: []
      }
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
      evolucoes: {
        Row: {
          condutas: string | null
          created_at: string
          created_by: string
          data_atendimento: string
          especialidade: string | null
          evolucao: string
          id: string
          motivo_retificacao: string | null
          observacoes: string | null
          orientacoes: string | null
          paciente_id: string
          profissional: string
          queixa: string | null
          retifica_id: string | null
          tipo_atendimento: string | null
        }
        Insert: {
          condutas?: string | null
          created_at?: string
          created_by?: string
          data_atendimento?: string
          especialidade?: string | null
          evolucao: string
          id?: string
          motivo_retificacao?: string | null
          observacoes?: string | null
          orientacoes?: string | null
          paciente_id: string
          profissional: string
          queixa?: string | null
          retifica_id?: string | null
          tipo_atendimento?: string | null
        }
        Update: {
          condutas?: string | null
          created_at?: string
          created_by?: string
          data_atendimento?: string
          especialidade?: string | null
          evolucao?: string
          id?: string
          motivo_retificacao?: string | null
          observacoes?: string | null
          orientacoes?: string | null
          paciente_id?: string
          profissional?: string
          queixa?: string | null
          retifica_id?: string | null
          tipo_atendimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evolucoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolucoes_retifica_id_fkey"
            columns: ["retifica_id"]
            isOneToOne: false
            referencedRelation: "evolucoes"
            referencedColumns: ["id"]
          },
        ]
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
      pacientes: {
        Row: {
          created_at: string
          created_by: string
          documento: string | null
          foto_url: string | null
          id: string
          nascimento: string | null
          nome: string
          profissional_responsavel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          documento?: string | null
          foto_url?: string | null
          id?: string
          nascimento?: string | null
          nome: string
          profissional_responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          documento?: string | null
          foto_url?: string | null
          id?: string
          nascimento?: string | null
          nome?: string
          profissional_responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescricoes: {
        Row: {
          created_at: string
          created_by: string
          data_prescricao: string
          dosagem: string
          duracao: string | null
          frequencia: string | null
          id: string
          medicamento: string
          motivo_retificacao: string | null
          orientacoes: string | null
          paciente_id: string
          prescritor: string
          quantidade: string | null
          retifica_id: string | null
          status: string
          via: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          data_prescricao?: string
          dosagem: string
          duracao?: string | null
          frequencia?: string | null
          id?: string
          medicamento: string
          motivo_retificacao?: string | null
          orientacoes?: string | null
          paciente_id: string
          prescritor: string
          quantidade?: string | null
          retifica_id?: string | null
          status?: string
          via?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          data_prescricao?: string
          dosagem?: string
          duracao?: string | null
          frequencia?: string | null
          id?: string
          medicamento?: string
          motivo_retificacao?: string | null
          orientacoes?: string | null
          paciente_id?: string
          prescritor?: string
          quantidade?: string | null
          retifica_id?: string | null
          status?: string
          via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescricoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescricoes_retifica_id_fkey"
            columns: ["retifica_id"]
            isOneToOne: false
            referencedRelation: "prescricoes"
            referencedColumns: ["id"]
          },
        ]
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
      clinical_allowed: {
        Args: { _action: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_clinical_access: {
        Args: {
          _action: string
          _patient_id: string
          _record_id?: string
          _record_type?: string
        }
        Returns: undefined
      }
      log_clinical_file_action: {
        Args: { _action: string; _document_id: string }
        Returns: undefined
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
