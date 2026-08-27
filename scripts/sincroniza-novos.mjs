/**
 * Traz para a base os registros que NASCERAM no Pipedrive depois da
 * carga de 17/08.
 *
 * ⚠️ ESCOPO DELIBERADAMENTE PARCIAL, por decisao do maestro em 20/08.
 * Este script insere o que e NOVO. Ele NAO atualiza o que mudou nem
 * apaga o que sumiu, e nao tem como fazer isso: o schema nao guarda o
 * id do Pipedrive, entao nao ha como dizer que "aquela linha de la" e
 * "esta linha daqui". Na comparacao de 20/08 isso deixou de fora 144
 * registros alterados e 6 atividades apagadas no Pipedrive, que
 * continuam existindo aqui. A diferenca cresce a cada dia.
 *
 * ⚠️ E IDEMPOTENTE. Antes de inserir, cada registro e procurado na base
 * pela mesma chave natural com que seria reconhecido. Rodar duas vezes
 * nao duplica — o que ja esta la e pulado e aparece no relatorio.
 *
 * ⚠️ Ensaia por padrao. `--aplicar` grava.
 *
 * Uso:  node scripts/sincroniza-novos.mjs [--aplicar]
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANTIGA = join(RAIZ, "dados/pipedrive-snapshot-17-08");
const NOVA = join(RAIZ, "dados/pipedrive");
const APLICAR = process.argv.includes("--aplicar");

/* ---------- helpers, os MESMOS da carga ---------- */
const texto = (v) => {
  const s = v == null ? "" : String(v).trim().replace(/\s+/g, " ");
  return s === "" ? null : s;
};
const instante = (v) => (texto(v) ? `${String(v).replace(" ", "T")}Z` : null);
const soMotivo = (v) => texto(String(v ?? "").split("|")[0]);
const statusDe = (d, nomeEtapa) => {
  if (d.status === "won") return "ganho";
  if (d.status === "lost") return "perdido";
  return nomeEtapa === "Cold Lead" ? "parado" : "negociacao";
};

/**
 * due_date + due_time vem em UTC (Doc 14 §5.7). Atividade das 01:00 UTC
 * e das 22:00 do dia anterior em Brasilia — sem converter, ela aparece
 * no dia errado e ninguem percebe.
 */
function dataHoraLocal(due_date, due_time, duracao) {
  if (!texto(due_date)) return { data: null, inicio: null, fim: null };
  if (!texto(due_time)) return { data: due_date, inicio: null, fim: null };
  const base = new Date(`${due_date}T${due_time}:00Z`);
  const local = new Date(base.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const desloc = local.getTime() - base.getTime();
  const inicioMs = base.getTime() + desloc;
  const dt = new Date(inicioMs);
  const p = (n) => String(n).padStart(2, "0");
  const data = `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  const inicio = `${p(dt.getHours())}:${p(dt.getMinutes())}`;
  let fim = null;
  if (texto(duracao) && duracao !== "00:00") {
    const [h, m] = String(duracao).split(":").map(Number);
    const f = new Date(inicioMs + ((h || 0) * 60 + (m || 0)) * 60000);
    fim = `${p(f.getHours())}:${p(f.getMinutes())}`;
  }
  return { data, inicio, fim };
}

const ler = async (base, arq) => JSON.parse(await readFile(join(base, `${arq}.json`), "utf8"));

const CORES = { ok: "\x1b[32m", aviso: "\x1b[33m", falha: "\x1b[31m", fim: "\x1b[0m" };
const relatorio = [];
const conta = { inserido: 0, pulado: 0, ambiguo: 0, semVinculo: 0 };

/* ---------- conexao ---------- */
const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();
if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();
const q = async (sql, a) => (await cli.query(sql, a)).rows;
const uma = async (sql, a) => (await q(sql, a))[0] ?? null;

console.log("\n=== Sincronizacao dos registros novos ===");
console.log(`Base: ${url.replace(/:[^:@]*@/, ":***@")}`);
console.log(APLICAR ? "MODO: APLICAR — vai gravar\n" : "MODO: ENSAIO — nada sera gravado\n");

await cli.query("begin");

try {
  // A carga da migracao marca os eventos que gerar. Aqui so ha insert, e
  // o gatilho do log e `after update` — nao deveria gerar nada. A marca
  // fica assim mesmo: se um dia este script passar a atualizar, o log
  // nasce marcado em vez de mentir.
  await cli.query("set local app.carga_migracao = true");

  // Carimbo do inicio: separa o que ja estava na base do que ESTA rodada
  // inseriu. Sem ele a contagem de duplicatas se enxergaria.
  const inicioRodada = (await uma("select now() agora")).agora;

  // Quantos eventos REAIS ja existiam. Serve de referencia para o
  // aviso do fim: veja a explicacao la embaixo.
  const eventosReaisAntes = Number(
    (
      await uma(
        `select count(*) n from evento_negocio
          where not origem_carga and not importado_do_pipedrive`,
      )
    ).n,
  );

  /**
   * ⚠️ O instante em que a carga de 17/08 terminou.
   *
   * Tudo ANTES disto veio do snapshot de 17/08 — e, por construcao, os
   * registros que este script traz NAO estao naquele snapshot. Logo, uma
   * linha da carga que pareca igual a uma nova e OUTRO registro do
   * Pipedrive, com outro id, que por acaso tem o mesmo titulo e a mesma
   * data. Deixa-la bloquear a insercao perderia atividade real: foi o
   * que o ensaio pegou, 4 vezes.
   *
   * A janela de "ja inserido" e, portanto, (fim da carga, inicio desta
   * rodada) — o que so pode ter vindo de uma execucao anterior DESTE
   * script.
   */
  const FIM_DA_CARGA = "2026-08-17T20:00:00Z";

  /* ================= o que e novo ================= */
  const novosDe = async (arq) => {
    const antes = new Set((await ler(ANTIGA, arq)).map((x) => x.id));
    return (await ler(NOVA, arq)).filter((x) => !antes.has(x.id));
  };

  const orgsNovas = await novosDe("organizations");
  const pessoasNovas = await novosDe("persons");
  const dealsNovos = await novosDe("deals");
  const ativNovas = await novosDe("activities");
  const notasNovas = await novosDe("notes");

  console.log(
    `Novos no Pipedrive: ${orgsNovas.length} organizacoes · ${pessoasNovas.length} pessoas · ` +
      `${dealsNovos.length} negocios · ${ativNovas.length} atividades · ${notasNovas.length} anotacoes\n`,
  );

  /* ================= mapas de apoio ================= */
  const stages = await ler(NOVA, "stages");
  const etapasBase = await q("select id, nome from etapa");
  const etapaPorPd = new Map();
  const nomeEtapaPorPd = new Map();
  for (const s of stages) {
    const alvo = etapasBase.find((e) => e.nome === s.name);
    if (alvo) {
      etapaPorPd.set(s.id, alvo.id);
      nomeEtapaPorPd.set(s.id, alvo.nome);
    }
  }

  const users = await ler(NOVA, "users");
  const usuarioPorPd = new Map();
  for (const u of users) {
    const r = await uma("select id from usuario where lower(email) = $1", [
      texto(u.email)?.toLowerCase() ?? "",
    ]);
    if (r) usuarioPorPd.set(u.id, r.id);
  }

  const tipos = await ler(NOVA, "activityTypes");
  const tipoPorChave = new Map();
  for (const t of tipos) {
    const r = await uma("select id from tipo_atividade where nome = $1", [texto(t.name)]);
    if (r) tipoPorChave.set(t.key_string, r.id);
  }

  /* ================= resolvedores ================= */
  // Guardam o que este script inseriu, para que um registro novo possa
  // apontar para outro registro novo da mesma rodada.
  const orgPorPd = new Map();
  const pessoaPorPd = new Map();
  const negocioPorPd = new Map();

  /**
   * Organizacao existente: procurada pelo NOME.
   * ⚠️ 41% dos cadastros sao duplicata de nome (D-121), entao isto pode
   * ser ambiguo. Quando for, escolhe a mais antiga e AVISA — com 66
   * registros, a lista cabe numa conferida a olho.
   */
  async function resolveOrg(pdId) {
    if (pdId == null) return null;
    const id = pdId.value ?? pdId;
    if (orgPorPd.has(id)) return orgPorPd.get(id);

    const nova = orgsNovas.find((o) => o.id === id);
    const todas = await ler(NOVA, "organizations");
    const nome = texto((nova ?? todas.find((o) => o.id === id))?.name);
    if (!nome) return null;

    const achadas = await q(
      "select id from organizacao where nome = $1 order by criado_em, id",
      [nome],
    );
    if (achadas.length === 0) return null;
    if (achadas.length > 1) {
      conta.ambiguo++;
      relatorio.push(`  ~ organizacao "${nome}": ${achadas.length} cadastros, usei o mais antigo`);
    }
    orgPorPd.set(id, achadas[0].id);
    return achadas[0].id;
  }

  async function resolvePessoa(pdId) {
    if (pdId == null) return null;
    const id = pdId.value ?? pdId;
    if (pessoaPorPd.has(id)) return pessoaPorPd.get(id);
    const todas = await ler(NOVA, "persons");
    const nome = texto(todas.find((p) => p.id === id)?.name);
    if (!nome) return null;
    const achadas = await q("select id from pessoa where nome = $1 order by criado_em, id", [nome]);
    if (achadas.length === 0) return null;
    if (achadas.length > 1) {
      conta.ambiguo++;
      relatorio.push(`  ~ pessoa "${nome}": ${achadas.length} cadastros, usei o mais antigo`);
    }
    pessoaPorPd.set(id, achadas[0].id);
    return achadas[0].id;
  }

  /** Negocio existente: (titulo, criado_em). Casou 2.452 de 2.458. */
  async function resolveNegocio(pdId) {
    if (pdId == null) return null;
    const id = pdId.value ?? pdId;
    if (negocioPorPd.has(id)) return negocioPorPd.get(id);
    const todos = await ler(NOVA, "deals");
    const d = todos.find((x) => x.id === id);
    if (!d) return null;
    const r = await uma(
      `select id from negocio
        where titulo = $1
          and to_char(criado_em at time zone 'UTC','YYYY-MM-DD HH24:MI:SS') = $2
        limit 1`,
      [texto(d.title), (d.add_time ?? "").slice(0, 19)],
    );
    if (r) negocioPorPd.set(id, r.id);
    return r?.id ?? null;
  }

  /* ================= 1. organizacoes ================= */
  for (const o of orgsNovas) {
    const nome = texto(o.name) ?? "(sem nome)";
    const ja = await uma(
      `select id from organizacao where nome = $1
        and criado_em > $2::timestamptz and criado_em < $3::timestamptz limit 1`,
      [nome, FIM_DA_CARGA, inicioRodada],
    );
    if (ja) {
      orgPorPd.set(o.id, ja.id);
      conta.pulado++;
      relatorio.push(`  = organizacao "${nome}" ja estava aqui`);
      continue;
    }
    const r = await uma(
      "insert into organizacao (nome, cidade, website) values ($1,$2,null) returning id",
      [nome, texto(o.address_locality)],
    );
    orgPorPd.set(o.id, r.id);
    conta.inserido++;
    relatorio.push(`  + organizacao "${nome}"`);
  }

  /* ================= 2. pessoas ================= */
  for (const p of pessoasNovas) {
    const nome = texto(p.name) ?? "(sem nome)";
    if (/�/.test(nome)) {
      relatorio.push(`  ⚠ pessoa "${nome}" chegou com acento destruido na ORIGEM (C-07)`);
    }
    const ja = await uma(
      `select id from pessoa where nome = $1
        and criado_em > $2::timestamptz and criado_em < $3::timestamptz limit 1`,
      [nome, FIM_DA_CARGA, inicioRodada],
    );
    let pid;
    if (ja) {
      pid = ja.id;
      conta.pulado++;
      relatorio.push(`  = pessoa "${nome}" ja estava aqui`);
    } else {
      pid = (await uma("insert into pessoa (nome) values ($1) returning id", [nome])).id;
      conta.inserido++;
      relatorio.push(`  + pessoa "${nome}"`);
    }
    pessoaPorPd.set(p.id, pid);

    const org = await resolveOrg(p.org_id);
    if (org) {
      await cli.query(
        `insert into pessoa_organizacao (pessoa_id, organizacao_id, cargo)
         values ($1,$2,null) on conflict do nothing`,
        [pid, org],
      );
    }
    for (const t of p.phone ?? []) {
      if (texto(t.value)) {
        await cli.query(
          `insert into forma_contato (pessoa_id, tipo, valor)
           select $1,'telefone',$2
            where not exists (select 1 from forma_contato
                               where pessoa_id = $1 and tipo='telefone' and valor = $2)`,
          [pid, texto(t.value)],
        );
      }
    }
    for (const e of p.email ?? []) {
      if (texto(e.value)) {
        await cli.query(
          `insert into forma_contato (pessoa_id, tipo, valor)
           select $1,'email',$2
            where not exists (select 1 from forma_contato
                               where pessoa_id = $1 and tipo='email' and valor = $2)`,
          [pid, texto(e.value)],
        );
      }
    }
  }

  /* ================= 3. negocios ================= */
  const semMotivo = await uma("select id from motivo_perda where nome = 'Nao informado'");
  for (const d of dealsNovos) {
    const titulo = texto(d.title) ?? "(sem titulo)";
    const ja = await resolveNegocio(d.id);
    if (ja) {
      conta.pulado++;
      relatorio.push(`  = negocio "${titulo}" ja estava aqui`);
      continue;
    }
    let org = await resolveOrg(d.org_id);
    if (!org) {
      // D-023: negocio exige organizacao. Sem ela, a carga original criou
      // uma a partir do titulo em vez de descartar o negocio.
      org = (await uma("insert into organizacao (nome) values ($1) returning id", [titulo])).id;
      relatorio.push(`  + organizacao "${titulo}" (negocio sem organizacao, como na carga)`);
      conta.inserido++;
    }
    const nomeEtapa = nomeEtapaPorPd.get(d.stage_id);
    const status = statusDe(d, nomeEtapa);
    let motivo = null;
    if (status === "perdido") {
      const m = soMotivo(d.lost_reason);
      const achado = m ? await uma("select id from motivo_perda where nome = $1", [m]) : null;
      motivo = achado?.id ?? semMotivo?.id ?? null;
    }
    const r = await uma(
      `insert into negocio
         (titulo, organizacao_id, valor, etapa_id, status, responsavel_id, motivo_perda_id, criado_em)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [
        titulo,
        org,
        d.value ?? null,
        etapaPorPd.get(d.stage_id) ?? null,
        status,
        usuarioPorPd.get(d.user_id?.id ?? d.user_id) ?? null,
        motivo,
        instante(d.add_time),
      ],
    );
    negocioPorPd.set(d.id, r.id);
    conta.inserido++;
    relatorio.push(`  + negocio "${titulo}" (${status})`);

    const p = await resolvePessoa(d.person_id);
    if (p) {
      await cli.query(
        "insert into negocio_pessoa (negocio_id, pessoa_id) values ($1,$2) on conflict do nothing",
        [r.id, p],
      );
    }
  }

  /* ================= 4. atividades ================= */
  /**
   * ⚠️ Aqui a deduplicacao e por CONTAGEM, e nao por existencia — e a
   * diferenca nao e sutil. O Pipedrive tem varias "Chamada" no mesmo dia
   * para o mesmo negocio, todas legitimas e indistinguiveis pelos campos
   * que a base guarda. Perguntar "ja existe uma assim?" faria a segunda,
   * a terceira e a quarta serem descartadas como duplicata. O ensaio de
   * 20/08 pegou isso: 8 atividades reais teriam sido perdidas em
   * silencio.
   *
   * Perguntando "quantas assim ja existem?" e inserindo a diferenca, o
   * script continua idempotente e para de mentir sobre repeticao.
   */
  const candidatas = [];
  for (const a of ativNovas) {
    const { data, inicio, fim } = dataHoraLocal(a.due_date, a.due_time, a.duration);
    if (!data) {
      conta.semVinculo++;
      continue; // sem data nao ha atividade
    }
    candidatas.push({
      a,
      data,
      inicio,
      fim,
      titulo: texto(a.subject),
      neg: await resolveNegocio(a.deal_id),
      org: await resolveOrg(a.org_id),
      pes: await resolvePessoa(a.person_id),
    });
  }

  const porChave = new Map();
  for (const c of candidatas) {
    const k = [c.titulo ?? "", c.data, c.inicio ?? "", c.neg ?? "", c.pes ?? ""].join("");
    if (!porChave.has(k)) porChave.set(k, []);
    porChave.get(k).push(c);
  }

  for (const grupo of porChave.values()) {
    const m = grupo[0];
    // `criado_em < inicio_rodada` isola o que ja estava de tudo que esta
    // rodada inseriu — sem isso a contagem se enxergaria e pararia cedo.
    const { n: existentes } = await uma(
      `select count(*)::int n from atividade
        where coalesce(titulo,'') = coalesce($1,'')
          and data = $2
          and hora_inicio is not distinct from $3::time
          and negocio_id is not distinct from $4
          and pessoa_id  is not distinct from $5
          and criado_em > $6::timestamptz
          and criado_em < $7::timestamptz`,
      [m.titulo, m.data, m.inicio, m.neg, m.pes, FIM_DA_CARGA, inicioRodada],
    );

    const faltam = grupo.length - existentes;
    if (faltam <= 0) {
      conta.pulado += grupo.length;
      relatorio.push(
        `  = ${grupo.length}x atividade "${m.titulo ?? "(sem titulo)"}" de ${m.data} ja estava(m) aqui`,
      );
      continue;
    }
    if (existentes > 0) {
      conta.pulado += existentes;
      relatorio.push(
        `  = ${existentes}x atividade "${m.titulo ?? "(sem titulo)"}" de ${m.data} ja estava aqui`,
      );
    }

    for (const c of grupo.slice(existentes)) {
      await cli.query(
        `insert into atividade
           (negocio_id, organizacao_id, pessoa_id, tipo_id, titulo, data,
            hora_inicio, hora_fim, responsavel_id, descricao, concluida)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          c.neg,
          c.org,
          c.pes,
          tipoPorChave.get(c.a.type) ?? null,
          c.titulo,
          c.data,
          c.inicio,
          c.fim,
          usuarioPorPd.get(c.a.user_id) ?? null,
          texto(c.a.note),
          Boolean(c.a.done),
        ],
      );
      conta.inserido++;
      relatorio.push(
        `  + atividade "${c.titulo ?? "(sem titulo)"}" ${c.data}` +
          `${c.inicio ? ` ${c.inicio}` : ""}${c.neg ? " · com negocio" : ""}`,
      );
    }
  }

  /* ================= 5. anotacoes ================= */
  for (const n of notasNovas) {
    const corpo = texto(String(n.content ?? "").replace(/<[^>]+>/g, " "));
    if (!corpo) continue;
    const ja = await uma(
      `select id from anotacao where texto = $1 and criado_em = $2`,
      [corpo, instante(n.add_time)],
    );
    if (ja) {
      conta.pulado++;
      relatorio.push(`  = anotacao "${corpo.slice(0, 40)}…" ja estava aqui`);
      continue;
    }
    await cli.query(
      `insert into anotacao (negocio_id, organizacao_id, pessoa_id, autor_id, texto, criado_em)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        await resolveNegocio(n.deal_id),
        await resolveOrg(n.org_id),
        await resolvePessoa(n.person_id),
        usuarioPorPd.get(n.user_id) ?? null,
        corpo,
        instante(n.add_time),
      ],
    );
    conta.inserido++;
    relatorio.push(`  + anotacao "${corpo.slice(0, 40)}…"`);
  }

  /* ================= relatorio ================= */
  console.log("--- o que foi feito ---");
  for (const l of relatorio) console.log(l);

  const v = await uma(`
    select (select count(*) from negocio)      negocios,
           (select count(*) from organizacao)  organizacoes,
           (select count(*) from pessoa)       pessoas,
           (select count(*) from atividade)    atividades,
           (select count(*) from anotacao)     anotacoes,
           (select count(*) from evento_negocio where not origem_carga
              and not importado_do_pipedrive)  eventos_reais`);

  console.log("\n--- base depois ---");
  for (const [k, val] of Object.entries(v)) console.log(`  ${k.padEnd(14)} ${val}`);

  console.log(
    `\ninseridos ${conta.inserido} · ja existiam ${conta.pulado} · ` +
      `ambiguidades ${conta.ambiguo} · sem data ${conta.semVinculo}`,
  );

  /**
   * ⚠️ Este numero era escrito a mao (9, medido em 20/08) e por isso
   * gritava toda vez que alguem usava o sistema entre uma rodada e
   * outra — em 27/08 ja eram 16, todos de trabalho real. Alarme que
   * sempre toca deixa de ser alarme, entao agora ele MEDE antes de
   * comecar e compara com o depois: o que interessa nao e quantos
   * eventos reais existem, e se ESTA rodada criou algum. Ela nao
   * deveria: aqui so ha insert, e o gatilho do log e `after update`.
   */
  if (Number(v.eventos_reais) !== eventosReaisAntes) {
    console.log(
      `${CORES.aviso}AVISO: esta rodada criou ` +
        `${Number(v.eventos_reais) - eventosReaisAntes} evento(s) real(is) — ` +
        `eram ${eventosReaisAntes}, agora sao ${v.eventos_reais}. So ha insert ` +
        `aqui, entao isto nao deveria acontecer: confira antes de aplicar.${CORES.fim}`,
    );
  } else {
    console.log(
      `eventos reais intactos em ${eventosReaisAntes} — a rodada nao tocou no log.`,
    );
  }

  if (APLICAR) {
    await cli.query("commit");
    console.log(`\n${CORES.ok}Gravado.${CORES.fim}`);
    console.log(
      `${CORES.aviso}⚠️  Continuam de fora: 144 registros ALTERADOS no Pipedrive e\n` +
        `   6 atividades APAGADAS la que seguem existindo aqui. Sem o id de\n` +
        `   procedencia no schema, nao ha como alcanca-los.${CORES.fim}`,
    );
  } else {
    await cli.query("rollback");
    console.log(`\n${CORES.aviso}ENSAIO — desfeito, nada gravado. Use --aplicar.${CORES.fim}`);
  }
} catch (e) {
  await cli.query("rollback");
  console.error(`\n${CORES.falha}FALHOU — nada foi gravado.${CORES.fim}\n`, e.message);
  process.exitCode = 1;
} finally {
  await cli.end();
}
