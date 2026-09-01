export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * O recorte que todo indicador aceita (D-064), mais o interruptor de
 * negócios parados (D-067). Fica aqui em cima porque as sete funções o
 * repetem — e porque um recorte que diverge entre indicadores faria dois
 * números da mesma tela discordarem sobre o mesmo conjunto.
 */
export type RecorteIndicador = {
  p_de?: string | null
  p_ate?: string | null
  p_responsavel?: string | null
  p_origem?: string | null
  p_produto?: string | null
  p_area?: string | null
  p_incluir_parados?: boolean
  p_etapa?: string | null
  p_status?: string | null
  p_valor_min?: number | null
  p_valor_max?: number | null
  p_motivo_perda?: string | null
}

/**
 * O recorte do financeiro. Não tem interruptor de parados de propósito:
 * cadastro dormente não é receita nem pipeline, e oferecer a escolha
 * convidaria a somar dinheiro que não existe.
 */
export type RecorteFinanceiro = {
  p_de?: string | null
  p_ate?: string | null
  p_responsavel?: string | null
  p_origem?: string | null
  p_produto?: string | null
  p_area?: string | null
}

/** As dimensões que `financeiro_por_dimensao` sabe agrupar. */
export type DimensaoFinanceira =
  | "responsavel"
  | "origem"
  | "produto"
  | "area"
  | "organizacao"

/** As dimensões que `indicadores_por_dimensao` sabe agrupar. */
export type Dimensao =
  | "motivo_perda"
  | "origem"
  | "status"
  | "responsavel"
  | "produto"
  | "etapa"

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
          organizacao_id?: string | null
          pessoa_id?: string | null
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
          organizacao_id?: string | null
          pessoa_id?: string | null
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
          importado_do_pipedrive: boolean
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
          importado_do_pipedrive?: boolean
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
          importado_do_pipedrive?: boolean
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
      fusao_organizacao: {
        Row: {
          adotados: Json
          autor_id: string | null
          criado_em: string
          duplicada_id: string
          duplicada_nome: string
          id: string
          movidos: Json
          principal_id: string
        }
        Insert: {
          adotados?: Json
          autor_id?: string | null
          criado_em?: string
          duplicada_id: string
          duplicada_nome: string
          id?: string
          movidos: Json
          principal_id: string
        }
        Update: {
          adotados?: Json
          autor_id?: string | null
          criado_em?: string
          duplicada_id?: string
          duplicada_nome?: string
          id?: string
          movidos?: Json
          principal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fusao_organizacao_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fusao_organizacao_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "organizacao"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricao_push: {
        Row: {
          auth: string
          aparelho: string | null
          criado_em: string
          endpoint: string
          id: string
          p256dh: string
          ultimo_envio: string | null
          usuario_id: string
        }
        Insert: {
          auth: string
          aparelho?: string | null
          criado_em?: string
          endpoint: string
          id?: string
          p256dh: string
          ultimo_envio?: string | null
          usuario_id: string
        }
        Update: {
          auth?: string
          aparelho?: string | null
          criado_em?: string
          endpoint?: string
          id?: string
          p256dh?: string
          ultimo_envio?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_push_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
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
          fechado_em: string | null
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
          fechado_em?: string | null
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
          fechado_em?: string | null
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
      notificacao_enviada: {
        Row: {
          chave: string
          enviado_em: string
          usuario_id: string
        }
        Insert: {
          chave: string
          enviado_em?: string
          usuario_id: string
        }
        Update: {
          chave?: string
          enviado_em?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_enviada_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_lida: {
        Row: {
          chave: string
          lido_em: string
          usuario_id: string
        }
        Insert: {
          chave: string
          lido_em?: string
          usuario_id: string
        }
        Update: {
          chave?: string
          lido_em?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_lida_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
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
          uf: string | null
          website: string | null
        }
        Insert: {
          bubble_id?: string | null
          cidade?: string | null
          criado_em?: string
          id?: string
          nome: string
          uf?: string | null
          website?: string | null
        }
        Update: {
          bubble_id?: string | null
          cidade?: string | null
          criado_em?: string
          id?: string
          nome?: string
          uf?: string | null
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
      preferencia_notificacao: {
        Row: {
          ativo: boolean
          criado_em: string
          dias: number | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          dias?: number | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          dias?: number | null
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencia_notificacao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
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
          desenvolvedor: boolean
          preferencia_lista_negocios: string | null
          preferencia_kanban: string | null
          preferencia_atividades: string | null
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
          desenvolvedor?: boolean
          preferencia_lista_negocios?: string | null
          preferencia_kanban?: string | null
          preferencia_atividades?: string | null
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
          desenvolvedor?: boolean
          preferencia_lista_negocios?: string | null
          preferencia_kanban?: string | null
          preferencia_atividades?: string | null
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
      usuario_atual: { Args: never; Returns: string | null }
      padrao_notificacao: {
        Args: { p_tipo: Database["public"]["Enums"]["tipo_notificacao"] }
        Returns: number | null
      }
      /**
       * F8 — os quatro alertas do usuario da sessao, derivados na leitura
       * (D-124). Uma funcao so, porque a restricao e numero de idas ao
       * banco e nao custo de consulta (Doc 15 secao 2.1).
       */
      /**
       * D-144 — os mesmos alertas, para um usuario qualquer. Existe
       * para o enviador de push, que precisa ler a caixa de todo
       * mundo. `security definer` e revogada de `authenticated`: so
       * o service_role executa.
       */
      notificacoes_de: {
        Args: { p_usuario: string }
        Returns: {
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          chave: string
          titulo: string
          detalhe: string
          referencia: string
          destino: string
          conta: boolean
          lida: boolean
        }[]
      }
      notificacoes: {
        Args: never
        Returns: {
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          chave: string
          titulo: string
          detalhe: string
          referencia: string
          destino: string
          /** D-141: so negocio parado e atividade vencida entram no numero. */
          conta: boolean
          lida: boolean
        }[]
      }
      pertence_ao_dominio: { Args: never; Returns: boolean }
      chave_nome: { Args: { texto: string }; Returns: string }
      sem_acento: { Args: { t: string }; Returns: string }
      /**
       * Busca da tela de Atividades. Devolve so os IDS: a projecao
       * completa continua sendo a SELECAO da tela, para nao haver duas
       * descricoes da mesma linha. Mora no banco por causa da C-04.
       */
      atividades_busca: {
        Args: {
          p_termo: string
          p_situacao?: string
          p_responsavel?: string | null
          p_tipo?: string | null
          p_limite?: number
        }
        Returns: { id: string; data: string }[]
      }
      conta_organizacoes_agrupadas: {
        Args: {
          p_termo?: string | null
          p_uf?: string | null
          p_cidade?: string | null
          p_sem_local?: boolean
        }
        Returns: number
      }
      locais_das_organizacoes: {
        Args: Record<string, never>
        Returns: { uf: string | null; cidade: string | null; quantidade: number }[]
      }
      sou_desenvolvedor: { Args: Record<string, never>; Returns: boolean }
      fusao_detalhe_cadastro: { Args: { p_id: string }; Returns: Json }
      fusao_conta_grupos: { Args: { termo?: string | null }; Returns: number }
      fusao_grupos: {
        Args: { termo?: string | null; limite?: number; deslocamento?: number }
        Returns: { chave: string; nome: string; quantidade: number }[]
      }
      fusao_cadastros: {
        Args: { chave_grupo: string }
        Returns: {
          id: string
          nome: string
          cidade: string | null
          uf: string | null
          website: string | null
          bubble_id: string | null
          criado_em: string
          negocios: number
          pessoas: number
          atividades: number
          anotacoes: number
        }[]
      }
      previa_fusao_organizacao: {
        Args: { p_principal: string; p_duplicada: string }
        Returns: Json
      }
      funde_organizacao: {
        Args: { p_principal: string; p_duplicada: string }
        Returns: Json
      }
      kanban_coluna: {
        Args: {
          p_etapa: string
          p_termo?: string | null
          p_responsavel?: string | null
          p_deslocamento?: number
          p_limite?: number
        }
        Returns: {
          id: string
          titulo: string
          valor: number | null
          status: Database["public"]["Enums"]["status_negocio"]
          organizacao_nome: string | null
          usuario_nome: string | null
          usuario_foto: string | null
          total: number
        }[]
      }
      organizacoes_agrupadas: {
        Args: {
          p_termo?: string | null
          p_limite?: number
          p_deslocamento?: number
          p_uf?: string | null
          p_cidade?: string | null
          p_sem_local?: boolean
        }
        Returns: {
          chave: string
          nome: string
          quantidade: number
          representante_id: string
          cidade: string | null
          uf: string | null
          website: string | null
          negocios: number
          titulos: string[] | null
          pessoas: number
          nomes_pessoas: string[] | null
          atividades: number
          atividades_pendentes: number
          amostra_atividades:
            | { rotulo: string; data: string; concluida: boolean }[]
            | null
        }[]
      }
      organizacoes_do_grupo: {
        Args: {
          p_chave_grupo: string
          p_uf?: string | null
          p_cidade?: string | null
          p_sem_local?: boolean
        }
        Returns: {
          id: string
          nome: string
          cidade: string | null
          uf: string | null
          website: string | null
          negocios: number
          titulos: string[] | null
          pessoas: number
          nomes_pessoas: string[] | null
          atividades: number
          atividades_pendentes: number
          amostra_atividades:
            | { rotulo: string; data: string; concluida: boolean }[]
            | null
        }[]
      }

      /* ---------- Indicadores (D-062, D-063) ----------
       * Todas compartilham o mesmo recorte da D-064: período, responsável,
       * origem, produto, área — mais o interruptor de parados (D-067).
       * O cálculo mora no banco porque a regra 3 do CLAUDE.md proíbe
       * trazer 2.458 negócios e 3.415 eventos para somar no navegador. */
      indicadores_resumo: {
        Args: RecorteIndicador
        Returns: {
          iniciados: number
          ganhos: number
          perdidos: number
          valor_ganho: number
          em_andamento: number
          valor_em_aberto: number
          taxa_ganho: number | null
        }[]
      }
      indicadores_serie_mensal: {
        Args: RecorteIndicador
        Returns: { mes: string; iniciados: number; ganhos: number; valor_ganho: number }[]
      }
      indicadores_funil: {
        Args: RecorteIndicador
        Returns: {
          etapa: string
          ordem: number
          alcancaram: number
          avancaram: number
          conversao: number | null
        }[]
      }
      indicadores_lead_time: {
        Args: RecorteIndicador
        Returns: {
          etapa: string
          ordem: number
          passagens: number
          dias_medios: number | null
        }[]
      }
      indicadores_valor_inicial_final: {
        Args: RecorteIndicador
        Returns: {
          negocios: number
          soma_inicial: number
          soma_final: number
          variacao: number | null
        }[]
      }
      indicadores_por_dimensao: {
        Args: RecorteIndicador & { p_dimensao: Dimensao }
        Returns: { rotulo: string; negocios: number; valor: number; ganhos: number }[]
      }

      /* ---------- Financeiro (D-131) ----------
       * ⚠️ Recorte SEM `p_incluir_parados`: em financeiro, cadastro
       * dormente é ruído, não escolha. E o eixo do tempo é `fechado_em`,
       * não `criado_em` — "quando entrou dinheiro", não "quando o lead
       * entrou". */
      financeiro_resumo: {
        Args: RecorteFinanceiro
        Returns: {
          receita: number
          contratos: number
          ticket_medio: number | null
          valor_perdido: number
          contratos_perdidos: number
          pipeline_aberto: number
          negocios_abertos: number
          receita_anterior: number
          contratos_anterior: number
        }[]
      }
      financeiro_mensal: {
        Args: RecorteFinanceiro
        Returns: {
          mes: string
          receita: number
          contratos: number
          perdido: number
          ticket: number | null
        }[]
      }
      financeiro_por_dimensao: {
        Args: RecorteFinanceiro & { p_dimensao: DimensaoFinanceira }
        Returns: {
          rotulo: string
          receita: number
          contratos: number
          ticket: number | null
          perdido: number
        }[]
      }
      financeiro_pipeline: {
        Args: Omit<RecorteFinanceiro, "p_de" | "p_ate">
        Returns: { etapa: string; ordem: number; negocios: number; valor: number }[]
      }
      indicadores_ciclo: {
        Args: RecorteFinanceiro
        Returns: {
          faixa: string
          ordem: number
          negocios: number
          ganhos: number
          taxa_ganho: number | null
          valor_ganho: number
        }[]
      }
      indicadores_ticket: {
        Args: RecorteFinanceiro
        Returns: {
          contratos: number
          media: number | null
          mediana: number | null
          q1: number | null
          q3: number | null
          maior: number | null
        }[]
      }
      financeiro_maiores: {
        Args: RecorteFinanceiro & { p_limite?: number }
        Returns: {
          id: string
          titulo: string
          organizacao: string
          valor: number
          fechado_em: string
          responsavel: string
        }[]
      }
    }
    Enums: {
      status_negocio: "parado" | "negociacao" | "ganho" | "perdido"
      tipo_evento: "etapa" | "valor" | "responsavel" | "status"
      tipo_notificacao:
        | "negocio_parado"
        | "atividade_vencida"
        | "lembrete_atividade"
        | "follow_up_ganho"
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

