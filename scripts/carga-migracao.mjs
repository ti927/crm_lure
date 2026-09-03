/**
 * F2 — Carga da base do Pipedrive no Supabase (Doc 14 secao 6).
 *
 * ⚠️ Roda em UMA transacao. Ou entra tudo, ou nao entra nada — nao existe
 * meia carga em base de producao.
 *
 * ⚠️ `set local app.carga_migracao = true` marca os eventos gerados pelos
 * gatilhos com origem_carga = true. Sem isso o log nasce com milhares de
 * eventos falsos datados de hoje, e lead time vira ficcao. E o item que o
 * CLAUDE.md marca como nao recuperavel.
 *
 * Ordem do Doc 14 secao 6.3.
 *
 * Uso:  node scripts/carga-migracao.mjs [--ensaio]
 *       --ensaio roda tudo e desfaz no fim (rollback), sem gravar.
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { htmlParaTexto } from "./lib/html-para-texto.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DADOS = join(RAIZ, "dados", "pipedrive");
const ENSAIO = process.argv.includes("--ensaio");

const ler = async (n) => JSON.parse(await readFile(join(DADOS, `${n}.json`), "utf8"));

/* ---------- utilidades ---------- */

const texto = (v) => {
  const s = v == null ? "" : String(v).trim().replace(/\s+/g, " ");
  return s === "" ? null : s;
};

/** Pipedrive devolve "2023-10-04 13:53:49" em UTC. */
const instante = (v) => (texto(v) ? `${String(v).replace(" ", "T")}Z` : null);

/**
 * ⚠️ Doc 14 secao 5.7. due_date + due_time vem em UTC. Atividade das 01:00
 * UTC e das 22:00 do dia anterior em Brasilia — se nao converter, ela
 * aparece no dia errado e ninguem percebe.
 *
 * Sem hora nao ha o que converter: a data e do dia inteiro e fica como
 * esta. Sao 6.413 dos 6.483 casos.
 */
function dataHoraLocal(due_date, due_time, duracao) {
  if (!texto(due_date)) return { data: null, inicio: null, fim: null };
  if (!texto(due_time)) return { data: due_date, inicio: null, fim: null };

  const utc = new Date(`${due_date}T${due_time}:00Z`);
  const sp = new Date(utc.getTime() - 3 * 60 * 60 * 1000); // America/Sao_Paulo
  const iso = sp.toISOString();
  const data = iso.slice(0, 10);
  const inicio = iso.slice(11, 16);

  let fim = null;
  if (texto(duracao) && duracao !== "00:00") {
    const [h, m] = duracao.split(":").map(Number);
    const f = new Date(sp.getTime() + ((h || 0) * 60 + (m || 0)) * 60000);
    fim = f.toISOString().slice(11, 16);
  }
  return { data, inicio, fim };
}

/** Motivo de perda: o Pipedrive guarda "motivo | comentario". */
const soMotivo = (v) => texto(String(v ?? "").split("|")[0]);

/**
 * Doc 14 secao 5.1 — conversao de status.
 * won -> ganho | lost -> perdido | open em Cold Lead -> parado |
 * open nas demais -> negociacao (D-067: cadastro nunca tocado nao pode
 * entrar nos indicadores de desempenho).
 */
const statusDe = (deal, nomeEtapa) => {
  if (deal.status === "won") return "ganho";
  if (deal.status === "lost") return "perdido";
  return nomeEtapa === "Cold Lead" ? "parado" : "negociacao";
};

/* ---------- insercao em lote ---------- */

/** Um INSERT com muitas linhas — 17 mil chamadas individuais levariam horas. */
async function insere(cli, tabela, colunas, linhas, opcoes = "", retornaId = true) {
  if (!linhas.length) return [];
  const devolvidos = [];
  const PEDACO = 500;

  for (let i = 0; i < linhas.length; i += PEDACO) {
    const parte = linhas.slice(i, i + PEDACO);
    const valores = [];
    const marcas = parte.map(
      (linha, j) =>
        `(${linha.map((_, k) => `$${j * colunas.length + k + 1}`).join(",")})`
    );
    parte.forEach((linha) => valores.push(...linha));

    // Tabelas de vinculo (pessoa_organizacao, negocio_pessoa) tem chave
    // composta e nenhuma coluna `id` para devolver.
    const { rows } = await cli.query(
      `insert into ${tabela} (${colunas.join(",")}) values ${marcas.join(",")}
       ${opcoes}${retornaId ? " returning id" : ""}`,
      valores
    );
    if (retornaId) devolvidos.push(...rows.map((r) => r.id));
  }
  return devolvidos;
}

/* ---------- execucao ---------- */

const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();

if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();

const conta = {};
const passo = (nome, n) => {
  conta[nome] = n;
  console.log(`  ${nome.padEnd(20)} ${String(n).padStart(6)}`);
};

try {
  await cli.query("begin");
  // ⚠️ A linha mais importante do arquivo.
  await cli.query("set local app.carga_migracao = 'true'");

  console.log(ENSAIO ? "ENSAIO — nada sera gravado\n" : "CARGA EM PRODUCAO\n");

  /* --- 1. usuario --- */
  const users = await ler("users");
  const papel = (await cli.query("select id from papel where nome = 'completo'")).rows[0].id;

  const usuarioPorPd = new Map();
  for (const u of users) {
    const { rows } = await cli.query(
      `insert into usuario (nome, email, papel_id, ativo) values ($1,$2,$3,true)
       on conflict (email) do update set nome = excluded.nome returning id`,
      [texto(u.name), texto(u.email).toLowerCase(), papel]
    );
    usuarioPorPd.set(u.id, rows[0].id);
  }
  passo("usuario", usuarioPorPd.size);

  /* --- 2. listas configuraveis --- */
  const tipos = await ler("activityTypes");
  const tipoPorChave = new Map();
  for (const [i, t] of tipos.entries()) {
    const { rows } = await cli.query(
      `insert into tipo_atividade (nome, ordem) values ($1,$2)
       on conflict (nome) do update set nome = excluded.nome returning id`,
      [texto(t.name), i]
    );
    tipoPorChave.set(t.key_string, rows[0].id);
  }
  passo("tipo_atividade", tipoPorChave.size);

  const deals = await ler("deals");

  const usos = new Map();
  for (const d of deals) {
    const m = soMotivo(d.lost_reason);
    if (m) usos.set(m, (usos.get(m) || 0) + 1);
  }
  const motivoPorNome = new Map();
  const ordenados = [...usos.entries()].sort((a, b) => b[1] - a[1]);
  for (const [i, [nome, vezes]] of ordenados.entries()) {
    const { rows } = await cli.query(
      `insert into motivo_perda (nome, ordem, ativo) values ($1,$2,$3)
       on conflict (nome) do update set nome = excluded.nome returning id`,
      // A cauda de texto livre entra inativa: preserva o historico sem
      // poluir a lista de escolha. Curadoria depois, pelo painel.
      [nome, i, vezes >= 5]
    );
    motivoPorNome.set(nome, rows[0].id);
  }
  const semMotivo = (
    await cli.query(
      `insert into motivo_perda (nome, ordem, ativo) values ('Nao informado', 999, true)
       on conflict (nome) do update set nome = excluded.nome returning id`
    )
  ).rows[0].id;
  passo("motivo_perda", motivoPorNome.size + 1);

  /* --- 3. etapa (ja semeada) --- */
  const stages = await ler("stages");
  const etapas = (await cli.query("select id, nome from etapa")).rows;
  const etapaPorPd = new Map();
  const nomeEtapaPorPd = new Map();
  for (const s of stages) {
    const alvo = etapas.find((e) => e.nome === s.name);
    if (!alvo) throw new Error(`Etapa "${s.name}" nao existe no destino`);
    etapaPorPd.set(s.id, alvo.id);
    nomeEtapaPorPd.set(s.id, alvo.nome);
  }
  passo("etapa (mapeadas)", etapaPorPd.size);

  /* --- 4. organizacao --- */
  const orgs = await ler("organizations");
  const orgPorPd = new Map();
  const linhasOrg = orgs.map((o) => [
    texto(o.name) ?? "(sem nome)",
    texto(o.address_locality),
    null,
  ]);
  const idsOrg = await insere(cli, "organizacao", ["nome", "cidade", "website"], linhasOrg);
  orgs.forEach((o, i) => orgPorPd.set(o.id, idsOrg[i]));

  // Doc 14 secao 5.3: negocio exige organizacao (D-023). Os 9 orfaos
  // ganham uma organizacao criada a partir do titulo — descartar
  // perderia negocio real, inclusive ganhos.
  const orfaos = deals.filter((d) => !d.org_id);
  const orgDoOrfao = new Map();
  for (const d of orfaos) {
    const { rows } = await cli.query(
      "insert into organizacao (nome) values ($1) returning id",
      [texto(d.title) ?? "(sem nome)"]
    );
    orgDoOrfao.set(d.id, rows[0].id);
  }
  passo("organizacao", orgPorPd.size + orgDoOrfao.size);

  /* --- 5. pessoa, vinculo e formas de contato --- */
  const persons = await ler("persons");
  const pessoaPorPd = new Map();
  const idsPessoa = await insere(
    cli,
    "pessoa",
    ["nome"],
    persons.map((p) => [texto(p.name) ?? "(sem nome)"])
  );
  persons.forEach((p, i) => pessoaPorPd.set(p.id, idsPessoa[i]));
  passo("pessoa", pessoaPorPd.size);

  const vinculos = [];
  for (const p of persons) {
    const org = p.org_id && orgPorPd.get(p.org_id.value ?? p.org_id);
    if (org) vinculos.push([pessoaPorPd.get(p.id), org, null]);
  }
  await insere(
    cli,
    "pessoa_organizacao",
    ["pessoa_id", "organizacao_id", "cargo"],
    vinculos,
    "on conflict do nothing",
    false
  );
  passo("pessoa_organizacao", vinculos.length);

  const contatos = [];
  for (const p of persons) {
    const pid = pessoaPorPd.get(p.id);
    for (const t of p.phone ?? []) {
      if (texto(t.value)) contatos.push([pid, "telefone", texto(t.value)]);
    }
    for (const e of p.email ?? []) {
      if (texto(e.value)) contatos.push([pid, "email", texto(e.value)]);
    }
  }
  await insere(cli, "forma_contato", ["pessoa_id", "tipo", "valor"], contatos);
  passo("forma_contato", contatos.length);

  /* --- 6. negocio --- */
  const negocioPorPd = new Map();
  const linhasNeg = [];
  for (const d of deals) {
    const org = d.org_id ? orgPorPd.get(d.org_id.value ?? d.org_id) : orgDoOrfao.get(d.id);
    const nomeEtapa = nomeEtapaPorPd.get(d.stage_id);
    const status = statusDe(d, nomeEtapa);

    let motivo = null;
    if (status === "perdido") {
      motivo = motivoPorNome.get(soMotivo(d.lost_reason)) ?? semMotivo;
    }

    linhasNeg.push([
      texto(d.title) ?? "(sem titulo)",
      org,
      d.value ?? null,
      etapaPorPd.get(d.stage_id) ?? null,
      status,
      // ⚠️ Responsavel = dono nativo, nao o criador (validado 17/08):
      // criador e dono divergem em 847 dos 2.458.
      usuarioPorPd.get(d.user_id?.id ?? d.user_id) ?? null,
      motivo,
      instante(d.add_time),
    ]);
  }
  const idsNeg = await insere(
    cli,
    "negocio",
    ["titulo", "organizacao_id", "valor", "etapa_id", "status", "responsavel_id", "motivo_perda_id", "criado_em"],
    linhasNeg
  );
  deals.forEach((d, i) => negocioPorPd.set(d.id, idsNeg[i]));
  passo("negocio", negocioPorPd.size);

  const negPessoa = [];
  for (const d of deals) {
    const p = d.person_id && pessoaPorPd.get(d.person_id.value ?? d.person_id);
    if (p) negPessoa.push([negocioPorPd.get(d.id), p]);
  }
  await insere(cli, "negocio_pessoa", ["negocio_id", "pessoa_id"], negPessoa, "on conflict do nothing", false);
  passo("negocio_pessoa", negPessoa.length);

  /* --- 7. atividade --- */
  const atividades = await ler("activities");
  const linhasAtiv = [];
  for (const a of atividades) {
    const { data, inicio, fim } = dataHoraLocal(a.due_date, a.due_time, a.duration);
    if (!data) continue; // sem data nao ha atividade

    linhasAtiv.push([
      a.deal_id ? negocioPorPd.get(a.deal_id) ?? null : null,
      a.org_id ? orgPorPd.get(a.org_id) ?? null : null,
      a.person_id ? pessoaPorPd.get(a.person_id) ?? null : null,
      tipoPorChave.get(a.type) ?? null,
      texto(a.subject),
      data,
      inicio,
      fim,
      usuarioPorPd.get(a.user_id) ?? null,
      // Idem: `texto(a.note)` gravava o HTML CRU — 2.125 descricoes
      // com `<div>`, `<ol>` e `<span style=…>` no banco.
      htmlParaTexto(a.note),
      Boolean(a.done),
    ]);
  }
  await insere(
    cli,
    "atividade",
    ["negocio_id", "organizacao_id", "pessoa_id", "tipo_id", "titulo", "data", "hora_inicio", "hora_fim", "responsavel_id", "descricao", "concluida"],
    linhasAtiv
  );
  passo("atividade", linhasAtiv.length);

  /* --- 8. anotacao --- */
  const notas = await ler("notes");
  const linhasNota = [];
  for (const n of notas) {
    // ⚠️ NAO use `texto(...replace(/<[^>]+>/g, " "))`. Era assim ate a
    // carga de 17/08, e custou 319 anotacoes: toda tag virava um espaco,
    // `<br>` inclusive, entao cinco contatos em cinco linhas viravam um
    // blob so — e `&nbsp;` ficava literal no banco. Consertado por
    // `scripts/recupera-texto-html.mjs`.
    const corpo = htmlParaTexto(n.content);
    if (!corpo) continue;
    linhasNota.push([
      n.deal_id ? negocioPorPd.get(n.deal_id) ?? null : null,
      n.org_id ? orgPorPd.get(n.org_id) ?? null : null,
      n.person_id ? pessoaPorPd.get(n.person_id) ?? null : null,
      usuarioPorPd.get(n.user_id) ?? null,
      corpo,
      instante(n.add_time),
    ]);
  }
  await insere(
    cli,
    "anotacao",
    ["negocio_id", "organizacao_id", "pessoa_id", "autor_id", "texto", "criado_em"],
    linhasNota
  );
  passo("anotacao", linhasNota.length);

  /* --- conferencia (Doc 14 secao 8) --- */
  const { rows: v } = await cli.query(`
    select
      (select count(*) from negocio)                                          as negocios,
      (select count(*) from negocio where organizacao_id is null)             as sem_org,
      (select count(*) from negocio where status = 'perdido'
         and motivo_perda_id is null)                                         as perdido_sem_motivo,
      (select coalesce(sum(valor), 0) from negocio where status = 'ganho')    as soma_ganhos,
      (select count(*) from evento_negocio)                                   as eventos,
      (select count(*) from evento_negocio where origem_carga = false)        as eventos_reais
  `);

  console.log("\n--- conferencia ---");
  for (const [k, val] of Object.entries(v[0])) console.log(`  ${k.padEnd(22)} ${val}`);

  if (Number(v[0].eventos_reais) > 0) {
    throw new Error(
      `${v[0].eventos_reais} eventos sem origem_carga. O set local nao pegou — desfazendo.`
    );
  }

  if (ENSAIO) {
    await cli.query("rollback");
    console.log("\nENSAIO concluido — desfeito, nada gravado.");
  } else {
    await cli.query("commit");
    console.log("\nCarga gravada.");
  }
} catch (erro) {
  await cli.query("rollback");
  console.error("\nFALHOU — nada foi gravado.\n", erro.message);
  process.exitCode = 1;
} finally {
  await cli.end();
}
