import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota chamada pelo service worker quando o serviço de push troca o
 * endereço do aparelho por conta própria (`pushsubscriptionchange`).
 *
 * ⚠️ Ela existe porque service worker NÃO consegue chamar server action:
 * ele roda fora da árvore do React, sem o contexto que uma action exige.
 * A alternativa a esta rota seria a inscrição virar lixo em silêncio e a
 * pessoa parar de receber push sem nenhum erro em lugar nenhum.
 *
 * ⚠️ Não há segredo aqui e não precisa haver: quem escreve é resolvido
 * pela sessão (`usuario_atual`) e a RLS de `inscricao_push` só deixa
 * cada um mexer na própria. Sem cookie de sessão, nada acontece.
 */
export async function POST(requisicao: Request) {
  let corpo: { nova?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; antiga?: string | null };
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const nova = corpo.nova;
  if (!nova?.endpoint || !nova.keys?.p256dh || !nova.keys?.auth) {
    return NextResponse.json({ erro: "inscrição incompleta" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: usuarioId } = await supabase.rpc("usuario_atual");
  if (!usuarioId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  // A antiga sai antes de a nova entrar: deixar as duas faria o enviador
  // despachar dois push para o mesmo aparelho.
  if (corpo.antiga) {
    await supabase
      .from("inscricao_push")
      .delete()
      .eq("usuario_id", usuarioId as string)
      .eq("endpoint", corpo.antiga);
  }

  const { error } = await supabase.from("inscricao_push").upsert(
    {
      usuario_id: usuarioId as string,
      endpoint: nova.endpoint,
      p256dh: nova.keys.p256dh,
      auth: nova.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
