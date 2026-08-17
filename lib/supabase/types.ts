export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anotacao: {
        Row: {
          autor_id: string | null
          criado_em: string
          id: string
          negocio_id: string | null
          organizacao_id: string | null
          pessoa_id: string | null
          texto: string
        }
        Insert: {
          autor_id?: string | null
          criado_em?: string
          id?: string
          negocio_id: string | null
          organizacao_id: string | null
          pessoa_id: string | null
          texto: string
        }
        Update: {
          autor_id?: string | null
          criado_em?: string
          id?: string
          negocio_id?: string | null
          organizacao_id?: string | null
          pessoa_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacao_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacao_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      area_produto: {
        Row: {
          ativo: boolean
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      atividade: {
        Row: {
          concluida: boolean
          criado_em: string
          data: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          negocio_id: string | null
          organizacao_id: string | null
          pessoa_id: string | null
          responsavel_id: string | null
          tipo_id: string | null
          titulo: string | null
        }
        Insert: {
          concluida?: boolean
          criado_em?: string
          data: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          negocio_id: string | null
          organizacao_id: string | null
          pessoa_id: string | null
          responsavel_id?: string | null
          tipo_id?: string | null
          titulo?: string | null
        }
        Update: {
          concluida?: boolean
          criado_em?: string
          data?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          negocio_id?: string | null
          organizacao_id?: string | null
          pessoa_id?: string | null
          responsavel_id?: string | null
          tipo_id?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividade_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipo_atividade"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa: {
        Row: {
          funil_id: string
          id: string
          nome: string
          ordem: number
          status_inicial: Database["public"]["Enums"]["status_negocio"]
        }
        Insert: {
          funil_id: string
          id?: string
          nome: string
          ordem: number
          status_inicial?: Database["public"]["Enums"]["status_negocio"]
        }
        Update: {
          funil_id?: string
          id?: string
          nome?: string
          ordem?: number
          status_inicial?: Database["public"]["Enums"]["status_negocio"]
        }
        Relationships: [
          {
            foreignKeyName: "etapa_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funil"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_negocio: {
        Row: {
          autor_id: string | null
          id: number
          negocio_id: string
          ocorrido_em: string
          origem_carga: boolean
          tipo: Database["public"]["Enums"]["tipo_evento"]
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          autor_id?: string | null
          id?: number
          negocio_id: string
          ocorrido_em?: string
          origem_carga?: boolean
          tipo: Database["public"]["Enums"]["tipo_evento"]
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          autor_id?: string | null
          id?: number
          negocio_id?: string
          ocorrido_em?: string
          origem_carga?: boolean
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_negocio_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_negocio_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      forma_contato: {
        Row: {
          id: string
          pessoa_id: string
          tipo: string
          valor: string
        }
        Insert: {
          id?: string
          pessoa_id: string
          tipo: string
          valor: string
        }
        Update: {
          id?: string
          pessoa_id?: string
          tipo?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "forma_contato_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      funil: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      motivo_perda: {
        Row: {
          ativo: boolean
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      negocio: {
        Row: {
          atualizado_em: string
          criado_em: string
          etapa_id: string | null
          id: string
          motivo_perda_id: string | null
          organizacao_id: string
          origem_id: string | null
          produto_id: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_negocio"]
          titulo: string
          valor: number | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          etapa_id?: string | null
          id?: string
          motivo_perda_id?: string | null
          organizacao_id: string
          origem_id?: string | null
          produto_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_negocio"]
          titulo: string
          valor?: number | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          etapa_id?: string | null
          id?: string
          motivo_perda_id?: string | null
          organizacao_id?: string
          origem_id?: string | null
          produto_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_negocio"]
          titulo?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negocio_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivo_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "origem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_pessoa: {
        Row: {
          negocio_id: string
          pessoa_id: string
        }
        Insert: {
          negocio_id: string
          pessoa_id: string
        }
        Update: {
          negocio_id?: string
          pessoa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_pessoa_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_pessoa_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacao: {
        Row: {
          bubble_id: string | null
          cidade: string | null
          criado_em: string
          id: string
          nome: string
          website: string | null
        }
        Insert: {
          bubble_id?: string | null
          cidade?: string | null
          criado_em?: string
          id?: string
          nome: string
          website?: string | null
        }
        Update: {
          bubble_id?: string | null
          cidade?: string | null
          criado_em?: string
          id?: string
          nome?: string
          website?: string | null
        }
        Relationships: []
      }
      origem: {
        Row: {
          ativo: boolean
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      papel: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      papel_permissao: {
        Row: {
          papel_id: string
          permissao_id: string
        }
        Insert: {
          papel_id: string
          permissao_id: string
        }
        Update: {
          papel_id?: string
          permissao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papel_permissao_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papel_permissao_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissao"
            referencedColumns: ["id"]
          },
        ]
      }
      permissao: {
        Row: {
          chave: string
          id: string
        }
        Insert: {
          chave: string
          id?: string
        }
        Update: {
          chave?: string
          id?: string
        }
        Relationships: []
      }
      pessoa: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      pessoa_organizacao: {
        Row: {
          cargo: string | null
          organizacao_id: string
          pessoa_id: string
        }
        Insert: {
          cargo?: string | null
          organizacao_id: string
          pessoa_id: string
        }
        Update: {
          cargo?: string | null
          organizacao_id?: string
          pessoa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_organizacao_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_organizacao_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      produto: {
        Row: {
          area_id: string | null
          id: string
          nome: string
        }
        Insert: {
          area_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          area_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_atividade: {
        Row: {
          ativo: boolean
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      usuario: {
        Row: {
          ativo: boolean
          auth_id: string | null
          criado_em: string
          email: string
          foto_url: string | null
          id: string
          nome: string
          papel_id: string
        }
        Insert: {
          ativo?: boolean
          auth_id?: string | null
          criado_em?: string
          email: string
          foto_url?: string | null
          id?: string
          nome: string
          papel_id: string
        }
        Update: {
          ativo?: boolean
          auth_id?: string | null
          criado_em?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          papel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papel"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dominio_empresa: { Args: never; Returns: string }
      pertence_ao_dominio: { Args: never; Returns: boolean }
    }
    Enums: {
      status_negocio: "parado" | "negociacao" | "ganho" | "perdido"
      tipo_evento: "etapa" | "valor" | "responsavel" | "status"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      status_negocio: ["parado", "negociacao", "ganho", "perdido"],
      tipo_evento: ["etapa", "valor", "responsavel", "status"],
    },
  },
} as const

