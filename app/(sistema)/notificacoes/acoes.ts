"use server";

import { createClient } from "@/lib/supabase/server";
import { degrauValido, type TipoNotificacao } from "@/lib/notificacoes";

/**
 * F8 — escritas da central de notificações (Doc 15 §6, passos 5 e 6).
 *
 * ⚠️ Nada aqui grava notificação: ela não existe como linha. O que se
 * grava é (a) o que o usuário já dispensou e (b) a preferência dele.
 *
 * ⚠️ `usuario_id` nunca vem da tela. Ele é resolvido no servidor por
 * `usuario_atual()`, que casa pelo `auth_id` — desde a D-109 o id da
 * conta de login e o id do usuário são coisas diferentes, e confiar num
 * id enviado pelo cliente seria deixar alguém escrever na caixa alheia.
 * A RLS recusaria de qualquer forma; isto evita o erro antes dele.
 *
 * ⚠️ Nenhuma acao aqui chama revalidatePath, e e de proposito. O sino
 * vive no LAYOUT, entao a unica revalidacao que o alcanca e
 * revalidatePath("/", "layout") — que invalida o cache de rota INTEIRO
 * e faz a pagina aberta refazer a propria consulta. Marcar uma
 * notificacao como lida dispararia uma releitura dos 2.458 negocios da
 * Lista para esconder um item que o estado otimista do sino ja
 * escondeu. Quem precisa de dado novo pede: o painel chama
 * router.refresh(), e o sino se corrige sozinho na proxima navegacao
 * completa — que e exatamente o que a D-124 descreve.
 */

async function eu() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("usuario_atual");
  return { supabase, id: (data as string | null) ?? null };
}

/* ================================================================
 * Passo 5 — marcar como lida
 * ================================================================ */

/**
 * Esconde um alerta do CONTADOR. Ele continua na lista: sumir da lista
 * tiraria do usuário a chance de rever o que dispensou.
 *
 * ⚠️ A chave carrega um marco (Doc 15 §3.3). Marcar como lida silencia
 * *aquele* estado — o negócio que parou naquele dia, o atraso daquela
 * data. Se o negócio se mover e parar de novo, a chave é outra e o
 * alerta volta. Sem o marco, um clique silenciaria para sempre.
 */
export async function marcarLida(chave: string) {
  const { supabase, id } = await eu();
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  const { error } = await supabase
    .from("notificacao_lida")
    .upsert({ usuario_id: id, chave }, { onConflict: "usuario_id,chave" });

  if (error) return { erro: error.message };
  return {};
}

/** Marca várias de uma vez — o "marcar todas" do rodapé do sino. */
export async function marcarLidas(chaves: string[]) {
  if (chaves.length === 0) return {};
  const { supabase, id } = await eu();
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  const { error } = await supabase
    .from("notificacao_lida")
    .upsert(
      chaves.map((chave) => ({ usuario_id: id, chave })),
      { onConflict: "usuario_id,chave" },
    );

  if (error) return { erro: error.message };
  return {};
}

/** Desfaz a leitura — o alerta volta a contar. */
export async function desmarcarLida(chave: string) {
  const { supabase, id } = await eu();
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  const { error } = await supabase
    .from("notificacao_lida")
    .delete()
    .eq("usuario_id", id)
    .eq("chave", chave);

  if (error) return { erro: error.message };
  return {};
}

/* ================================================================
 * Passo 6 — preferência
 * ================================================================ */

/**
 * Grava a preferência de um tipo.
 *
 * ⚠️ Escolher exatamente o padrão do sistema APAGA a linha em vez de
 * gravá-la (Doc 15 §5.2). A tabela precisa continuar significando "quem
 * quis diferente": se o padrão mudar um dia, quem nunca escolheu de
 * verdade tem de ser alcançado pela mudança. Gravar 60 porque 60 já era
 * o padrão congelaria a pessoa num número que ela não escolheu.
 */
export async function salvarPreferencia(
  tipo: TipoNotificacao,
  ativo: boolean,
  dias: number | null,
) {
  if (!degrauValido(tipo, dias)) {
    return { erro: "Esse prazo não é uma das opções." };
  }

  const { supabase, id } = await eu();
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  const { data: padraoBruto } = await supabase.rpc("padrao_notificacao", {
    p_tipo: tipo,
  });
  const padrao = (padraoBruto as number | null) ?? null;

  // Tudo no padrão: a linha não tem o que dizer.
  if (ativo && (dias === null || dias === padrao)) {
    const { error } = await supabase
      .from("preferencia_notificacao")
      .delete()
      .eq("usuario_id", id)
      .eq("tipo", tipo);
    if (error) return { erro: error.message };
    return {};
  }

  const { error } = await supabase.from("preferencia_notificacao").upsert(
    {
      usuario_id: id,
      tipo,
      ativo,
      // Desligado não escolhe prazo: guardar um número para um alerta que
      // não toca seria inventar preferência que ninguém expressou.
      dias: ativo ? dias : null,
    },
    { onConflict: "usuario_id,tipo" },
  );

  if (error) return { erro: error.message };
  return {};
}
