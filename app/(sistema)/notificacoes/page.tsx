import { createClient } from "@/lib/supabase/server";
import type { Preferencia } from "@/lib/notificacoes";
import { PainelNotificacoes } from "./painel-notificacoes";

/**
 * F8 — painel de configuração de notificações (D-124, Doc 15 §5.2).
 *
 * ⚠️ A configuração é por USUÁRIO, não por empresa. O papel é único no
 * MVP (D-049), mas cadência de alerta é preferência pessoal: o que
 * incomoda um ajuda o outro. A RLS de `preferencia_notificacao` já
 * limita esta consulta às linhas de quem está logado — não há filtro por
 * usuário no código abaixo porque não pode haver, e nem seria confiável
 * se houvesse.
 *
 * ⚠️ Esta NÃO é a tela de Configurações da D-096, que segue fora do MVP.
 * Aquela administra o sistema; esta ajusta o próprio sino.
 */
export default async function PaginaNotificacoes() {
  const supabase = await createClient();

  // Só quem quis diferente tem linha aqui. A ausência é o padrão do
  // sistema, e o painel a desenha como tal (Doc 15 §3.1).
  const { data } = await supabase
    .from("preferencia_notificacao")
    .select("tipo, ativo, dias");

  return <PainelNotificacoes preferencias={(data ?? []) as Preferencia[]} />;
}
