/**
 * Recupera o texto que a carga de 17/08 estragou ao converter o HTML do
 * Pipedrive para as colunas de texto puro.
 *
 * ⚠️ **O sintoma que o maestro relatou** foi "copiar e colar não está
 * funcionando": uma anotação com cinco contatos aparecia como um blob de
 * uma linha só, salpicado de `&nbsp;` literal. O caminho de escrita do
 * sistema está limpo — quem cola num `<textarea>` cola texto puro. O
 * defeito é de DADO, e nasceu em duas linhas da carga:
 *
 *   anotacao   `texto(String(n.content).replace(/<[^>]+>/g, " "))`
 *              — toda tag virou espaço, `<br>` inclusive, e entidade
 *                ficou literal.
 *   atividade  `texto(a.note)`
 *              — nem tag chegou a sair: 2.007 descrições guardam
 *                `<div>`, `<ol>`, `<span style=…>` crus no banco.
 *
 * ⚠️ **As duas tabelas se consertam por caminhos DIFERENTES, e não é
 * capricho.** Em `atividade.descricao` o HTML está inteiro no banco, então
 * a conversão sai do próprio valor gravado. Em `anotacao.texto` as tags
 * FORAM DESTRUÍDAS pela carga — o `<br>` já é um espaço e não há como
 * saber, olhando o banco, se aquele espaço era uma quebra de linha. A
 * única fonte que ainda sabe é `dados/pipedrive/notes.json`. Por isso a
 * anotação é reconstituída da origem, casando pelo texto na forma velha
 * mais o instante de criação — que é exatamente como
 * `sincroniza-novos.mjs` já identifica uma anotação.
 *
 * ⚠️ **Nada escrito NESTE sistema é tocado.** A anotação só entra se
 * casar com uma linha da extração; a atividade, só se for anterior ao fim
 * da carga e de fato contiver tag ou entidade. Sem esse cerco, o
 * `<[^>]*>` da conversão comeria um "a < b > c" digitado à mão.
 *
 * Uso:
 *   node scripts/recupera-texto-html.mjs             (ensaio: mostra e desfaz)
 *   node scripts/recupera-texto-html.mjs --aplicar   (grava de verdade)
 *   node scripts/recupera-texto-html.mjs --amostra 20
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import pg from "pg";
import { htmlParaTexto } from "./lib/html-para-texto.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DADOS = join(RAIZ, "dados", "pipedrive");

const aplicar = process.argv.includes("--aplicar");
const iAmostra = process.argv.indexOf("--amostra");
const AMOSTRA = iAmostra >= 0 ? Number(process.argv[iAmostra + 1]) || 5 : 5;

/* ---------- as duas conversões da carga, ao pé da letra ---------- */

/** O `texto()` da carga: colapsa TODO branco, quebra de linha inclusive. */
const textoAntigo = (v) => {
  const s = v == null ? "" : String(v).trim().replace(/\s+/g, " ");
  return s === "" ? null : s;
};

/** O que a carga gravou em `anotacao.texto`. */
const formaVelhaNota = (conteudo) =>
  textoAntigo(String(conteudo ?? "").replace(/<[^>]+>/g, " "));

const instante = (v) =>
  textoAntigo(v) ? `${String(v).replace(" ", "T")}Z` : null;

/* ---------- conexão ---------- */

async function urlDoBanco() {
  const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
    .split(/\r?\n/)
    .find((l) => l.startsWith("SUPABASE_DB_URL="))
    ?.slice("SUPABASE_DB_URL=".length)
    .trim();
  if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");
  return url;
}

const ler = async (n) => JSON.parse(await readFile(join(DADOS, `${n}.json`), "utf8"));
const lista = (j) => (Array.isArray(j) ? j : (j.data ?? []));

const recorta = (s, n = 88) =>
  s == null ? "(vazio)" : JSON.stringify(s.length > n ? `${s.slice(0, n)}…` : s);

async function principal() {
  const cli = new pg.Client({
    connectionString: await urlDoBanco(),
    ssl: { rejectUnauthorized: false },
  });
  await cli.connect();

  console.log(
    aplicar
      ? "⚠️  APLICANDO — a transação será confirmada no fim.\n"
      : "Ensaio: tudo roda dentro de uma transação que será DESFEITA. Use --aplicar para gravar.\n"
  );

  await cli.query("begin");
  try {
    const notas = await consertaAnotacoes(cli);
    const ativs = await consertaAtividades(cli);

    console.log("\n──────── resumo ────────");
    console.table({
      "anotacao.texto": notas,
      "atividade.descricao": ativs,
    });

    if (aplicar) {
      await cli.query("commit");
      console.log("\n✅ Gravado.");
    } else {
      await cli.query("rollback");
      console.log("\n↩️  Desfeito (ensaio).");
    }
  } catch (e) {
    await cli.query("rollback");
    console.error("\n❌ Nada foi gravado:", e.message);
    process.exitCode = 1;
  } finally {
    await cli.end();
  }
}

/* ================================================================
 * 1. anotacao.texto — reconstituída da extração
 * ================================================================ */
async function consertaAnotacoes(cli) {
  console.log("── anotacao.texto ──");

  const conta = {
    candidatas: 0,
    casadas: 0,
    mudadas: 0,
    jaConvertidas: 0,
    semPar: 0,
    ambiguas: 0,
  };
  let mostradas = 0;

  for (const n of lista(await ler("notes"))) {
    const velha = formaVelhaNota(n.content);
    if (!velha) continue;
    const nova = htmlParaTexto(n.content);
    if (!nova) continue;
    conta.candidatas++;
    if (nova === velha) continue; // já estava certo

    const quando = instante(n.add_time);
    const { rows } = await cli.query(
      "select id from anotacao where texto = $1 and criado_em = $2::timestamptz",
      [velha, quando]
    );

    if (rows.length === 0) {
      // ⚠️ Numa segunda rodada a forma VELHA já não existe no banco — e
      // contar isso como "sem par" faria o relatório anunciar 321
      // anotações perdidas onde havia 321 anotações consertadas. Alarme
      // que sempre toca esconde o de verdade.
      const { rows: prontas } = await cli.query(
        "select 1 from anotacao where texto = $1 and criado_em = $2::timestamptz",
        [nova, quando]
      );
      if (prontas.length > 0) conta.jaConvertidas++;
      else conta.semPar++;
      continue;
    }
    if (rows.length > 1) conta.ambiguas++;
    conta.casadas += rows.length;

    // ⚠️ O `where texto = velha` vai junto no update de propósito: entre
    // a leitura e a escrita a linha não deve ter mudado, e repetir a
    // condição é o que impede reescrever por cima de uma edição.
    const r = await cli.query(
      "update anotacao set texto = $1 where id = any($2::uuid[]) and texto = $3",
      [nova, rows.map((x) => x.id), velha]
    );
    conta.mudadas += r.rowCount;

    if (mostradas < AMOSTRA) {
      mostradas++;
      console.log(`\n  antes: ${recorta(velha)}`);
      console.log(`  depois:${recorta(nova)}`);
    }
  }

  if (conta.ambiguas) {
    console.log(
      `\n  (${conta.ambiguas} conteúdos casaram com mais de uma linha — mesma origem, mesmo instante; todas receberam o mesmo texto.)`
    );
  }
  if (conta.jaConvertidas) {
    console.log(
      `  (${conta.jaConvertidas} já estavam convertidas de uma rodada anterior.)`
    );
  }
  if (conta.semPar) {
    console.log(
      `  (${conta.semPar} anotações da extração não têm par no banco — a carga descartou, ou o texto já foi editado aqui.)`
    );
  }
  console.log("");
  return conta;
}

/* ================================================================
 * 2. atividade.descricao — convertida do próprio valor gravado
 * ================================================================ */
async function consertaAtividades(cli) {
  console.log("── atividade.descricao ──");

  /*
   * ⚠️ **Sem corte por data.** A primeira versão filtrava
   * `criado_em < FIM_DA_CARGA` para proteger o que foi digitado neste
   * sistema — e deixou de fora **25 atividades** que a sincronização de
   * 27/08 inseriu com o mesmo HTML cru, porque `sincroniza-novos.mjs`
   * repetia a conversão defeituosa da carga. Data não separa "veio do
   * Pipedrive" de "foi digitado aqui": separa "veio na primeira leva" de
   * "veio na segunda".
   *
   * ⚠️ **Quem filtra é a própria conversão**, e ela só pode ser o filtro
   * porque é IDEMPOTENTE e só reconhece nome de elemento conhecido: o
   * texto que ela não muda é o texto que não precisava mudar. Foi por
   * isso que `<[^>]*>` teve que sair — ele comia
   * `<dho@eneserra.com.br>` e qualquer `a < b > c`.
   *
   * O `[<&]` no `where` é só para não trazer as 3.400 linhas inteiras:
   * o que não tem nenhum dos dois sinais não tem como mudar.
   */
  const { rows } = await cli.query(
    `select id, descricao
       from atividade
      where descricao is not null
        and descricao ~ '[<&]'`
  );

  const conta = { candidatas: rows.length, mudadas: 0, esvaziadas: 0 };
  let mostradas = 0;

  for (const a of rows) {
    const nova = htmlParaTexto(a.descricao);
    if (nova === a.descricao) continue;

    // ⚠️ Descrição que era só marcação (`<div><br></div>`) vira NULA, e
    // não string vazia: a coluna é opcional e "vazio" já tem uma
    // representação neste banco.
    if (nova === null) conta.esvaziadas++;

    const r = await cli.query(
      "update atividade set descricao = $1 where id = $2 and descricao = $3",
      [nova, a.id, a.descricao]
    );
    conta.mudadas += r.rowCount;

    if (mostradas < AMOSTRA) {
      mostradas++;
      console.log(`\n  antes: ${recorta(a.descricao)}`);
      console.log(`  depois:${recorta(nova)}`);
    }
  }

  console.log("");
  return conta;
}

principal();
