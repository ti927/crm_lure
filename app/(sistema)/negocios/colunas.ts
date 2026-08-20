/**
 * As dez colunas fixas da Lista (D-054, D-056, B-040).
 *
 * A escolha nao foi arbitrada aqui: sao exatamente os dez campos que o
 * Doc 14 secao 4.3 mapeia do Pipedrive para o modelo — o inventario do
 * que a equipe usa hoje. Confere com o Doc 02 §6.2 ("sai a data de
 * fechamento esperada, entram etapa e origem"): a data prevista esta na
 * linha "Sem destino" do Doc 14, por D-024.
 *
 * `ordenacao` e a expressao que o PostgREST entende. Para coluna de
 * tabela vinculada usa-se `tabela(coluna)`, que ordena o nivel de cima
 * pela relacao — e nao as linhas de dentro do vinculo.
 */
export type Coluna = {
  chave: string;
  rotulo: string;
  ordenacao: string;
  /** Numero alinha a direita; o resto, a esquerda (Doc 08 §5). */
  numerica?: boolean;
  /** Colunas que somem primeiro quando a tela estreita. */
  esconde?: "md" | "lg" | "xl";
  /** Tipo de controle no cabecalho (B-042). Sem isto, a coluna nao filtra. */
  filtro?: "texto" | "numero" | "data" | "selecao";
};

export const COLUNAS: Coluna[] = [
  { chave: "titulo", rotulo: "Título", ordenacao: "titulo", filtro: "texto" },
  { chave: "organizacao", rotulo: "Organização", ordenacao: "organizacao(nome)", filtro: "texto" },
  { chave: "valor", rotulo: "Valor", ordenacao: "valor", numerica: true, filtro: "numero" },
  { chave: "etapa", rotulo: "Etapa", ordenacao: "etapa(ordem)", filtro: "selecao" },
  { chave: "status", rotulo: "Status", ordenacao: "status", filtro: "selecao" },
  { chave: "origem", rotulo: "Origem", ordenacao: "origem(nome)", esconde: "lg", filtro: "selecao" },
  { chave: "produto", rotulo: "Produto", ordenacao: "produto(nome)", esconde: "lg", filtro: "selecao" },
  { chave: "responsavel", rotulo: "Responsável", ordenacao: "usuario(nome)", esconde: "md", filtro: "selecao" },
  // ⚠️ Estava em `esconde: "xl"` — so aparecia acima de 1280px, e por
  // isso passava por inexistente. Perder negocio E o dado mais caro do
  // funil: 1.121 dos 2.460 estao perdidos, e o motivo e a unica coisa
  // que explica por que. Sobe para `lg`, junto de origem e produto.
  { chave: "motivo_perda", rotulo: "Motivo de perda", ordenacao: "motivo_perda(nome)", esconde: "lg", filtro: "selecao" },
  { chave: "criado_em", rotulo: "Criado em", ordenacao: "criado_em", esconde: "md", filtro: "data" },
];

/** R-006: a base inteira nunca vai para o navegador. */
export const POR_PAGINA = 50;

/**
 * Teto de organizacoes casadas na busca por nome.
 *
 * Os ids viajam na URL da consulta seguinte, e URL tem limite pratico de
 * tamanho. Sao 422 organizacoes na base real, entao 200 ja cobre buscas
 * razoaveis; um termo que case com mais que isso e busca vazia demais
 * para ser util. Se a base crescer muito, a saida e a visao achatada.
 */
export const LIMITE_ORGANIZACOES = 200;

/* Classes escritas por extenso — o Tailwind nao gera nome de classe
   montado em tempo de execucao. */
export const ESCONDE_CLASSE: Record<NonNullable<Coluna["esconde"]>, string> = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};
