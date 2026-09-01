/**
 * Recupera os endereços que a carga de migração descartou.
 *
 * ⚠️ O problema: no Pipedrive, **864 organizações têm endereço**. A
 * `carga-migracao.mjs` gravou uma coisa só — `address_locality` — e
 * jogou fora o resto. Duas perdas saíram dali:
 *
 *   1. **281 organizações perderam o endereço inteiro.** O Pipedrive
 *      guarda `address` ("Anápolis, GO, Brasil") e os subcampos
 *      separados, e em 281 registros o `address_locality` veio VAZIO
 *      mesmo com o `address` preenchido. A carga leu só o subcampo e
 *      gravou nulo.
 *   2. **Todo mundo perdeu o estado.** 705 registros traziam
 *      `address_admin_area_level_1`; nenhum chegou ao banco.
 *
 * A migration `20260901120000_uf_da_organizacao.sql` abriu a coluna
 * `uf`. Este script preenche o que existe na origem — é DADO, e por
 * isso não mora na migration: a migration descreve o schema e tem que
 * poder recriar o banco sozinha, sem depender de um arquivo de extração
 * que ninguém garante estar por perto.
 *
 * ⚠️ COMO CASA CADA CADASTRO — e por que isto é o cuidado principal.
 * A carga não guardou o id do Pipedrive em `organizacao`: não existe
 * coluna para ele. O único vínculo possível é o NOME, e 41% da lista é
 * nome repetido (D-121). Por isso a regra é dupla:
 *
 *   - casa-se pela `chave_agrupamento` (nome normalizado), a mesma
 *     chave que o banco já usa para agrupar;
 *   - e o endereço só é aceito quando TODOS os cadastros daquele nome,
 *     na origem, concordam. Havendo dois "Amaral Group" com cidades
 *     diferentes, não há como saber qual é qual, e o grupo inteiro fica
 *     de fora. Melhor sem cidade do que com a cidade do vizinho.
 *
 * ⚠️ O endereço É HERDADO entre cadastros de mesmo nome, e isso foi
 * DECIDIDO, não é efeito colateral. Dos 423 cadastros que recuperam a
 * cidade, 241 não envolvem suposição nenhuma — todos os homônimos da
 * origem traziam o mesmo endereço — e **182 herdam de um irmão**:
 * "Elmo Engenharia" está nove vezes na base e só um dos nove tinha
 * endereço. Gravar "Goiânia" nos nove supõe que são a mesma empresa.
 * São, quase certamente — os 1.195 duplicados vieram de recadastro no
 * Pipedrive (D-121) —, mas é suposição escrita no cadastro, e quem
 * decidiu foi o maestro, com o número na frente. A alternativa medida
 * era parar nos 241.
 *
 * ⚠️ Nada é sobrescrito. Só campo VAZIO é preenchido. O que alguém
 * digitou no sistema vale mais que o que o Pipedrive dizia em agosto.
 *
 * ⚠️ Endereço sujo é recusado: os 45 registros que seguem com U+FFFD
 * (C-07) e as cidades escritas à mão sem estado ("aparecida de goiani")
 * não viram cadastro. O critério é o mesmo do `recupera-acentos.mjs` —
 * só entra o que casa com exatamente uma leitura possível.
 *
 * Uso:
 *   node scripts/recupera-enderecos.mjs            (ensaio: mostra e desfaz)
 *   node scripts/recupera-enderecos.mjs --aplicar  (grava de verdade)
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const ORIGEM = "dados/pipedrive/organizations.json";
const aplicar = process.argv.includes("--aplicar");

/* ---------- as 27 unidades federativas ---------- */

const POR_EXTENSO = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA",
  ceara: "CE", "distrito federal": "DF", "espirito santo": "ES",
  goias: "GO", "state of goias": "GO", maranhao: "MA", "mato grosso": "MT",
  "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE",
  tocantins: "TO",
};
const SIGLAS = new Set(Object.values(POR_EXTENSO));

/**
 * A mesma normalização de `public.chave_nome`: minúsculas, sem acento,
 * tudo que não é letra ou número vira espaço, espaços colapsados.
 *
 * ⚠️ Precisa casar com a do banco. Se divergir, o script simplesmente
 * não acha o cadastro — falha silenciosa e segura, mas falha.
 */
const chave = (s) =>
  String(s ?? "")
    // NFD separa a letra do acento; a classe abaixo apaga só o acento.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || null;

/**
 * Cidade e UF de uma organização do Pipedrive, ou nulos.
 *
 * ⚠️ A ordem importa: o subcampo separado vale mais que o texto
 * corrido, porque o texto corrido é o que o usuário digitou na caixa de
 * autocompletar e às vezes é um endereço solto sem estrutura.
 */
function derivar(o) {
  const limpo = (v) => {
    const t = String(v ?? "").trim();
    // U+FFFD é o acento que a própria API do Pipedrive destruiu (C-07).
    return t && !t.includes("�") ? t : null;
  };

  let cidade = limpo(o.address_locality);
  let uf = POR_EXTENSO[chave(o.address_admin_area_level_1)] ?? null;

  // "Cidade, UF, Brasil" · "Cidade - UF, Brasil" · "Cidade, UF"
  const endereco = limpo(o.address);
  if (endereco) {
    const m = endereco.match(/^([^,\-]+?)\s*[,\-]\s*([A-Za-z]{2})\s*(?:,\s*Brasil\s*)?$/i);
    if (m && SIGLAS.has(m[2].toUpperCase())) {
      cidade ??= m[1].trim();
      uf ??= m[2].toUpperCase();
    }
  }

  // ⚠️ País estrangeiro fica sem UF, e não com uma UF inventada: a base
  // tem um cadastro em Luanda. A restrição do banco recusaria de todo
  // jeito; recusar aqui é o que produz a recusa explicada.
  return { cidade, uf };
}

/* ---------- 1. o que a origem sabe, por nome ---------- */

const origem = JSON.parse(await readFile(ORIGEM, "utf8"));
const porNome = new Map();

for (const o of origem) {
  const k = chave(o.nome ?? o.name);
  if (!k) continue;
  const d = derivar(o);
  if (!d.cidade && !d.uf) continue;

  const atual = porNome.get(k);
  if (!atual) {
    porNome.set(k, { ...d, conflito: false });
    continue;
  }
  // Divergência dentro do mesmo nome: o grupo inteiro sai de cena.
  if (d.cidade && atual.cidade && chave(d.cidade) !== chave(atual.cidade)) atual.conflito = true;
  if (d.uf && atual.uf && d.uf !== atual.uf) atual.conflito = true;
  atual.cidade ??= d.cidade;
  atual.uf ??= d.uf;
}

const conflitados = [...porNome.values()].filter((v) => v.conflito).length;
const utilizaveis = new Map([...porNome].filter(([, v]) => !v.conflito));

console.log(`Origem: ${origem.length} organizações no Pipedrive.`);
console.log(`  nomes com endereço legível: ${porNome.size}`);
console.log(`  descartados por divergirem entre si: ${conflitados}`);
console.log(`  utilizáveis: ${utilizaveis.size}\n`);

/* ---------- 2. o que o banco tem ---------- */

const url = (await readFile(".env.local", "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();
if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();

try {
  const { rows: colunas } = await cli.query(
    "select 1 from information_schema.columns where table_name = 'organizacao' and column_name = 'uf'"
  );
  if (colunas.length === 0) {
    throw new Error(
      "A coluna `organizacao.uf` não existe. Aplique antes a migration " +
        "20260901120000_uf_da_organizacao.sql."
    );
  }

  await cli.query("begin");

  const { rows: orgs } = await cli.query(
    "select id, nome, cidade, uf, chave_agrupamento from organizacao"
  );

  const mudancas = [];
  let semCorrespondencia = 0;
  let divergemDaOrigem = 0;

  for (const o of orgs) {
    const d = utilizaveis.get(o.chave_agrupamento);
    if (!d) {
      if (!o.cidade) semCorrespondencia++;
      continue;
    }
    // Só o que está vazio. Nada sobrescreve.
    const cidade = o.cidade ? null : d.cidade;
    const uf = o.uf ? null : d.uf;

    // Registrado, não corrigido: a cidade que está no banco pode ter
    // sido digitada por alguém depois da carga, e vale mais.
    if (o.cidade && d.cidade && chave(o.cidade) !== chave(d.cidade)) divergemDaOrigem++;

    if (cidade || uf) mudancas.push({ id: o.id, nome: o.nome, cidade, uf });
  }

  const ganhamCidade = mudancas.filter((m) => m.cidade).length;
  const ganhamUf = mudancas.filter((m) => m.uf).length;

  console.log(`Banco: ${orgs.length} organizações.`);
  console.log(`  recuperam a CIDADE perdida: ${ganhamCidade}`);
  console.log(`  ganham a UF: ${ganhamUf}`);
  console.log(`  seguem sem endereço (não há na origem): ${semCorrespondencia}`);
  console.log(`  já tinham cidade diferente da origem, mantidas: ${divergemDaOrigem}\n`);

  console.log("Amostra do que seria gravado:");
  for (const m of mudancas.filter((x) => x.cidade).slice(0, 12)) {
    console.log(`   ${m.nome} → ${m.cidade}${m.uf ? " / " + m.uf : ""}`);
  }

  /*
   * ⚠️ UM `update` para as ~1.400 linhas, e não um por linha. A restrição
   * deste sistema é NÚMERO DE IDAS AO POOLER (~150 ms cada), não custo de
   * consulta — a mesma razão que fez os alertas da F8 saírem de uma
   * função só (D-124). A primeira versão disto fazia uma viagem por
   * cadastro e levava mais de três minutos; assim leva uma.
   *
   * `unnest` de três arrays paralelos monta a tabela derivada do lado do
   * banco, sem precisar montar 1.400 tuplas de texto na URL — que é o
   * teto silencioso que a D-147 registrou por outro caminho.
   */
  if (mudancas.length > 0) {
    await cli.query(
      `update organizacao o
          set cidade = coalesce(o.cidade, n.cidade),
              uf     = coalesce(o.uf, n.uf)
         from (select * from unnest($1::uuid[], $2::text[], $3::text[])
                 as t(id, cidade, uf)) n
        where o.id = n.id`,
      [
        mudancas.map((m) => m.id),
        mudancas.map((m) => m.cidade),
        mudancas.map((m) => m.uf),
      ]
    );
  }

  if (aplicar) {
    await cli.query("commit");
    console.log(`\n✅ Gravado: ${mudancas.length} organizações atualizadas.`);
  } else {
    await cli.query("rollback");
    console.log(
      `\n↩️  Ensaio: ${mudancas.length} organizações seriam atualizadas. Nada foi gravado.` +
        "\n   Rode com --aplicar para valer."
    );
  }
} catch (erro) {
  await cli.query("rollback").catch(() => {});
  console.error("❌", erro.message);
  process.exitCode = 1;
} finally {
  await cli.end();
}
