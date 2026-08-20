import { NextResponse } from "next/server";
import { createClient as criarAdmin } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Database } from "@/lib/supabase/types";
import type { Notificacao } from "@/lib/notificacoes";

/**
 * D-144 — o enviador. Chamado pelo `pg_cron` do Supabase, de hora em
 * hora, e nunca por um navegador.
 *
 * ⚠️ Esta é a peça que a D-124 tinha recusado, e o motivo da recusa
 * continua verdadeiro: um trabalho agendado que não roda não avisa que
 * não rodou. A mitigação é que o SINO não depende dela. Se isto morrer,
 * o push para e o sistema continua correto — perde-se a interrupção,
 * não a informação.
 *
 * Duas armadilhas do push sobre alerta derivado, resolvidas aqui:
 *
 *   1. AVALANCHE. Um push por alerta seriam 96 vibrações na Daniela no
 *      primeiro disparo. Vai UM aviso agregado por pessoa.
 *
 *   2. REPETIÇÃO ETERNA. Alerta derivado não "acaba": as mesmas 96
 *      vencidas voltariam a cada hora, para sempre. Só entra no aviso o
 *      que ainda não foi empurrado — `notificacao_enviada`, com a mesma
 *      chave estável do sino.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Fora desta janela ninguém é acordado. Horas de Brasília. */
const PRIMEIRA_HORA = 8;
const ULTIMA_HORA = 20;

type LinhaInscricao = Database["public"]["Tables"]["inscricao_push"]["Row"];

export async function POST(requisicao: Request) {
  // ⚠️ Segredo em cabeçalho, não em query string: URL vai para log de
  // servidor, histórico e referer. Sem ele, qualquer um na internet
  // dispararia push para a equipe inteira.
  const segredo = process.env.PUSH_SEGREDO;
  if (!segredo) {
    return NextResponse.json({ erro: "PUSH_SEGREDO ausente no servidor" }, { status: 500 });
  }
  if (requisicao.headers.get("x-lure-segredo") !== segredo) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLICA;
  const privada = process.env.VAPID_PRIVADA;
  const contato = process.env.VAPID_CONTATO ?? "mailto:ti@lureconsultoria.com.br";
  if (!publica || !privada) {
    return NextResponse.json({ erro: "chaves VAPID ausentes" }, { status: 500 });
  }
  webpush.setVapidDetails(contato, publica, privada);

  const forcar = new URL(requisicao.url).searchParams.get("forcar") === "1";

  // Hora de Brasília, não do servidor — a Vercel roda em UTC.
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (!forcar && (hora < PRIMEIRA_HORA || hora >= ULTIMA_HORA)) {
    return NextResponse.json({ pulado: "fora do horário", hora });
  }

  // ⚠️ Service role: o enviador precisa ler os alertas de TODO MUNDO, e
  // `notificacoes()` só responde sobre quem está logado — aqui não há
  // ninguém logado. É a única parte do sistema que ignora a RLS, e por
  // isso ela mora atrás do segredo acima.
  const admin = criarAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: inscricoes, error: erroInscricoes } = await admin
    .from("inscricao_push")
    .select("id, usuario_id, endpoint, p256dh, auth");

  if (erroInscricoes) {
    return NextResponse.json({ erro: erroInscricoes.message }, { status: 500 });
  }
  if (!inscricoes?.length) return NextResponse.json({ enviados: 0, motivo: "ninguém inscrito" });

  // Um usuário, vários aparelhos — o normal, não a exceção.
  const porUsuario = new Map<string, LinhaInscricao[]>();
  for (const i of inscricoes as LinhaInscricao[]) {
    if (!porUsuario.has(i.usuario_id)) porUsuario.set(i.usuario_id, []);
    porUsuario.get(i.usuario_id)!.push(i);
  }

  const resultado = { enviados: 0, semNovidade: 0, aparelhosRemovidos: 0, falhas: 0 };

  for (const [usuarioId, aparelhos] of porUsuario) {
    const { data: alertas } = await admin.rpc("notificacoes_de", { p_usuario: usuarioId });
    const lista = (alertas ?? []) as Notificacao[];

    // D-141: só o que exige ação. E o que já foi lido no sino não vira
    // push — quem já viu não precisa ser avisado.
    const pendentes = lista.filter((n) => n.conta && !n.lida);
    if (pendentes.length === 0) {
      resultado.semNovidade++;
      continue;
    }

    const { data: jaEnviadas } = await admin
      .from("notificacao_enviada")
      .select("chave")
      .eq("usuario_id", usuarioId)
      .in("chave", pendentes.map((n) => n.chave));

    const enviadas = new Set((jaEnviadas ?? []).map((r) => r.chave));
    const novas = pendentes.filter((n) => !enviadas.has(n.chave));

    // ⚠️ Nada NOVO, nada de push. Sem esta linha o aparelho vibraria de
    // hora em hora com a mesma pendência até alguém desistir do recurso.
    if (novas.length === 0) {
      resultado.semNovidade++;
      continue;
    }

    const { titulo, corpo, destino } = redigir(novas, pendentes.length);

    let algumEntregou = false;
    for (const ap of aparelhos) {
      try {
        await webpush.sendNotification(
          { endpoint: ap.endpoint, keys: { p256dh: ap.p256dh, auth: ap.auth } },
          JSON.stringify({ titulo, corpo, destino }),
          { TTL: 6 * 60 * 60 },
        );
        algumEntregou = true;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410 = inscrição morta (app desinstalado, permissão
        // revogada). Guardá-la faria o enviador tentar para sempre.
        if (status === 404 || status === 410) {
          await admin.from("inscricao_push").delete().eq("endpoint", ap.endpoint);
          resultado.aparelhosRemovidos++;
        } else {
          resultado.falhas++;
        }
      }
    }

    // ⚠️ Só marca como enviado se ALGUM aparelho recebeu. Marcar depois
    // de uma falha geral significaria "já avisei" sobre um aviso que
    // ninguém viu — e a chave nunca mais voltaria.
    if (algumEntregou) {
      await admin.from("notificacao_enviada").upsert(
        novas.map((n) => ({ usuario_id: usuarioId, chave: n.chave })),
        { onConflict: "usuario_id,chave" },
      );
      await admin
        .from("inscricao_push")
        .update({ ultimo_envio: new Date().toISOString() })
        .eq("usuario_id", usuarioId);
      resultado.enviados++;
    }
  }

  return NextResponse.json(resultado);
}

/**
 * O texto do aviso.
 *
 * ⚠️ Fala do que é NOVO, mas mostra o total — "1 nova (8 no total)" é
 * mais útil que "1 nova", porque o número que importa para decidir abrir
 * o app é o tamanho da pilha, não o do incremento.
 */
function redigir(novas: Notificacao[], total: number) {
  const parados = novas.filter((n) => n.tipo === "negocio_parado").length;
  const vencidas = novas.filter((n) => n.tipo === "atividade_vencida").length;

  // Uma só: diz qual é. Genérico com uma pendência é preguiça.
  if (novas.length === 1) {
    const n = novas[0];
    return {
      titulo: n.tipo === "negocio_parado" ? "Negócio parado" : "Atividade vencida",
      corpo: `${n.titulo} · ${n.detalhe}`,
      destino: n.destino,
    };
  }

  const partes: string[] = [];
  if (parados) partes.push(`${parados} negócio${parados > 1 ? "s" : ""} parado${parados > 1 ? "s" : ""}`);
  if (vencidas) partes.push(`${vencidas} atividade${vencidas > 1 ? "s" : ""} vencida${vencidas > 1 ? "s" : ""}`);

  return {
    titulo: `${novas.length} pendência${novas.length > 1 ? "s" : ""} nova${novas.length > 1 ? "s" : ""}`,
    corpo:
      partes.join(" e ") + (total > novas.length ? ` · ${total} no total` : ""),
    // Vai para o negócio quando só há negócio parado; senão, para o sino.
    destino: vencidas ? "/atividades?vista=vencidas" : "/notificacoes",
  };
}
