/**
 * As 27 unidades federativas — fonte única no código.
 *
 * ⚠️ Esta lista espelha a restrição `organizacao_uf_valida`, definida em
 * `supabase/migrations/20260901120000_uf_da_organizacao.sql`. A trava de
 * verdade é a do banco: o formulário usa isto para não OFERECER valor
 * inválido, o que é conveniência, e o banco recusa o que passar por
 * fora, o que é a garantia. Mexeu numa, mexa na outra.
 *
 * A ordem é alfabética pela sigla, e não pelo nome: quem preenche
 * procura "GO", não "Goiás".
 */
export const UFS = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AM", "Amazonas"],
  ["AP", "Amapá"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MG", "Minas Gerais"],
  ["MS", "Mato Grosso do Sul"],
  ["MT", "Mato Grosso"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["PR", "Paraná"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["RS", "Rio Grande do Sul"],
  ["SC", "Santa Catarina"],
  ["SE", "Sergipe"],
  ["SP", "São Paulo"],
  ["TO", "Tocantins"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

const SIGLAS: ReadonlySet<string> = new Set(UFS.map(([sigla]) => sigla));

/**
 * Normaliza o que veio do formulário: caixa alta, sem espaço, e nulo
 * para tudo que não for uma UF de verdade.
 *
 * ⚠️ Devolve `null` em vez de levantar erro para valor inválido. O campo
 * na tela é uma lista fechada, então valor fora dela só chega por
 * chamada montada à mão — e nesse caso gravar nulo é mais honesto do que
 * gravar "XX". O banco, esse sim, recusa.
 */
export function normalizaUf(v: string | null | undefined): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  return SIGLAS.has(s) ? s : null;
}
