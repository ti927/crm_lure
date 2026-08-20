/**
 * Diferenca entre duas extracoes do Pipedrive.
 *
 * ⚠️ SOMENTE LEITURA de arquivos. Nao toca no banco, nao chama a API.
 *
 * Existe porque "atualizar a base" nao e uma operacao so: ha registro
 * NOVO (que e insercao simples) e registro ALTERADO (que exige saber
 * qual linha daqui corresponde a qual la — e o schema nao guarda o id
 * do Pipedrive em lugar nenhum). Este script separa os dois casos com
 * numero, antes de qualquer decisao.
 *
 * Uso:  node scripts/compara-extracoes.mjs [antiga] [nova]
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANTIGA = process.argv[2] ?? join(RAIZ, "dados/pipedrive-snapshot-17-08");
const NOVA = process.argv[3] ?? join(RAIZ, "dados/pipedrive");

const ENTIDADES = [
  { arquivo: "deals.json", nome: "negocios", rotulo: (d) => d.title },
  { arquivo: "organizations.json", nome: "organizacoes", rotulo: (d) => d.name },
  { arquivo: "persons.json", nome: "pessoas", rotulo: (d) => d.name },
  { arquivo: "activities.json", nome: "atividades", rotulo: (d) => d.subject },
  { arquivo: "notes.json", nome: "anotacoes", rotulo: (d) => (d.content ?? "").slice(0, 40) },
];

const ler = async (base, arq) => {
  try {
    return JSON.parse(await readFile(join(base, arq), "utf8"));
  } catch {
    return [];
  }
};

console.log("\n=== Diferenca entre extracoes ===");
console.log(`antiga: ${ANTIGA.replace(RAIZ, ".")}`);
console.log(`nova  : ${NOVA.replace(RAIZ, ".")}\n`);

const resumo = [];

for (const e of ENTIDADES) {
  const a = await ler(ANTIGA, e.arquivo);
  const n = await ler(NOVA, e.arquivo);

  const mapaA = new Map(a.map((x) => [x.id, x]));
  const mapaN = new Map(n.map((x) => [x.id, x]));

  const novos = n.filter((x) => !mapaA.has(x.id));
  const sumidos = a.filter((x) => !mapaN.has(x.id));

  // `update_time` e o carimbo do Pipedrive. Quando ele muda, algum campo
  // mudou — nao da para saber qual sem o changelog, mas da para saber
  // QUANTOS, que e o que decide se a atualizacao vale o esforco.
  const alterados = n.filter((x) => {
    const velho = mapaA.get(x.id);
    return velho && velho.update_time !== x.update_time;
  });

  resumo.push({
    entidade: e.nome,
    antes: a.length,
    agora: n.length,
    novos: novos.length,
    alterados: alterados.length,
    sumidos: sumidos.length,
  });

  if (novos.length || sumidos.length || alterados.length) {
    console.log(`--- ${e.nome} ---`);
    for (const x of novos.slice(0, 8)) console.log(`  + ${e.rotulo(x) ?? "(sem titulo)"}  [id ${x.id}]`);
    if (novos.length > 8) console.log(`  + … mais ${novos.length - 8}`);
    for (const x of sumidos.slice(0, 8)) console.log(`  - ${e.rotulo(x) ?? "(sem titulo)"}  [id ${x.id}]  APAGADO no Pipedrive`);
    if (sumidos.length > 8) console.log(`  - … mais ${sumidos.length - 8}`);
    if (alterados.length) console.log(`  ~ ${alterados.length} alterado(s)`);
    for (const x of alterados.slice(0, 6)) console.log(`    ~ ${e.rotulo(x) ?? "(sem titulo)"}  [id ${x.id}]`);
    console.log();
  }
}

console.table(resumo);

const totalNovos = resumo.reduce((s, r) => s + r.novos, 0);
const totalAlt = resumo.reduce((s, r) => s + r.alterados, 0);
const totalSumidos = resumo.reduce((s, r) => s + r.sumidos, 0);

console.log(`\nNovos: ${totalNovos} · Alterados: ${totalAlt} · Apagados no Pipedrive: ${totalSumidos}`);
console.log(
  "\n⚠️ Registro NOVO e insercao simples. Registro ALTERADO exige casar\n" +
    "   a linha de la com a daqui, e o schema nao guarda o id do Pipedrive:\n" +
    "   sem uma coluna de procedencia, nao ha como atualizar sem duplicar.",
);
