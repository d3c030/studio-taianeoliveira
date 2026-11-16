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
      agenda_days: {
        Row: {
          created_at: string
          date: string
          id: string
          is_open: boolean
          note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_open: boolean
          note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_open?: boolean
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      appointment_payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          amount: number
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          date: string
          discount: number
          id: string
          notes: string | null
          payment_method: string | null
          procedure: string | null
          status: string
          subtotal: number
          time: string | null
        }
        Insert: {
          amount?: number
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          date: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          procedure?: string | null
          status?: string
          subtotal?: number
          time?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          date?: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          procedure?: string | null
          status?: string
          subtotal?: number
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          created_at: string
          id: string
          instagram_url: string
          logo_url: string
          pix_copia_cola: string
          pix_key: string
          pix_qr_url: string | null
          theme: string
          updated_at: string
          whatsapp_message_template: string
          whatsapp_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_url?: string
          logo_url?: string
          pix_copia_cola?: string
          pix_key?: string
          pix_qr_url?: string | null
          theme?: string
          updated_at?: string
          whatsapp_message_template?: string
          whatsapp_phone?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_url?: string
          logo_url?: string
          pix_copia_cola?: string
          pix_key?: string
          pix_qr_url?: string | null
          theme?: string
          updated_at?: string
          whatsapp_message_template?: string
          whatsapp_phone?: string
        }
        Relationships: []
      }
      diag_clientes: {
        Row: {
          criado_em: string
          email: string | null
          foto_perfil: string | null
          id: string
          instagram: string | null
          nome: string
          objetivo: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          criado_em?: string
          email?: string | null
          foto_perfil?: string | null
          id?: string
          instagram?: string | null
          nome: string
          objetivo?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Update: {
          criado_em?: string
          email?: string | null
          foto_perfil?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          objetivo?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      diag_cobrancas: {
        Row: {
          criado_em: string
          desconto: number
          descricao: string
          diagnostico_id: string
          id: string
          ordem: number
          valor: number
        }
        Insert: {
          criado_em?: string
          desconto?: number
          descricao?: string
          diagnostico_id: string
          id?: string
          ordem?: number
          valor?: number
        }
        Update: {
          criado_em?: string
          desconto?: number
          descricao?: string
          diagnostico_id?: string
          id?: string
          ordem?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "diag_cobrancas_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diag_diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      diag_compartilhamentos: {
        Row: {
          arquivo: string
          cliente_nome: string
          criado_em: string
          diagnostico_id: string
          expira_em: string
          nome_arquivo: string
          token: string
        }
        Insert: {
          arquivo: string
          cliente_nome?: string
          criado_em?: string
          diagnostico_id: string
          expira_em?: string
          nome_arquivo: string
          token?: string
        }
        Update: {
          arquivo?: string
          cliente_nome?: string
          criado_em?: string
          diagnostico_id?: string
          expira_em?: string
          nome_arquivo?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "diag_compartilhamentos_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diag_diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      diag_configuracoes: {
        Row: {
          cor_destaque: string
          logo_url: string | null
          nome_exibicao: string
          rodape: string
          template_json: Json | null
          user_id: string
        }
        Insert: {
          cor_destaque?: string
          logo_url?: string | null
          nome_exibicao?: string
          rodape?: string
          template_json?: Json | null
          user_id?: string
        }
        Update: {
          cor_destaque?: string
          logo_url?: string | null
          nome_exibicao?: string
          rodape?: string
          template_json?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      diag_diagnosticos: {
        Row: {
          atualizado_em: string
          cliente_id: string
          criado_em: string
          id: string
          resumo_plano_acao: string
          status: string
          titulo: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          id?: string
          resumo_plano_acao?: string
          status?: string
          titulo?: string
          user_id?: string
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          id?: string
          resumo_plano_acao?: string
          status?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diag_diagnosticos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "diag_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      diag_itens: {
        Row: {
          diagnostico_id: string
          id: string
          o_que_eu_vi: string
          ordem: number
          secao: string
          status: string
          sua_tarefa: string
          titulo: string
        }
        Insert: {
          diagnostico_id: string
          id?: string
          o_que_eu_vi?: string
          ordem?: number
          secao?: string
          status?: string
          sua_tarefa?: string
          titulo?: string
        }
        Update: {
          diagnostico_id?: string
          id?: string
          o_que_eu_vi?: string
          ordem?: number
          secao?: string
          status?: string
          sua_tarefa?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "diag_itens_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diag_diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      diag_midias: {
        Row: {
          diagnostico_id: string
          id: string
          item_id: string | null
          legenda: string
          ordem: number
          tipo: string
          url_arquivo: string
        }
        Insert: {
          diagnostico_id: string
          id?: string
          item_id?: string | null
          legenda?: string
          ordem?: number
          tipo: string
          url_arquivo: string
        }
        Update: {
          diagnostico_id?: string
          id?: string
          item_id?: string | null
          legenda?: string
          ordem?: number
          tipo?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "diag_midias_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diag_diagnosticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diag_midias_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "diag_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      diag_pagamentos: {
        Row: {
          criado_em: string
          diagnostico_id: string
          forma: string | null
          id: string
          obs: string | null
          pago_em: string
          valor: number
        }
        Insert: {
          criado_em?: string
          diagnostico_id: string
          forma?: string | null
          id?: string
          obs?: string | null
          pago_em?: string
          valor?: number
        }
        Update: {
          criado_em?: string
          diagnostico_id?: string
          forma?: string | null
          id?: string
          obs?: string | null
          pago_em?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "diag_pagamentos_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diag_diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          category: string | null
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: []
      }
      grupo_check: {
        Row: {
          confianca: number | null
          emoji_lido: string | null
          id: string
          nome_lido: string | null
          origem: string
          participante_id: string
          rodada_id: string
          status: string
        }
        Insert: {
          confianca?: number | null
          emoji_lido?: string | null
          id?: string
          nome_lido?: string | null
          origem?: string
          participante_id: string
          rodada_id: string
          status: string
        }
        Update: {
          confianca?: number | null
          emoji_lido?: string | null
          id?: string
          nome_lido?: string | null
          origem?: string
          participante_id?: string
          rodada_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_check_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "grupo_participante"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_check_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "grupo_rodada"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_engaj: {
        Row: {
          criado_em: string
          dias_missao: string[]
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          dias_missao?: string[]
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          dias_missao?: string[]
          id?: string
          nome?: string
        }
        Relationships: []
      }
      grupo_leitura_nao_vinculada: {
        Row: {
          emoji_lido: string | null
          id: string
          nome_lido: string
          resolvido: boolean
          rodada_id: string
        }
        Insert: {
          emoji_lido?: string | null
          id?: string
          nome_lido: string
          resolvido?: boolean
          rodada_id: string
        }
        Update: {
          emoji_lido?: string | null
          id?: string
          nome_lido?: string
          resolvido?: boolean
          rodada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_leitura_nao_vinculada_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "grupo_rodada"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_participante: {
        Row: {
          apelidos: string[]
          ativo: boolean
          emoji_habitual: string | null
          entrou_em: string
          grupo_id: string
          id: string
          nome_exibicao: string | null
          novata: boolean
          username: string
        }
        Insert: {
          apelidos?: string[]
          ativo?: boolean
          emoji_habitual?: string | null
          entrou_em?: string
          grupo_id: string
          id?: string
          nome_exibicao?: string | null
          novata?: boolean
          username: string
        }
        Update: {
          apelidos?: string[]
          ativo?: boolean
          emoji_habitual?: string | null
          entrou_em?: string
          grupo_id?: string
          id?: string
          nome_exibicao?: string | null
          novata?: boolean
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_participante_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupo_engaj"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_rodada: {
        Row: {
          criado_em: string
          data: string
          dia_semana: string
          grupo_id: string
          id: string
          status: string
        }
        Insert: {
          criado_em?: string
          data: string
          dia_semana: string
          grupo_id: string
          id?: string
          status?: string
        }
        Update: {
          criado_em?: string
          data?: string
          dia_semana?: string
          grupo_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_rodada_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupo_engaj"
            referencedColumns: ["id"]
          },
        ]
      }
      mk_kits: {
        Row: {
          atualizado_em: string
          criado_em: string
          dados: Json
          fotos: Json
          id: string
          publico: boolean
          textos: Json
          token: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          fotos?: Json
          id?: string
          publico?: boolean
          textos?: Json
          token?: string
          user_id?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          fotos?: Json
          id?: string
          publico?: boolean
          textos?: Json
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          created_at: string
          default_price: number
          estimated_minutes: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          estimated_minutes?: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_price?: number
          estimated_minutes?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_acessos: {
        Row: {
          data: string
          dispositivo: string | null
          id: string
          pagina: string | null
          referrer: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          data?: string
          dispositivo?: string | null
          id?: string
          pagina?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          data?: string
          dispositivo?: string | null
          id?: string
          pagina?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      site_cupons: {
        Row: {
          ativo: boolean
          codigo: string
          criado_em: string
          desconto: string
          descricao: string
          empresa: string
          id: string
          limite_usos: number | null
          logo_url: string | null
          ordem: number
          titulo: string
          usos: number
          validade_fim: string | null
          validade_inicio: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          criado_em?: string
          desconto?: string
          descricao?: string
          empresa?: string
          id?: string
          limite_usos?: number | null
          logo_url?: string | null
          ordem?: number
          titulo?: string
          usos?: number
          validade_fim?: string | null
          validade_inicio?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          criado_em?: string
          desconto?: string
          descricao?: string
          empresa?: string
          id?: string
          limite_usos?: number | null
          logo_url?: string | null
          ordem?: number
          titulo?: string
          usos?: number
          validade_fim?: string | null
          validade_inicio?: string | null
        }
        Relationships: []
      }
      site_leads: {
        Row: {
          cliente_id: string | null
          criado_em: string
          email: string | null
          id: string
          instagram: string | null
          mensagem: string | null
          nicho: string | null
          nome: string
          objetivo: string | null
          origem_cupom: string | null
          status: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          instagram?: string | null
          mensagem?: string | null
          nicho?: string | null
          nome: string
          objetivo?: string | null
          origem_cupom?: string | null
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          instagram?: string | null
          mensagem?: string | null
          nicho?: string | null
          nome?: string
          objetivo?: string | null
          origem_cupom?: string | null
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      site_paginas: {
        Row: {
          atualizado_em: string
          publicado_json: Json
          rascunho_json: Json
          seo: Json
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          publicado_json?: Json
          rascunho_json?: Json
          seo?: Json
          user_id?: string
        }
        Update: {
          atualizado_em?: string
          publicado_json?: Json
          rascunho_json?: Json
          seo?: Json
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      normalize_client_name: { Args: { _name: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
