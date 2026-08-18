/**
 * Recupera acentos perdidos na extração do Pipedrive.
 *
 * ⚠️ O problema: 388 registros (386 pessoas, 2 organizações) chegaram ao
 * banco com U+FFFD — o caractere de substituição — no lugar de letras
 * acentuadas. "Marco Aurélio" virou "Marco Aur�lio"; "Quick Aviação"
 * virou "Quick Avia��o".
 *
 * A corrupção NÃO foi da carga: os arquivos brutos da extração já trazem
 * o defeito, e só nos campos `name`/`first_name` de `persons.json`. A
 * própria API do Pipedrive devolveu assim. Prova disso é que o mesmo
 * nome aparece íntegro noutro ponto da extração — em `deals.json`, em
 * `organizations.json`, ou no `org_id.name` de outra pessoa.
 *
 * A recuperação se apoia nisso: para cada nome corrompido monta-se um
 * padrão trocando cada U+FFFD por um curinga de uma letra, e procura-se
 * entre TODAS as strings íntegras da extração. Só vale o que casa com
 * **exatamente um** candidato — havendo dois, o nome fica como está, que
 * é melhor do que gravar um palpite no cadastro de um cliente real.
 *
 * Uso:
 *   node scripts/recupera-acentos.mjs           (ensaio: mostra e desfaz)
 *   node scripts/recupera-acentos.mjs --aplicar (grava de verdade)
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const DIR = "dados/pipedrive";
const SUBSTITUTO = "�";
const aplicar = process.argv.includes("--aplicar");

/* ---------- 1. junta todas as strings íntegras da extração ---------- */

function coletaTextos() {
  const textos = new Set();
  for (const arquivo of fs.readdirSync(DIR)) {
    const cru = fs.readFileSync(path.join(DIR, arquivo), "utf8");
    const linhas = arquivo.endsWith(".jsonl")
      ? cru.split("\n").filter(Boolean)
      : [cru];
    for (const linha of linhas) {
      let json;
      try {
        json = JSON.parse(linha);
      } catch {
        continue;
      }
      (function anda(v) {
        if (typeof v === "string") {
          if (v.length > 1 && !v.includes(SUBSTITUTO)) textos.add(v);
        } else if (Array.isArray(v)) v.forEach(anda);
        else if (v && typeof v === "object") Object.values(v).forEach(anda);
      })(json);
    }
  }
  return [...textos];
}

/* ---------- 2. procura o original de cada nome corrompido ---------- */

const escapaRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function candidatosDe(quebrado, textos) {
  // Cada U+FFFD vira um curinga de exatamente um caractere. O resto do
  // nome tem que bater letra por letra.
  const padrao = new RegExp(
    "^" + quebrado.split(SUBSTITUTO).map(escapaRegex).join(".") + "$"
  );
  return textos.filter((t) => padrao.test(t));
}

/** Onde estão os U+FFFD dentro do nome quebrado. */
function posicoesQuebradas(quebrado) {
  const pos = [];
  for (let i = 0; i < quebrado.length; i++) {
    if (quebrado[i] === SUBSTITUTO) pos.push(i);
  }
  return pos;
}

/**
 * Segunda passada, palavra por palavra.
 *
 * "João Pedro Leite" existe íntegro na extração, mas "Jo�o Pedro
 * Coutinho" não — o nome inteiro não casa com nada. A palavra, porém,
 * casa: "Jo�o" bate com o "João" que veio do outro registro. Conserta-se
 * então cada palavra quebrada contra o vocabulário da própria base, e não
 * contra um dicionário externo — continua sendo dado da empresa, não
 * palpite.
 *
 * Vale a mesma exigência de candidato único, agora por palavra: se o
 * vocabulário tiver "Lúcia" e "Lícia" para o mesmo "L�cia", ninguém
 * escolhe por conta própria.
 */
function procuraPorPalavra(quebrado, vocabulario) {
  const palavras = quebrado.split(" ");
  const consertadas = [];

  for (const palavra of palavras) {
    if (!palavra.includes(SUBSTITUTO)) {
      consertadas.push(palavra);
      continue;
    }
    const padrao = new RegExp(
      "^" + palavra.split(SUBSTITUTO).map(escapaRegex).join(".") + "$"
    );
    const posicoes = posicoesQuebradas(palavra);
    const candidatos = [...vocabulario].filter(
      (v) => padrao.test(v) && posicoes.every((i) => v.charCodeAt(i) > 127)
    );
    if (candidatos.length !== 1) return null; // uma palavra sem certeza derruba o nome todo
    consertadas.push(candidatos[0]);
  }

  const resultado = consertadas.join(" ");
  return resultado.includes(SUBSTITUTO) ? null : resultado;
}

/** Todas as palavras íntegras da extração, para a passada por palavra. */
function montaVocabulario(textos) {
  const vocab = new Set();
  for (const t of textos) {
    for (const palavra of t.split(/\s+/)) {
      if (palavra.length > 1 && !palavra.includes(SUBSTITUTO)) vocab.add(palavra);
    }
  }
  return vocab;
}

function procuraOriginal(quebrado, textos) {
  const candidatos = candidatosDe(quebrado, textos);
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  /*
   * Mais de um candidato costuma ser o mesmo nome com e sem acento —
   * "Célio" e "Celio", "Óticas Diniz" e "Oticas Diniz". Não é ambiguidade
   * real: o U+FFFD só existe onde havia um byte **não-ASCII**. Se o
   * original fosse a letra sem acento, nada teria se corrompido ali.
   * Então vale o candidato que tem caractere acentuado em todas as
   * posições quebradas — e só ele.
   */
  const posicoes = posicoesQuebradas(quebrado);
  const acentuados = candidatos.filter((c) =>
    posicoes.every((i) => c.charCodeAt(i) > 127)
  );
  return acentuados.length === 1 ? acentuados[0] : null;
}

/* ---------- 3. aplica no banco ---------- */

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Falta SUPABASE_DB_URL no ambiente.");
    process.exit(1);
  }

  console.log("Lendo a extração…");
  const textos = coletaTextos();
  const vocabulario = montaVocabulario(textos);
  console.log(
    `  ${textos.length.toLocaleString("pt-BR")} strings e ` +
      `${vocabulario.size.toLocaleString("pt-BR")} palavras íntegras`
  );

  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();

  // ⚠️ Transação única, como a carga: ou conserta tudo, ou não mexe em
  // nada. Sem --aplicar termina em rollback, que é o ensaio.
  await cliente.query("begin");

  const resumo = { corrigidos: 0, ambiguos: 0, semFonte: 0 };
  const exemplos = [];
  /** O que sobra vai para arquivo, para o maestro decidir um a um. */
  const pendentes = [];

  try {
    for (const [tabela, coluna] of [
      ["pessoa", "nome"],
      ["organizacao", "nome"],
    ]) {
      const { rows } = await cliente.query(
        `select id, ${coluna} as valor from ${tabela} where ${coluna} like '%' || chr(65533) || '%'`
      );

      for (const linha of rows) {
        // Primeiro o nome inteiro; se não houver, palavra por palavra.
        const original =
          procuraOriginal(linha.valor, textos) ??
          procuraPorPalavra(linha.valor, vocabulario);
        if (!original) {
          // Sem fonte na extração, ou ambiguidade que a regra do acento
          // não resolveu. Fica como está: nome de cliente não se adivinha.
          if (candidatosDe(linha.valor, textos).length > 0) resumo.ambiguos++;
          else resumo.semFonte++;
          pendentes.push(`${tabela}	${linha.valor}`);
          continue;
        }

        await cliente.query(
          `update ${tabela} set ${coluna} = $1 where id = $2`,
          [original, linha.id]
        );
        resumo.corrigidos++;
        if (exemplos.length < 12) exemplos.push([linha.valor, original]);
      }
    }

    console.log("\n--- exemplos ---");
    for (const [de, para] of exemplos) console.log(`  ${de}  →  ${para}`);

    console.log("\n--- resumo ---");
    console.log(`  corrigidos          : ${resumo.corrigidos}`);
    console.log(`  ambíguos (intocados): ${resumo.ambiguos}`);
    console.log(`  sem fonte (intocados): ${resumo.semFonte}`);

    if (pendentes.length > 0) {
      const arquivo = "acentos-pendentes.tsv";
      // UTF-8 com BOM, para abrir direto no Excel sem quebrar acento
      // (regra 6 do CLAUDE.md).
      const conteudo =
        "﻿tabela\tnome_como_esta\n" + pendentes.join("\n") + "\n";
      fs.writeFileSync(arquivo, conteudo, "utf8");
      console.log(
        `\n  ${pendentes.length} nomes sem correção segura listados em ${arquivo}`
      );
    }

    if (aplicar) {
      await cliente.query("commit");
      console.log("\n✅ GRAVADO.");
    } else {
      await cliente.query("rollback");
      console.log("\n↩️  ENSAIO — nada foi gravado. Use --aplicar para valer.");
    }
  } catch (erro) {
    await cliente.query("rollback");
    console.error("\nERRO, tudo desfeito:", erro.message);
    process.exitCode = 1;
  } finally {
    await cliente.end();
  }
}

main();
