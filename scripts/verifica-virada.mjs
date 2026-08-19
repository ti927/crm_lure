/**
 * F10 — Verificacao dos sete criterios de pronto (D-098).
 *
 * ⚠️ SOMENTE LEITURA. Nao escreve nada, nao altera nada. Pode rodar a
 * qualquer momento, inclusive com os socios usando o sistema.
 *
 * Existe para que a pergunta "da para desligar o Pipedrive?" seja
 * respondida por medicao na base real, e nao por leitura de documento.
 * Reexecutar na vespera do desligamento — o resultado de hoje nao
 * garante o de amanha.
 *
 * O criterio 2 (os socios operarem um dia inteiro) nao e verificavel por
 * script: e observacao humana. O relatorio o exibe como tal.
 *
 * Uso:  node scripts/verifica-virada.mjs
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- referencia: o que o Pipedrive tinha ----------
 * Numeros conferidos na extracao de 17/08/2026 (Doc 00 secao 2). Sao a
 * unica fonte contra a qual "as contagens batem" pode ser afirmado. */
const PIPEDRIVE = {
  negocio: 2458,
  organizacao: 2889,
  pessoa: 4589,
  atividade: 6483,
  anotacao: 922,
  produto: 0, // o Pipedrive nao tinha nenhum produto cadastrado
  ganhos_centavos: 2701529304, // R$ 27.015.293,04
};

/* ---------- apresentacao ---------- */

const CORES = { ok: "\x1b[32m", falha: "\x1b[31m", aviso: "\x1b[33m", fim: "\x1b[0m" };
const marca = { ok: "  OK  ", falha: "FALHA ", aviso: "AVISO ", humano: "HUMANO" };

const resultados = [];

function anota(criterio, situacao, titulo, detalhe) {
  resultados.push({ criterio, situacao, titulo, detalhe });
  const cor = CORES[situacao] ?? "";
  const fim = cor ? CORES.fim : "";
  console.log(`${cor}[${marca[situacao]}]${fim} ${titulo}`);
  if (detalhe) console.log(`         ${detalhe.replace(/\n/g, "\n         ")}`);
}

const real = (centavos) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------- conexao ---------- */

const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();

if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();

const uma = async (sql, args) => (await cli.query(sql, args)).rows[0];
const varias = async (sql, args) => (await cli.query(sql, args)).rows;
const conta = async (tabela, onde = "") =>
  Number((await uma(`select count(*)::bigint n from ${tabela} ${onde}`)).n);

console.log("\n=== F10 — Criterios de pronto (D-098) ===");
console.log(`Base: ${url.replace(/:[^:@]*@/, ":***@")}`);
console.log(`Momento: ${new Date().toLocaleString("pt-BR")}\n`);

/* ==================================================================
 * CRITERIO 1 — as contagens batem com o Pipedrive
 * ================================================================== */
console.log("--- 1. Migracao completa e conferida ---");

const contagens = {
  negocio: await conta("negocio"),
  organizacao: await conta("organizacao"),
  pessoa: await conta("pessoa"),
  atividade: await conta("atividade"),
  anotacao: await conta("anotacao"),
  produto: await conta("produto"),
};

const divergentes = Object.entries(PIPEDRIVE)
  .filter(([k]) => k in contagens)
  .filter(([k, esperado]) => contagens[k] !== esperado)
  .map(([k, esperado]) => `${k}: base tem ${contagens[k]}, Pipedrive tinha ${esperado}`);

const linhaContagens = Object.entries(contagens)
  .map(([k, v]) => `${k} ${v.toLocaleString("pt-BR")}`)
  .join(" · ");

if (divergentes.length === 0) {
  anota(1, "ok", "Contagens batem com a extracao do Pipedrive", linhaContagens);
} else {
  // ⚠️ Divergencia para MAIS e esperada depois que os socios comecarem a
  // cadastrar. So e falha se faltar registro.
  const faltando = divergentes.filter((d) => {
    const [chave] = d.split(":");
    return contagens[chave.trim()] < PIPEDRIVE[chave.trim()];
  });
  anota(
    1,
    faltando.length ? "falha" : "aviso",
    faltando.length
      ? "Faltam registros em relacao ao Pipedrive"
      : "Base cresceu alem do Pipedrive (esperado, se ja ha cadastro novo)",
    `${linhaContagens}\n${divergentes.join("\n")}`,
  );
}

const { ganhos } = await uma(
  `select coalesce(sum(round(valor * 100)), 0)::bigint ganhos
     from negocio where status = 'ganho'`,
);
const ganhosBatem = Number(ganhos) === PIPEDRIVE.ganhos_centavos;
anota(
  1,
  ganhosBatem ? "ok" : "aviso",
  ganhosBatem
    ? "Soma dos negocios ganhos bate ao centavo"
    : "Soma dos ganhos difere da extracao",
  `base ${real(Number(ganhos))} · Pipedrive ${real(PIPEDRIVE.ganhos_centavos)}`,
);

// Vinculos: a migracao so esta completa se os relacionamentos vieram junto.
const vinculos = {
  "pessoa ↔ organizacao": await conta("pessoa_organizacao"),
  "formas de contato": await conta("forma_contato"),
  "negocio ↔ pessoa": await conta("negocio_pessoa"),
};
const semVinculo = Object.entries(vinculos).filter(([, v]) => v === 0);
anota(
  1,
  semVinculo.length ? "falha" : "ok",
  semVinculo.length ? "Ha tabela de vinculo vazia" : "Vinculos migrados",
  Object.entries(vinculos)
    .map(([k, v]) => `${k}: ${v.toLocaleString("pt-BR")}`)
    .join(" · "),
);

// Orfaos: negocio sem organizacao e proibido por schema, mas negocio sem
// etapa some do Kanban sem erro nenhum — vale medir.
const semEtapa = await conta("negocio", "where etapa_id is null");
const semResponsavel = await conta("negocio", "where responsavel_id is null");
anota(
  1,
  semEtapa > 0 ? "aviso" : "ok",
  semEtapa > 0
    ? `${semEtapa} negocio(s) sem etapa — nao aparecem no Kanban`
    : "Todo negocio tem etapa",
  `sem responsavel: ${semResponsavel}`,
);

/* ==================================================================
 * CRITERIO 3 — o log de eventos esta gravando
 * (verificado antes do 2 por ser tecnico; o 2 fecha o relatorio)
 * ================================================================== */
console.log("\n--- 3. Log de eventos gravando ---");

const eventos = {
  total: await conta("evento_negocio"),
  carga: await conta("evento_negocio", "where origem_carga"),
  reais: await conta("evento_negocio", "where not origem_carga"),
};

const ultimo = await uma(
  `select ocorrido_em, tipo from evento_negocio
    where not origem_carga order by ocorrido_em desc limit 1`,
);

if (eventos.reais > 0) {
  anota(
    3,
    "ok",
    `Log gravando: ${eventos.reais} evento(s) de operacao real`,
    `ultimo: ${ultimo.tipo} em ${new Date(ultimo.ocorrido_em).toLocaleString("pt-BR")}` +
      `\ntotal ${eventos.total} · de carga ${eventos.carga}`,
  );
} else {
  anota(
    3,
    "falha",
    "O log nao tem nenhum evento de operacao real",
    "E o item que o CLAUDE.md marca como nao recuperavel. Sem isso, funil de\n" +
      "conversao, lead time e valor inicial x fechado nascem cegos.",
  );
}

// A tabela e somente insercao — por permissao, nao por convencao.
const permissoes = await varias(
  `select grantee, privilege_type from information_schema.role_table_grants
    where table_name = 'evento_negocio' and privilege_type in ('UPDATE','DELETE')
      and grantee in ('anon','authenticated','public')`,
);
anota(
  3,
  permissoes.length ? "falha" : "ok",
  permissoes.length
    ? "evento_negocio aceita update/delete — o log e reescrivel"
    : "evento_negocio e somente insercao (update/delete revogados)",
  permissoes.map((p) => `${p.grantee} tem ${p.privilege_type}`).join(" · ") || undefined,
);

// O gatilho e a origem do evento. Se ele sumir, o log para em silencio.
const gatilho = await varias(
  `select tgname, tgenabled from pg_trigger
    where tgrelid = 'public.negocio'::regclass and not tgisinternal`,
);
const registrador = gatilho.find((g) => g.tgname === "trg_evento_negocio");
anota(
  3,
  registrador && registrador.tgenabled === "O"
    ? "ok"
    : registrador
      ? "falha"
      : "falha",
  registrador
    ? registrador.tgenabled === "O"
      ? "Gatilho trg_evento_negocio ativo em negocio"
      : `Gatilho trg_evento_negocio DESABILITADO (tgenabled=${registrador.tgenabled})`
    : "Gatilho trg_evento_negocio ausente — nada esta registrando eventos",
  `gatilhos em negocio: ${gatilho.map((g) => g.tgname).join(", ")}`,
);

// C-05: o gatilho grava autor_id apontando para usuario(id). Se um evento
// real nasceu sem autor, alguem escreveu por fora ou a resolucao falhou.
const semAutor = await conta("evento_negocio", "where not origem_carga and autor_id is null");
anota(
  3,
  semAutor > 0 ? "aviso" : "ok",
  semAutor > 0
    ? `${semAutor} evento(s) real(is) sem autor identificado`
    : "Todo evento real tem autor identificado",
  semAutor > 0 ? "Ver C-05 no Doc 09 §3.11 — a resolucao do autor ja quebrou uma vez." : undefined,
);

/* ==================================================================
 * CRITERIO 4 — a trava de desfecho funciona
 * ================================================================== */
console.log("\n--- 4. Trava de desfecho ---");

const etapaFinal = await uma(
  `select id, nome from etapa where lower(nome) like '%aguardando%contrato%' limit 1`,
);

if (!etapaFinal) {
  anota(4, "falha", "Etapa 'Aguardando Contrato' nao encontrada", "A trava nao tem onde valer.");
} else {
  /*
   * A trava e da aplicacao (server action). O banco guarda a consequencia:
   * nenhum negocio DEVERIA estar la sem desfecho declarado.
   *
   * ⚠️ Menos os que ja chegaram assim. O Pipedrive nao tinha esta trava e
   * deixou negocios em aberto parados na etapa final; a carga os trouxe
   * como estavam. O maestro decidiu em 19/08 deixa-los intactos (D-128).
   *
   * A separacao NAO e uma lista fixa de ids, que envelheceria mal. E uma
   * regra que se mantem sozinha: um negocio que ENTROU nesta etapa pelo
   * sistema tem, obrigatoriamente, um evento de `etapa` no log — nao ha
   * outro caminho, porque a trava barra os tres. Sem esse evento, so
   * pode ter vindo de fora.
   *
   * ⚠️ "Pelo sistema" precisa dos TRES estados de procedencia (D-129).
   * `not origem_carga` sozinho nao serve mais: desde a carga do historico,
   * eventos importados do Pipedrive tambem satisfazem essa condicao — sao
   * reais, so nao aconteceram aqui. Um dos tres negocios legados tem
   * justamente um evento importado apontando para esta etapa, e a regra
   * antiga passou a acusa-lo como violacao. E preciso exigir tambem
   * `not importado_do_pipedrive`.
   *
   * O dia em que um negocio aparecer aqui com evento de etapa nascido
   * NESTE sistema, a trava furou de verdade, e ai e falha.
   */
  const foraDeRegra = await varias(
    `select n.id, n.titulo, n.status,
            exists (select 1 from evento_negocio e
                     where e.negocio_id = n.id and e.tipo = 'etapa'
                       and not e.origem_carga
                       and not e.importado_do_pipedrive) as movido_pelo_sistema
       from negocio n
      where n.etapa_id = $1 and n.status not in ('ganho','perdido')
      order by n.titulo`,
    [etapaFinal.id],
  );

  const legado = foraDeRegra.filter((n) => !n.movido_pelo_sistema);
  const violacoes = foraDeRegra.filter((n) => n.movido_pelo_sistema);

  anota(
    4,
    violacoes.length ? "falha" : "ok",
    violacoes.length
      ? `${violacoes.length} negocio(s) entraram em ${etapaFinal.nome} sem desfecho — A TRAVA FUROU`
      : `Nenhum negocio entrou em ${etapaFinal.nome} sem Ganho ou Perdido`,
    violacoes.length
      ? violacoes.map((n) => `${n.titulo} (${n.status})`).join("\n")
      : `verificado sobre ${foraDeRegra.length + 0} registro(s) na etapa sem desfecho`,
  );

  if (legado.length) {
    anota(
      4,
      "ok",
      `${legado.length} negocio(s) legado(s) na etapa, vindos assim do Pipedrive`,
      legado.map((n) => `${n.titulo} (${n.status})`).join("\n") +
        "\nD-128: mantidos como estao. Nunca passaram pela trava porque\n" +
        "chegaram pela carga, e o sistema novo nao deixaria nascer assim.",
    );
  }
}

// A restricao do banco: perdido exige motivo. E a rede sob a trava da tela.
const restricao = await uma(
  `select conname, pg_get_constraintdef(oid) def from pg_constraint
    where conrelid = 'public.negocio'::regclass and conname = 'perdido_exige_motivo'`,
);
anota(
  4,
  restricao ? "ok" : "falha",
  restricao
    ? "Restricao perdido_exige_motivo presente no banco"
    : "Restricao perdido_exige_motivo AUSENTE — a trava depende so da tela",
  restricao?.def,
);

const perdidoSemMotivo = await conta(
  "negocio",
  "where status = 'perdido' and motivo_perda_id is null",
);
anota(
  4,
  perdidoSemMotivo > 0 ? "falha" : "ok",
  perdidoSemMotivo > 0
    ? `${perdidoSemMotivo} negocio(s) perdido(s) sem motivo`
    : "Todo negocio perdido tem motivo registrado",
);

/* ==================================================================
 * CRITERIO 5 — Lista e Kanban respondem com a base real
 * ================================================================== */
console.log("\n--- 5. Desempenho com a base real ---");

const cronometra = async (rotulo, sql, args) => {
  const t0 = process.hrtime.bigint();
  const linhas = await varias(sql, args);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { rotulo, ms, linhas: linhas.length };
};

// A consulta da Lista: pagina de 50 com os vinculos que as dez colunas usam.
const medicoes = [
  await cronometra(
    "Lista — primeira pagina (50 linhas com vinculos)",
    `select n.id, n.titulo, n.valor, n.status, o.nome, e.nome, u.nome, p.nome
       from negocio n
       join organizacao o on o.id = n.organizacao_id
       left join etapa e on e.id = n.etapa_id
       left join usuario u on u.id = n.responsavel_id
       left join produto p on p.id = n.produto_id
      order by n.atualizado_em desc
      limit 50`,
  ),
  await cronometra(
    "Lista — busca por texto",
    `select n.id from negocio n
       join organizacao o on o.id = n.organizacao_id
      where n.titulo ilike $1 or o.nome ilike $1
      limit 50`,
    ["%consult%"],
  ),
  await cronometra(
    "Kanban — contagem por etapa",
    `select e.nome, count(n.id) from etapa e
       left join negocio n on n.etapa_id = e.id
      group by e.nome`,
  ),
  await cronometra(
    "Kanban — primeira leva de uma etapa (20 cartoes)",
    `select n.id, n.titulo, n.valor, o.nome from negocio n
       join organizacao o on o.id = n.organizacao_id
      where n.etapa_id = (select id from etapa order by ordem limit 1)
      order by n.atualizado_em desc limit 20`,
  ),
  await cronometra(
    "Atividades — pendencias do dia",
    `select a.id from atividade a where not a.concluida and a.data <= current_date limit 200`,
  ),
];

const LIMITE_MS = 1000; // acima disto a tela parece travada para quem usa
const lentas = medicoes.filter((m) => m.ms > LIMITE_MS);
for (const m of medicoes) {
  anota(
    5,
    m.ms > LIMITE_MS ? "aviso" : "ok",
    `${m.rotulo}: ${m.ms.toFixed(0)} ms (${m.linhas} linhas)`,
  );
}
if (lentas.length === 0) {
  anota(5, "ok", `Todas as consultas abaixo de ${LIMITE_MS} ms`, "medido do banco, sem a rede do navegador");
}

// Regra 3 do CLAUDE.md: nunca carregar a base inteira. Se a Lista pedir
// tudo, o sintoma aparece aqui como volume, nao como lentidao.
const totalNegocios = contagens.negocio;
anota(
  5,
  "ok",
  `Base real em uso: ${totalNegocios.toLocaleString("pt-BR")} negocios`,
  "As medicoes acima sao paginadas — nenhuma delas traz a base inteira.",
);

/* ==================================================================
 * CRITERIO 7 — login por Google para as contas do dominio
 * ================================================================== */
console.log("\n--- 7. Acesso e usuarios ---");

const usuarios = await varias(
  `select u.nome, u.email, u.ativo, (u.auth_id is not null) tem_login
     from usuario u order by u.ativo desc, u.nome`,
);
const comLogin = usuarios.filter((u) => u.tem_login);
const ativos = usuarios.filter((u) => u.ativo);

anota(
  7,
  comLogin.length > 0 ? "ok" : "falha",
  comLogin.length > 0
    ? `${comLogin.length} de ${usuarios.length} usuario(s) ja entraram pelo Google`
    : "Nenhum usuario tem auth_id — ninguem entrou pelo sistema ainda",
  usuarios
    .map((u) => `${u.tem_login ? "✓" : "·"} ${u.nome} <${u.email}>${u.ativo ? "" : " [inativo]"}`)
    .join("\n"),
);

// D-109: usuario nao depende de conta de login, e o casamento e por e-mail.
// Um e-mail fora do dominio nao consegue entrar — vale saber quem esta la.
const dominio = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("DOMINIO_EMPRESA="))
  ?.slice("DOMINIO_EMPRESA=".length)
  .trim();

const foraDoDominio = ativos.filter((u) => dominio && !u.email?.endsWith(`@${dominio}`));
anota(
  7,
  foraDoDominio.length ? "aviso" : "ok",
  foraDoDominio.length
    ? `${foraDoDominio.length} usuario(s) ativo(s) fora do dominio ${dominio} — nao conseguem entrar`
    : `Todos os usuarios ativos sao do dominio ${dominio}`,
  foraDoDominio.map((u) => `${u.nome} <${u.email}>`).join("\n") || undefined,
);

// A RLS e o que impede alguem de fora ler a base. Sem politica, a tabela
// ou esta aberta ou esta fechada para todos — as duas sao problema.
const semRls = await varias(
  `select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
);
anota(
  7,
  semRls.length ? "falha" : "ok",
  semRls.length
    ? `${semRls.length} tabela(s) sem RLS habilitada`
    : "Todas as tabelas do schema public tem RLS habilitada",
  semRls.map((t) => t.relname).join(", ") || undefined,
);

/* ==================================================================
 * CRITERIOS 2 e 6 — dependem de gente
 * ================================================================== */
console.log("\n--- 2 e 6. O que script nenhum verifica ---");

anota(
  2,
  "humano",
  "⭐ Os dois socios operam um dia inteiro sem abrir o Pipedrive",
  "E o criterio mais importante da D-098 e o unico nao-tecnico.\n" +
    "Nao ha medicao possivel: ou aconteceu, ou nao aconteceu.",
);
anota(
  6,
  "humano",
  "O celular abre e e utilizavel para consulta",
  "Telas proprias existem (cartoes, gaveta de filtros, Kanban por etapa).\n" +
    "Utilizavel so se comprova no aparelho, em uso real.",
);

/* ---------- fecho ---------- */

await cli.end();

const falhas = resultados.filter((r) => r.situacao === "falha");
const avisos = resultados.filter((r) => r.situacao === "aviso");
const humanos = resultados.filter((r) => r.situacao === "humano");

console.log("\n=== Resumo ===");
console.log(`${resultados.filter((r) => r.situacao === "ok").length} verificacoes passaram`);
console.log(`${avisos.length} aviso(s) · ${falhas.length} falha(s) · ${humanos.length} criterio(s) humano(s)`);

if (falhas.length) {
  console.log(`\n${CORES.falha}Bloqueiam o desligamento do Pipedrive:${CORES.fim}`);
  for (const f of falhas) console.log(`  · [criterio ${f.criterio}] ${f.titulo}`);
}
if (avisos.length) {
  console.log(`\n${CORES.aviso}Merecem olhada, nao bloqueiam:${CORES.fim}`);
  for (const a of avisos) console.log(`  · [criterio ${a.criterio}] ${a.titulo}`);
}

console.log(
  `\n${falhas.length === 0 ? "Nenhuma falha tecnica." : "Ha falha tecnica aberta."} ` +
    "Os criterios 2 e 6 seguem dependendo de uso real — ver Doc 00 §4.2.",
);

process.exit(falhas.length ? 1 : 0);
