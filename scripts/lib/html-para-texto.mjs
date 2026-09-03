/**
 * Converte o HTML que o Pipedrive guarda em anotações e descrições de
 * atividade para texto puro — que é o tipo da coluna deste lado.
 *
 * ⚠️ **Isto substitui `.replace(/<[^>]+>/g, " ")`**, que foi como a carga
 * de 17/08 fez e é a origem do defeito que o maestro chamou de "copiar e
 * colar não está funcionando". Duas perdas somadas naquela linha:
 *
 *   1. **Toda tag virava um espaço**, inclusive `<br>`. Uma anotação com
 *      cinco contatos em cinco linhas virou um blob de uma linha só. São
 *      237 anotações e 1.613 atividades assim.
 *   2. **Entidade não era decodificada.** `&nbsp;` ficou literal no
 *      banco, aos pares, exatamente onde o Pipedrive alinhava colunas:
 *      "(62) 99105-1932&nbsp; &nbsp; Michelle&nbsp; &nbsp; Diretor".
 *
 * E em `atividade.descricao` a carga nem chegou a tirar tag: 2.007 das
 * 3.480 descrições guardam `<div>`, `<ol>`, `<span style=…>` crus.
 *
 * ⚠️ **A ordem é: tag primeiro, entidade depois.** Invertê-la faz
 * `&lt;dho@eneserra.com.br&gt;` — que é TEXTO escapado, um e-mail entre
 * sinais de menor e maior — virar uma tag e desaparecer. Existe na base.
 *
 * ⚠️ **Quebra de linha sobrevive à normalização.** O `texto()` das cargas
 * colapsa `\s+` num espaço só, o que apaga `\n` junto e desfaria tudo que
 * esta função fez. Aqui o espaço é normalizado DENTRO de cada linha, e a
 * linha é preservada.
 */

/**
 * ⚠️ **Só nome de elemento CONHECIDO conta como tag.** Um `<[^>]*>` cego
 * apaga `<dho@eneserra.com.br>` — e-mail entre sinais de menor e maior,
 * que **existe na base** — e apagaria qualquer `a < b > c` digitado à
 * mão. A lista abaixo é a dos elementos que a extração de fato traz;
 * medida, não imaginada.
 *
 * É também o que torna esta função **idempotente**: rodá-la sobre um
 * texto já convertido não tem mais nada para tirar.
 */
const ELEMENTOS =
  "a|b|blockquote|body|br|col|colgroup|div|em|font|h[1-6]|head|hr|html|i|img|li|ol|p|pre|s|script|small|span|strike|strong|style|sub|sup|table|tbody|td|tfoot|th|thead|tr|u|ul";

/**
 * ⚠️ **Nada de `\s*` depois do `<`.** Tag de verdade cola o nome no
 * sinal — `<b>`, nunca `< b >`. Aceitar o espaço faria "orçamento a < b >
 * c aprovado" perder o meio, porque `b` também é nome de elemento. É a
 * mesma armadilha do e-mail entre sinais, por outra porta.
 */
const QUEBRA = /<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/blockquote|hr)\b[^>]*>/gi;

/** Qualquer tag conhecida, de abertura ou fecho, mais comentário. */
const TAG = new RegExp(`<!--[\\s\\S]*?-->|</?(?:${ELEMENTOS})\\b[^>]*>`, "gi");

const NOMEADAS = {
  nbsp: " ", // espaço comum de propósito: era alinhamento, não caractere.
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ldquo: "\u201c",
  rdquo: "\u201d",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  atilde: "ã", otilde: "õ", ccedil: "ç",
  acirc: "â", ecirc: "ê", ocirc: "ô",
  agrave: "à",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  Atilde: "Ã", Otilde: "Õ", Ccedil: "Ç",
  Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô",
  Agrave: "À",
};

function decodifica(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (todo, corpo) => {
    if (corpo[0] === "#") {
      const n =
        corpo[1] === "x" || corpo[1] === "X"
          ? parseInt(corpo.slice(2), 16)
          : parseInt(corpo.slice(1), 10);
      // Fora do intervalo válido do Unicode não é entidade: é texto que
      // por acaso parece uma. Fica como está.
      if (!Number.isFinite(n) || n < 9 || n > 0x10ffff) return todo;
      return String.fromCodePoint(n);
    }
    // Entidade que não conhecemos fica literal — inventar um caractere
    // seria pior do que mostrar o que o Pipedrive de fato guardou.
    return Object.hasOwn(NOMEADAS, corpo) ? NOMEADAS[corpo] : todo;
  });
}

/**
 * @param {unknown} bruto conteúdo como veio do Pipedrive
 * @returns {string|null} texto puro, ou nulo se não sobrou nada
 */
export function htmlParaTexto(bruto) {
  if (bruto == null) return null;

  let s = String(bruto);
  s = s.replace(/\r\n?/g, "\n");
  // `<script>`/`<style>` levam o conteúdo junto: não é texto do usuário.
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  s = s.replace(QUEBRA, "\n");
  s = s.replace(TAG, ""); // o resto é inline: some sem deixar espaço
  s = decodifica(s);
  // U+00A0 e afins viraram espaço comum: num campo de texto puro eles só
  // atrapalham a busca, que procura o espaço de sempre.
  s = s.replace(/[\u00a0\u2007\u202f]/g, " ");

  s = s
    .split("\n")
    .map((linha) => linha.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // parágrafo em branco basta ser um
    .trim();

  return s === "" ? null : s;
}
