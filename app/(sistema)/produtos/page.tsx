import { createClient } from "@/lib/supabase/server";
import { ListaProdutos, type LinhaProduto } from "./lista-produtos";

/**
 * F7 (parte 2) — Produtos e serviços (B-096).
 *
 * ⚠️ A base nasce vazia: o Pipedrive não tinha nenhum produto cadastrado,
 * e o cadastro passa a ser feito aqui. São dezenas de serviços de
 * consultoria, não milhares — a lista vem inteira e a busca é no cliente.
 * A relação com negócio é N:1, um produto por negócio (D-032).
 */
type LinhaCrua = {
  id: string;
  nome: string;
  area_id: string | null;
  area_produto: { nome: string } | null;
  negocio: { count: number }[];
};

export default async function PaginaProdutos() {
  const supabase = await createClient();

  const [{ data: produtos }, { data: areas }] = await Promise.all([
    supabase
      .from("produto")
      .select("id, nome, area_id, area_produto(nome), negocio(count)")
      .order("nome")
      .returns<LinhaCrua[]>(),
    supabase.from("area_produto").select("id, nome").eq("ativo", true).order("ordem"),
  ]);

  const lista: LinhaProduto[] = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    area_id: p.area_id,
    area_produto: p.area_produto,
    negocios: p.negocio?.[0]?.count ?? 0,
  }));

  return <ListaProdutos produtos={lista} areas={areas ?? []} />;
}
