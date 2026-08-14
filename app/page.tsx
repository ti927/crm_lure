import { redirect } from "next/navigation";

/**
 * A raiz nao tem tela propria: o sistema abre na Lista de negocios, que e
 * a tela mais usada (Doc 10, principio 3 de sequenciamento).
 *
 * A superficie de conferencia dos tokens, que morava aqui durante a F0,
 * mudou para /estilo — continua sendo onde os dois temas se conferem de
 * uma vez, como a regra 4 do CLAUDE.md exige.
 */
export default function Raiz() {
  redirect("/negocios");
}
