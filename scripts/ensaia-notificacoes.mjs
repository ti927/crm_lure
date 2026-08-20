/**
 * F8 — ensaio da migracao da central de notificacoes, e a medicao do
 * passo 3 do Doc 15 secao 6.
 *
 * ⚠️ NAO GRAVA NADA. Aplica a migracao dentro de uma transacao unica e
 * desfaz no fim, sempre. E o mesmo metodo da carga (`--ensaio`) e da
 * criacao de negocio: ha UMA base, que e a de producao (D-101), entao
 * a alternativa a ensaiar por rollback e testar na frente dos socios.
 *
 * O que verifica:
 *   1. a migracao aplica sem erro na base real
 *   2. o `check` dos degraus recusa valor fora de D-139/D-140
 *   3. a RLS isola um usuario do outro — com `usuario_atual()`, que e
 *      onde a C-05 morde se alguem escrever `auth.uid()`
 *   4. `notificacoes()` devolve os numeros que o Doc 15 secao 4 promete
 *   5. quanto custa a funcao inteira (o teto do plano e ~200 ms)
 *
 * Uso:  node scripts/ensaia-notificacoes.mjs
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRACAO = join(RAIZ, "supabase/migrations/20260820120000_notificacoes.sql");

const CORES = { ok: "\x1b[32m", falha: "\x1b[31m", aviso: "\x1b[33m", fim: "\x1b[0m" };
const marca = { ok: "  OK  ", falha: "FALHA ", aviso: "AVISO " };
let falhas = 0;

function anota(situacao, titulo, detalhe) {
  if (situacao === "falha") falhas++;
  console.log(`${CORES[situacao]}[${marca[situacao]}]${CORES.fim} ${titulo}`);
  if (detalhe) console.log(`         ${String(detalhe).replace(/\n/g, "\n         ")}`);
}

/* ---------- conexao ---------- */
const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();

if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();

const q = async (sql, args) => (await cli.query(sql, args)).rows;
const uma = async (sql, args) => (await q(sql, args))[0];

console.log("\n=== F8 — ensaio da central de notificacoes ===");
console.log(`Base: ${url.replace(/:[^:@]*@/, ":***@")}`);
console.log(`Momento: ${new Date().toLocaleString("pt-BR")}`);
console.log("⚠️  Tudo roda em transacao e e DESFEITO no fim.\n");

await cli.query("begin");

try {
  /* ================================================================
   * 1. A migracao aplica — ou ja esta aplicada
   * ================================================================
   * Antes de 20/08 este passo era o ensaio da migracao. Depois de
   * aplicada, reaplicar levantaria "type already exists" e mataria o
   * resto da verificacao. Entao o script muda de papel sozinho: com a
   * migracao no ar, ele passa a VERIFICAR o que esta de pe. */
  const [{ ja }] = await q(`
    select count(*) = 2 as ja from information_schema.tables
     where table_schema = 'public'
       and table_name in ('preferencia_notificacao', 'notificacao_lida')`);

  if (ja) {
    anota("aviso", "A migracao ja esta aplicada — verificando o que esta no ar", MIGRACAO.replace(RAIZ, "."));
  } else {
    const sql = await readFile(MIGRACAO, "utf8");
    await cli.query(sql);
    anota("ok", "A migracao aplica sem erro na base real", MIGRACAO.replace(RAIZ, "."));
  }

  const tabelas = await q(`
    select table_name from information_schema.tables
     where table_schema = 'public'
       and table_name in ('preferencia_notificacao', 'notificacao_lida')
     order by table_name`);
  anota(
    tabelas.length === 2 ? "ok" : "falha",
    `Tabelas criadas: ${tabelas.map((t) => t.table_name).join(", ") || "(nenhuma)"}`,
  );

  const pol = await q(`
    select tablename, policyname, qual::text from pg_policies
     where schemaname = 'public'
       and tablename in ('preferencia_notificacao', 'notificacao_lida')`);
  const porUid = pol.filter((p) => /auth\.uid\(\)/.test(p.qual));
  anota(
    porUid.length === 0 && pol.length === 2 ? "ok" : "falha",
    "As politicas comparam com usuario_atual(), nunca com auth.uid() (C-05)",
    pol.map((p) => `${p.tablename}: ${p.qual}`).join("\n"),
  );

  /* ================================================================
   * 2. O check dos degraus (D-139, D-140)
   * ================================================================ */
  const alvo = await uma(`
    select id, nome, email, auth_id from usuario
     where auth_id is not null and ativo
     order by nome limit 1`);
  if (!alvo) throw new Error("nenhum usuario com auth_id para o ensaio");

  const outro = await uma(
    `select id, nome, email, auth_id from usuario
      where auth_id is not null and ativo and id <> $1 order by nome limit 1`,
    [alvo.id],
  );

  async function recusa(rotulo, tipo, dias) {
    try {
      await cli.query("savepoint s");
      await cli.query(
        `insert into preferencia_notificacao (usuario_id, tipo, dias) values ($1, $2, $3)`,
        [alvo.id, tipo, dias],
      );
      await cli.query("rollback to savepoint s");
      anota("falha", `${rotulo} deveria ser RECUSADO e passou`);
    } catch {
      await cli.query("rollback to savepoint s");
      anota("ok", `${rotulo} recusado pelo check`);
    }
  }
  async function aceita(rotulo, tipo, dias) {
    try {
      await cli.query("savepoint s");
      await cli.query(
        `insert into preferencia_notificacao (usuario_id, tipo, dias) values ($1, $2, $3)`,
        [alvo.id, tipo, dias],
      );
      await cli.query("rollback to savepoint s");
      anota("ok", `${rotulo} aceito`);
    } catch (e) {
      await cli.query("rollback to savepoint s");
      anota("falha", `${rotulo} deveria ser aceito`, e.message);
    }
  }

  console.log("\n--- Degraus (D-139: 30/45/60/90 · D-140: 1/2/3/7) ---");
  await aceita("negocio_parado = 45", "negocio_parado", 45);
  await recusa("negocio_parado = 3", "negocio_parado", 3);
  await recusa("negocio_parado = 120", "negocio_parado", 120);
  await aceita("negocio_parado = null (usa o padrao)", "negocio_parado", null);
  await aceita("lembrete_atividade = 7", "lembrete_atividade", 7);
  await recusa("lembrete_atividade = 5", "lembrete_atividade", 5);
  await recusa("atividade_vencida = 10 (tipo nao usa dias)", "atividade_vencida", 10);
  await aceita("atividade_vencida = null", "atividade_vencida", null);

  const padroes = await q(
    `select t::text tipo, public.padrao_notificacao(t) dias
       from unnest(enum_range(null::tipo_notificacao)) t`,
  );
  anota(
    "ok",
    "Padrao do sistema mora no banco (padrao_notificacao)",
    padroes.map((p) => `${p.tipo} = ${p.dias ?? "—"}`).join(" · "),
  );

  /* ================================================================
   * 3. RLS: um usuario nao ve o outro
   * ================================================================ */
  console.log("\n--- RLS por usuario (a primeira do sistema) ---");
  await cli.query(
    `insert into preferencia_notificacao (usuario_id, tipo, dias) values ($1, 'negocio_parado', 30)`,
    [alvo.id],
  );
  if (outro) {
    await cli.query(
      `insert into preferencia_notificacao (usuario_id, tipo, dias) values ($1, 'negocio_parado', 90)`,
      [outro.id],
    );
  }

  /**
   * Roda um bloco como `authenticated`, com a sessao de um usuario.
   *
   * ⚠️ O e-mail do JWT tem de ser o REAL. `usuario_atual()` nao e
   * security definer, entao le `usuario` sob RLS, e a politica daquela
   * tabela e `pertence_ao_dominio()` — que confere o dominio do e-mail
   * do token. Com e-mail inventado a consulta volta vazia e
   * `usuario_atual()` devolve null, o que faz TODO alerta sumir sem
   * erro nenhum. Foi exatamente o que aconteceu na primeira rodada
   * deste ensaio, e e o mesmo sintoma que a C-05 produz em producao.
   */
  async function comoUsuario(u, fn) {
    await cli.query("savepoint sessao");
    await cli.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: u.auth_id, email: u.email, role: "authenticated" }),
    ]);
    await cli.query("set local role authenticated");
    try {
      return await fn();
    } finally {
      await cli.query("reset role");
      await cli.query("rollback to savepoint sessao");
    }
  }

  const visto = await comoUsuario(alvo, async () => {
    const eu = await uma(`select public.usuario_atual() id`);
    const linhas = await q(`select usuario_id, tipo::text, dias from preferencia_notificacao`);
    return { eu, linhas };
  });

  anota(
    visto.eu?.id === alvo.id ? "ok" : "falha",
    `usuario_atual() resolve por auth_id — ${alvo.nome}`,
    `esperado ${alvo.id}, veio ${visto.eu?.id ?? "null"}`,
  );
  const soMinhas = visto.linhas.every((l) => l.usuario_id === alvo.id);
  anota(
    soMinhas && visto.linhas.length === 1 ? "ok" : "falha",
    `RLS isola: ${alvo.nome} ve ${visto.linhas.length} linha(s), todas suas`,
    outro ? `(havia tambem uma linha de ${outro.nome} na tabela)` : "",
  );

  /* ================================================================
   * 4. A derivacao, com sessao de gente de verdade
   * ================================================================ */
  console.log("\n--- notificacoes() por usuario (Doc 15 secao 4) ---");
  const usuarios = await q(
    `select id, nome, email, auth_id from usuario where auth_id is not null and ativo order by nome`,
  );

  for (const u of usuarios) {
    const r = await comoUsuario(u, async () => {
      const linhas = await q(`select tipo::text, conta, lida from public.notificacoes()`);
      const amostra = await q(
        `select tipo::text, titulo, detalhe, destino, chave
           from public.notificacoes() limit 2`,
      );
      return { linhas, amostra };
    });
    const por = (t) => r.linhas.filter((l) => l.tipo === t).length;
    const numero = r.linhas.filter((l) => l.conta && !l.lida).length;
    anota(
      "ok",
      `${u.nome} — sino marca ${numero}`,
      `parados ${por("negocio_parado")} · vencidas ${por("atividade_vencida")} · ` +
        `proximas ${por("lembrete_atividade")} (nao contam)`,
    );
    for (const a of r.amostra) {
      console.log(`           · ${a.titulo} — ${a.detalhe}`);
      console.log(`             ${a.destino}   [${a.chave}]`);
    }
  }

  /* ---------- a chave estavel esconde do contador, nao da lista ---------- */
  const teste = usuarios.find((u) => u.nome) ?? alvo;
  const efeito = await comoUsuario(teste, async () => {
    const antes = await q(`select chave, conta, lida from public.notificacoes() where conta`);
    if (antes.length === 0) return null;
    await cli.query(
      `insert into notificacao_lida (usuario_id, chave)
       values (public.usuario_atual(), $1)`,
      [antes[0].chave],
    );
    const depois = await q(`select chave, conta, lida from public.notificacoes() where conta`);
    return {
      chave: antes[0].chave,
      antesContador: antes.filter((l) => !l.lida).length,
      depoisContador: depois.filter((l) => !l.lida).length,
      continuaNaLista: depois.some((l) => l.chave === antes[0].chave),
    };
  });

  console.log("\n--- Marcar como lida ---");
  if (!efeito) {
    anota("aviso", `${teste.nome} nao tem alerta que conte — teste pulado`);
  } else {
    anota(
      efeito.depoisContador === efeito.antesContador - 1 ? "ok" : "falha",
      `Contador cai de ${efeito.antesContador} para ${efeito.depoisContador}`,
    );
    anota(
      efeito.continuaNaLista ? "ok" : "falha",
      "A linha CONTINUA na lista depois de lida (some do contador, nao da lista)",
    );
  }

  /* ================================================================
   * 5. Custo (passo 3 do Doc 15 secao 6)
   * ================================================================ */
  console.log("\n--- Custo da funcao inteira ---");
  const pesado = usuarios[0];
  const plano = await comoUsuario(pesado, async () =>
    q(`explain (analyze, buffers) select * from public.notificacoes()`),
  );
  const texto = plano.map((l) => l["QUERY PLAN"]).join("\n");
  const exec = Number(/Execution Time: ([\d.]+) ms/.exec(texto)?.[1] ?? NaN);
  const plan = Number(/Planning Time: ([\d.]+) ms/.exec(texto)?.[1] ?? NaN);
  anota(
    exec < 200 ? "ok" : "falha",
    `Execucao ${exec} ms (planejamento ${plan} ms) — teto do plano: 200 ms`,
    /Seq Scan on \w+/.test(texto)
      ? `varreduras sequenciais: ${[...texto.matchAll(/Seq Scan on (\w+)/g)].map((m) => m[1]).join(", ")}`
      : "nenhuma varredura sequencial",
  );

  const idas = await comoUsuario(pesado, async () => {
    const t0 = Date.now();
    await q(`select * from public.notificacoes()`);
    return Date.now() - t0;
  });
  anota("aviso", `Uma ida ao banco pelo pooler: ${idas} ms`, "e latencia de rede, nao consulta");

  /* ================================================================
   * 6. Follow-up ao ganhar (D-021) — o unico dos quatro que ESCREVE
   * ================================================================
   * Reproduz em SQL o que `criarFollowUpDoGanho` faz, contra a base
   * real e dentro do rollback: le a preferencia, resolve o prazo, checa
   * duplicata e insere. E o mesmo metodo com que a criacao de negocio
   * foi verificada em 19/08. */
  console.log("\n--- Follow-up ao ganhar (D-021) ---");

  const cobaia = await uma(`
    select n.id, n.titulo, n.responsavel_id
      from negocio n
     where n.status = 'negociacao' and n.responsavel_id is not null
     order by n.criado_em desc limit 1`);

  if (!cobaia) {
    anota("aviso", "Nenhum negocio em negociacao para exercer o Ganho");
  } else {
    const eventosAntes = Number(
      (await uma(`select count(*)::bigint n from evento_negocio where negocio_id = $1`, [cobaia.id])).n,
    );

    // O Ganho de verdade. O gatilho do log dispara aqui.
    await cli.query(
      `update negocio set status = 'ganho', motivo_perda_id = null where id = $1`,
      [cobaia.id],
    );

    const eventos = await q(
      `select tipo::text, valor_anterior, valor_novo, origem_carga
         from evento_negocio where negocio_id = $1
        order by id desc limit 3`,
      [cobaia.id],
    );
    anota(
      eventos.length > eventosAntes || eventos.some((e) => e.valor_novo === "ganho")
        ? "ok"
        : "falha",
      "Declarar Ganho gera evento de status no log, com origem_carga = false",
      eventos.map((e) => `${e.tipo}: ${e.valor_anterior} -> ${e.valor_novo} (carga ${e.origem_carga})`).join("\n"),
    );

    const prazo = Number(
      (await uma(`select public.padrao_notificacao('follow_up_ganho') d`)).d,
    );

    async function tentaFollowUp() {
      const dup = await uma(
        `select id from atividade
          where negocio_id = $1 and not concluida and titulo ilike 'Follow-up:%' limit 1`,
        [cobaia.id],
      );
      if (dup) return { criada: false, motivo: "ja ha follow-up pendente" };
      const r = await uma(
        `insert into atividade (negocio_id, tipo_id, titulo, data, responsavel_id, descricao, concluida)
         values ($1, (select id from tipo_atividade where nome = 'Tarefa'),
                 'Follow-up: ' || $2,
                 ((now() at time zone 'America/Sao_Paulo')::date + $3::int),
                 $4, 'Retorno automatico', false)
         returning id, titulo, data, responsavel_id`,
        [cobaia.id, cobaia.titulo, prazo, cobaia.responsavel_id],
      );
      return { criada: true, r };
    }

    const primeira = await tentaFollowUp();
    anota(
      primeira.criada ? "ok" : "falha",
      `Follow-up criado para daqui a ${prazo} dias`,
      primeira.criada
        ? `"${primeira.r.titulo}" em ${primeira.r.data.toLocaleDateString?.("pt-BR") ?? primeira.r.data}` +
          ` · responsavel herdado do negocio: ${primeira.r.responsavel_id === cobaia.responsavel_id}`
        : primeira.motivo,
    );

    const segunda = await tentaFollowUp();
    anota(
      !segunda.criada ? "ok" : "falha",
      "Ganhar de novo NAO cria um segundo follow-up",
      segunda.motivo ?? "criou duplicata",
    );

    // A atividade nasce no futuro: nao pode aparecer como vencida, e so
    // entra no lembrete quando o degrau alcancar a data.
    const dono = usuarios.find((u) => u.id === cobaia.responsavel_id);
    if (dono) {
      const nova = await comoUsuario(dono, async () =>
        q(`select tipo::text, titulo from public.notificacoes()
            where titulo ilike 'Follow-up:%'`),
      );
      anota(
        nova.every((n) => n.tipo !== "atividade_vencida") ? "ok" : "falha",
        `Follow-up recem-criado nao nasce vencido (${nova.length} aparicao(oes) no sino)`,
      );
    } else {
      anota("aviso", "O responsavel do negocio ainda nao entrou no sistema — sino nao verificavel");
    }
  }
} catch (e) {
  anota("falha", "O ensaio parou com erro", `${e.message}\n${e.detail ?? ""}\n${e.hint ?? ""}`);
} finally {
  await cli.query("rollback");
  console.log("\n⚠️  ROLLBACK executado — a base esta como estava.");
  await cli.end();
}

console.log(
  falhas === 0
    ? `\n${CORES.ok}Ensaio limpo. A migracao pode ser aplicada.${CORES.fim}\n`
    : `\n${CORES.falha}${falhas} falha(s). NAO aplicar.${CORES.fim}\n`,
);
process.exit(falhas === 0 ? 0 : 1);
