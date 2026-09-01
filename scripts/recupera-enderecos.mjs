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

const limpo = (v) => {
  const t = String(v ?? "").trim();
  // U+FFFD é o acento que a própria API do Pipedrive destruiu (C-07).
  return t && !t.includes("�") ? t : null;
};

/**
 * O dicionário de cidades CONHECIDAS, montado da própria extração.
 *
 * ⚠️ É o que separa reconhecer de adivinhar. Para achar a cidade dentro
 * de "R. 86, 445 - St. Sul, Goiânia - GO, 74083-385" a alternativa seria
 * uma expressão que tentasse descrever todas as formas possíveis de
 * escrever um endereço à mão — e ela erraria calada no primeiro formato
 * novo. Aqui só entra nome que o Pipedrive já reconheceu como cidade em
 * ALGUM cadastro; o que não estiver no dicionário fica sem cidade, que é
 * o resultado honesto.
 *
 * `address_admin_area_level_2` entra junto porque no Brasil ele é o
 * município — é ele que traz "Goiânia" quando o `locality` veio vazio.
 */
function montaDicionarioDeCidades(orgs) {
  const dic = new Map(); // chave normalizada -> nome com acento
  for (const o of orgs) {
    for (const campo of ["address_locality", "address_admin_area_level_2"]) {
      const nome = limpo(o[campo]);
      const k = nome && chave(nome);
      // O primeiro a aparecer vence, e a busca depois prefere o nome
      // MAIS LONGO: sem isso "Aparecida de Goiânia" viraria "Goiânia".
      if (k && !dic.has(k)) dic.set(k, nome);
    }
  }
  return dic;
}

/**
 * Procura, dentro de um texto livre, a última cidade conhecida que
 * aparece nele.
 *
 * ⚠️ A ÚLTIMA, e não a primeira: no português de endereço a cidade vem
 * depois da rua e do bairro — "Rua 235 - Setor Leste Universitário,
 * Goiânia - GO". Pegar a primeira acharia "Setor Leste" se ele por acaso
 * fosse nome de município em outro estado.
 *
 * ⚠️ E a MAIS LONGA entre as que terminam no mesmo ponto, porque
 * "Aparecida de Goiânia" contém "Goiânia" — a curta casaria também, e
 * mandaria o cadastro para a cidade errada.
 */
function achaCidade(texto, dicionario) {
  const alvo = " " + chave(texto) + " ";
  let melhor = null;
  for (const [k, nome] of dicionario) {
    const pos = alvo.lastIndexOf(" " + k + " ");
    if (pos < 0) continue;
    const fim = pos + k.length;
    if (
      !melhor ||
      fim > melhor.fim ||
      (fim === melhor.fim && k.length > melhor.tamanho)
    ) {
      melhor = { nome, fim, tamanho: k.length };
    }
  }
  return melhor?.nome ?? null;
}

/** A sigla ou o nome do estado, onde quer que estejam no texto. */
function achaUf(texto) {
  // "- GO," · "-GO" · "/GO" · ", GO" · " GO " — sempre isolada, para não
  // confundir com as duas primeiras letras de uma palavra.
  const sigla = chave(texto).match(/(?:^| )([a-z]{2})(?: |$)/g) ?? [];
  for (let i = sigla.length - 1; i >= 0; i--) {
    const s = sigla[i].trim().toUpperCase();
    if (SIGLAS.has(s)) return s;
  }
  // "Jataí - Goiás Rua 114" e "Bahia, Brasil" só dizem o nome por extenso.
  const norm = " " + chave(texto) + " ";
  for (const [nome, uf] of Object.entries(POR_EXTENSO)) {
    if (norm.includes(" " + nome + " ")) return uf;
  }
  return null;
}

/**
 * Cidade, UF e logradouro de uma organização do Pipedrive.
 *
 * ⚠️ A ordem importa: o subcampo separado vale mais que o texto corrido,
 * porque o subcampo veio do autocompletar do Google e o texto corrido é
 * o que a pessoa digitou.
 *
 * ⚠️ `endereco` só é preenchido quando o texto diz algo ALÉM de cidade e
 * UF. Repetir "Goiânia, GO" ali em 840 cadastros seria encher a ficha de
 * eco — e é por isso que o teste não é "tem texto?", e sim "sobra
 * alguma coisa depois de tirar a cidade, a UF, o país e o CEP?".
 */
function derivar(o, dicionarioCidades) {
  let cidade = limpo(o.address_locality);
  let uf = POR_EXTENSO[chave(o.address_admin_area_level_1)] ?? null;
  let endereco = null;

  const texto = limpo(o.address);
  if (texto) {
    cidade ??= achaCidade(texto, dicionarioCidades);
    uf ??= achaUf(texto);

    // O que sobra do texto depois de tirar o que já está estruturado.
    //
    // ⚠️ A conta é feita na forma NORMALIZADA dos dois lados. Comparar o
    // texto cru contra a cidade acentuada não casa "Goiania" com
    // "Goiânia", e o cadastro ganharia um logradouro que é só o eco da
    // própria cidade — foi o que o primeiro ensaio produziu.
    //
    // ⚠️ O nome do estado POR EXTENSO sai junto com a sigla: "Bahia,
    // Brasil" e "Mato Grosso, Brasil" não são endereço, e sem isto
    // virariam logradouro por sobrar a palavra do estado.
    const estadoPorExtenso =
      Object.entries(POR_EXTENSO).find(([, s]) => s === uf)?.[0] ?? null;

    let resto = chave(texto) ?? "";
    for (const pedaco of [cidade, uf, estadoPorExtenso, "Brasil", "Brazil"]) {
      const k = pedaco && chave(pedaco);
      if (!k) continue;
      resto = resto.replace(new RegExp("\\b" + escapa(k) + "\\b", "g"), " ");
    }
    // CEP não é logradouro. Depois da normalização ele perdeu o hífen,
    // então "74083-385" chega aqui como "74083 385".
    resto = resto.replace(/\b\d{5}\s?\d{3}\b/g, " ").replace(/\s+/g, " ").trim();

    // ⚠️ Sobra que é quase o nome de UMA CIDADE não é endereço — é a
    // cidade escrita errado: "aparecida de goiani" contra "Aparecida de
    // Goiânia". Guardá-la como logradouro poria lixo num campo novo em
    // troca de nada.
    //
    // ⚠️ A comparação é contra o DICIONÁRIO INTEIRO, e não só contra a
    // cidade que este cadastro extraiu: quando o nome vem truncado,
    // `achaCidade` não acha nada e a cidade extraída é nula — foi
    // exatamente aí que o eco escapou no ensaio anterior.
    const ecoDeCidade =
      resto.length >= 6 &&
      [...dicionarioCidades.keys()].some(
        (k) => k.startsWith(resto) || resto.startsWith(k)
      );

    // Duas letras não são endereço — é o que sobra de "GO" mal cortado.
    // Guarda-se o texto ORIGINAL, com acento e pontuação: o resíduo serve
    // para DECIDIR, não para ser gravado.
    if (resto.length > 2 && /[a-z]/i.test(resto) && !ecoDeCidade) endereco = texto;
  }

  // ⚠️ País estrangeiro fica sem UF, e não com uma UF inventada: a base
  // tem um cadastro em Luanda. A restrição do banco recusaria de todo
  // jeito; recusar aqui é o que produz a recusa explicada.
  return { cidade, uf, endereco };
}

/** Escapa o que vai virar expressão regular. */
const escapa = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------- 1. o que a origem sabe, por nome ---------- */

const origem = JSON.parse(await readFile(ORIGEM, "utf8"));
const dicionario = montaDicionarioDeCidades(origem);
const porNome = new Map();

for (const o of origem) {
  const k = chave(o.nome ?? o.name);
  if (!k) continue;
  const d = derivar(o, dicionario);
  if (!d.cidade && !d.uf && !d.endereco) continue;

  const atual = porNome.get(k);
  if (!atual) {
    porNome.set(k, { ...d, conflito: false });
    continue;
  }
  // Divergência dentro do mesmo nome: o grupo inteiro sai de cena.
  if (d.cidade && atual.cidade && chave(d.cidade) !== chave(atual.cidade)) atual.conflito = true;
  if (d.uf && atual.uf && d.uf !== atual.uf) atual.conflito = true;
  // ⚠️ Logradouro DIFERENTE entre homônimos não invalida o grupo: dois
  // cadastros "Amaral Group" podem ser duas unidades da mesma empresa em
  // ruas diferentes, e isso não torna a cidade duvidosa. Mas também não
  // se escolhe um deles — o primeiro vale, os demais não sobrescrevem.
  atual.cidade ??= d.cidade;
  atual.uf ??= d.uf;
  atual.endereco ??= d.endereco;
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
    "select column_name from information_schema.columns " +
      "where table_name = 'organizacao' and column_name in ('uf', 'endereco')"
  );
  if (colunas.length < 2) {
    throw new Error(
      "Faltam colunas em `organizacao`. Aplique antes as migrations " +
        "20260901120000_uf_da_organizacao.sql e " +
        "20260901200000_logradouro_da_organizacao.sql."
    );
  }

  await cli.query("begin");

  const { rows: orgs } = await cli.query(
    "select id, nome, cidade, uf, endereco, chave_agrupamento from organizacao"
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
    const endereco = o.endereco ? null : d.endereco;

    // Registrado, não corrigido: a cidade que está no banco pode ter
    // sido digitada por alguém depois da carga, e vale mais.
    if (o.cidade && d.cidade && chave(o.cidade) !== chave(d.cidade)) divergemDaOrigem++;

    if (cidade || uf || endereco)
      mudancas.push({ id: o.id, nome: o.nome, cidade, uf, endereco });
  }

  const ganhamCidade = mudancas.filter((m) => m.cidade).length;
  const ganhamUf = mudancas.filter((m) => m.uf).length;
  const ganhamEndereco = mudancas.filter((m) => m.endereco).length;

  console.log(`Banco: ${orgs.length} organizações.`);
  console.log(`  recuperam a CIDADE perdida: ${ganhamCidade}`);
  console.log(`  ganham a UF: ${ganhamUf}`);
  console.log(`  ganham LOGRADOURO (texto livre com rua/bairro): ${ganhamEndereco}`);
  console.log(`  seguem sem endereço (não há na origem): ${semCorrespondencia}`);
  console.log(`  já tinham cidade diferente da origem, mantidas: ${divergemDaOrigem}\n`);

  console.log("Amostra de cidade/UF:");
  for (const m of mudancas.filter((x) => x.cidade).slice(0, 8)) {
    console.log(`   ${m.nome} → ${m.cidade}${m.uf ? " / " + m.uf : ""}`);
  }

  // ⚠️ Os logradouros saem TODOS, sem amostra: são poucos e cada um foi
  // escrito à mão de um jeito. Conferir treze linhas com o olho é o que
  // substitui, aqui, o teste que não existe.
  if (ganhamEndereco > 0) {
    console.log("\nLogradouros (todos):");
    for (const m of mudancas.filter((x) => x.endereco)) {
      console.log(`   ${m.nome} → ${m.endereco}`);
      console.log(`      cidade/UF extraídas: ${m.cidade ?? "(já tinha)"} / ${m.uf ?? "(já tinha)"}`);
    }
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
          set cidade   = coalesce(o.cidade, n.cidade),
              uf       = coalesce(o.uf, n.uf),
              endereco = coalesce(o.endereco, n.endereco)
         from (select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[])
                 as t(id, cidade, uf, endereco)) n
        where o.id = n.id`,
      [
        mudancas.map((m) => m.id),
        mudancas.map((m) => m.cidade),
        mudancas.map((m) => m.uf),
        mudancas.map((m) => m.endereco),
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
