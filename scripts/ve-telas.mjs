/**
 * Abre as telas do sistema num navegador e grava captura de cada uma.
 *
 * Existe porque o Google OAuth impede o agente de logar, e sem sessao a
 * RLS devolve vazio: as paginas respondem 200 e chegam SEM DADO. Toda a
 * verificacao possivel ate aqui era `build` + `curl`, que le HTML e nao
 * enxerga pixel — e os defeitos deste projeto tem sido visuais. O campo
 * de cargo que parecia texto (C-11), o rodape ocupando espaco, os
 * rotulos passando por baixo (C-12): nenhum deles aparece no HTML.
 *
 * ⚠️ SO CONTRA localhost. O script recusa qualquer outro destino, e a
 * checagem esta antes de tudo. Nao ha caminho em que ele fale com a
 * Vercel.
 *
 * ⚠️ Ele NAO enfraquece o login. O Google OAuth continua sendo a unica
 * porta para pessoas. Isto e uma porta lateral local, que existe fora da
 * aplicacao — nao ha rota, nem variavel, nem linha de codigo no app que
 * permita isso. Apagar este arquivo apaga a capacidade inteira.
 *
 * ⚠️ A sessao e de um USUARIO REAL. Qualquer escrita feita aqui apareceria
 * no log de eventos com o nome dele. O uso previsto e de LEITURA: abrir,
 * olhar, fechar.
 *
 * Uso:
 *   node scripts/ve-telas.mjs
 *   node scripts/ve-telas.mjs --rotas /kanban,/negocios --tema ambos
 *   node scripts/ve-telas.mjs --como rafael.saia@lureconsultoria.com.br
 */

import { readFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- argumentos ---------- */

function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

const ALVO = arg("url", "http://localhost:3000");
const COMO = arg("como", "fabio.miranda@lureconsultoria.com.br");
const TEMA = arg("tema", "claro"); // claro | escuro | ambos
const SAIDA = arg("saida", join(RAIZ, "capturas"));
const LARGURA = Number(arg("largura", "1440"));
/**
 * Pixels a rolar antes de capturar.
 *
 * ⚠️ Existe porque o defeito que originou este script so aparece DEPOIS
 * de rolar: cabecalho de coluna que nao fica, cartao que passa por cima
 * do rotulo, rodape que devia aparecer no fim. Uma captura do topo da
 * pagina mostra tudo funcionando e nao prova nada.
 */
const ROLAR = Number(arg("rolar", "0"));
const ALTURA = Number(arg("altura", "900"));
const ROTAS = arg(
  "rotas",
  "/negocios,/kanban,/atividades,/contatos,/estatisticas",
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean)
  /**
   * ⚠️ O Git Bash no Windows reescreve argumento que PARECE caminho:
   * `--rotas /negocios` chega aqui como
   * `C:/Program Files/Git/negocios`, e a navegacao falha com "invalid
   * URL" sem dizer por que. Duas defesas: desfazer o prefixo quando ele
   * aparecer, e aceitar rota sem barra inicial (`negocios`), que e a
   * forma que o shell nao mexe.
   */
  .map((r) => r.replace(/^[A-Za-z]:[\/].*?[\/]Git[\/]/, "/"))
  .map((r) => (r.startsWith("/") ? r : `/${r}`));

/**
 * ⚠️ A trava. Antes de ler segredo, antes de falar com o Supabase.
 * `hostname` e nao `href`: `http://localhost.evil.com` tem "localhost"
 * dentro e nao e localhost.
 */
{
  const { hostname } = new URL(ALVO);
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname)) {
    console.error(
      `\nRECUSADO: este script so fala com localhost, e recebeu "${hostname}".\n` +
        `Ele emite sessao de usuario real — nao existe motivo para apontar\n` +
        `para outro lugar, e o unico resultado de permitir seria um acidente.\n`,
    );
    process.exit(1);
  }
}

/* ---------- ambiente ---------- */

const env = Object.fromEntries(
  (await readFile(join(RAIZ, ".env.local"), "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICO = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !ANON || !SERVICO) {
  throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL, ANON ou SERVICE_ROLE no .env.local");
}

/* ---------- 1. emitir a sessao ---------- */

/**
 * Duas chamadas a Auth Admin API, nesta ordem:
 *
 *   generate_link — devolve um `hashed_token` de link magico SEM enviar
 *                   e-mail nenhum. E a peca que substitui o OAuth aqui.
 *   verify        — troca o token por uma sessao de verdade.
 *
 * ⚠️ O usuario precisa JA EXISTIR em `auth.users`. O script nao cria
 * conta: criar gente e decisao de produto, e o D-109 tem regra para isso.
 */
async function emitirSessao(email) {
  const cabecalho = {
    apikey: SERVICO,
    Authorization: `Bearer ${SERVICO}`,
    "Content-Type": "application/json",
  };

  const gerado = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: cabecalho,
    body: JSON.stringify({ type: "magiclink", email }),
  });
  if (!gerado.ok) {
    throw new Error(`generate_link falhou (${gerado.status}): ${(await gerado.text()).slice(0, 200)}`);
  }
  const { hashed_token } = await gerado.json();
  if (!hashed_token) throw new Error("generate_link nao devolveu hashed_token.");

  const verificado = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    // ⚠️ `token_hash`, e nao `token`: com `token` a API exige o e-mail
    // junto e recusa com "Only an email address or phone number should be
    // provided on verify" — mensagem que descreve o contrario do problema.
    body: JSON.stringify({ type: "magiclink", token_hash: hashed_token }),
  });
  if (!verificado.ok) {
    throw new Error(`verify falhou (${verificado.status}): ${(await verificado.text()).slice(0, 200)}`);
  }
  const sessao = await verificado.json();
  if (!sessao.access_token) throw new Error("verify nao devolveu access_token.");
  return sessao;
}

/* ---------- 2. converter em cookie ---------- */

/**
 * ⚠️ Os cookies saem do PROPRIO `@supabase/ssr`, com um armazem de
 * mentira, em vez de serem montados a mao.
 *
 * O formato (nome `sb-<ref>-auth-token`, prefixo `base64-`, quebra em
 * pedacos `.0`/`.1` acima de certo tamanho) e detalhe interno da
 * biblioteca. Escrever isso a mao funcionaria hoje e quebraria calado na
 * primeira atualizacao — e "calado" e a palavra que este projeto ja
 * pagou caro para aprender. Deixando a propria biblioteca gravar, o
 * formato esta certo por construcao.
 */
async function cookiesDaSessao(sessao) {
  const armazem = new Map();
  const cliente = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...armazem].map(([name, value]) => ({ name, value })),
      setAll: (lista) => lista.forEach(({ name, value }) => armazem.set(name, value)),
    },
  });

  const { error } = await cliente.auth.setSession({
    access_token: sessao.access_token,
    refresh_token: sessao.refresh_token,
  });
  if (error) throw new Error(`setSession falhou: ${error.message}`);
  if (armazem.size === 0) throw new Error("Nenhum cookie foi gravado pelo @supabase/ssr.");

  const { hostname } = new URL(ALVO);
  return [...armazem].map(([name, value]) => ({
    name,
    value,
    domain: hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));
}

/* ---------- 3. abrir e capturar ---------- */

const TEMAS = TEMA === "ambos" ? ["claro", "escuro"] : [TEMA];
const nomeArquivo = (rota, tema) =>
  `${rota.replace(/^\//, "").replace(/[/?=&]/g, "-") || "inicio"}-${tema}${ROLAR ? `-rolado${ROLAR}` : ""}.png`;

console.log(`\n=== Telas do CRM ===`);
console.log(`Alvo   : ${ALVO}`);
console.log(`Sessao : ${COMO}`);
console.log(`Temas  : ${TEMAS.join(", ")}`);
console.log(`Janela : ${LARGURA}x${ALTURA}\n`);

const sessao = await emitirSessao(COMO);
const cookies = await cookiesDaSessao(sessao);
console.log(`Sessao emitida — ${cookies.length} cookie(s): ${cookies.map((c) => c.name).join(", ")}\n`);

await mkdir(SAIDA, { recursive: true });
const navegador = await chromium.launch();
const gravadas = [];

try {
  for (const tema of TEMAS) {
    const contexto = await navegador.newContext({
      viewport: { width: LARGURA, height: ALTURA },
      // `colorScheme` cobre o `defaultTheme="system"` do next-themes; o
      // `localStorage` cobre a escolha explicita do botao. Os dois, porque
      // o provedor respeita o sistema ate alguem escolher.
      colorScheme: tema === "escuro" ? "dark" : "light",
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    await contexto.addCookies(cookies);
    await contexto.addInitScript(
      `try { localStorage.setItem("theme", ${JSON.stringify(tema === "escuro" ? "dark" : "light")}); } catch {}`,
    );

    const pagina = await contexto.newPage();
    const problemas = [];
    pagina.on("console", (m) => m.type() === "error" && problemas.push(m.text()));
    pagina.on("pageerror", (e) => problemas.push(String(e)));

    for (const rota of ROTAS) {
      const resposta = await pagina.goto(`${ALVO}${rota}`, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      // A tela pronta e a tela sem esqueleto: esperar so o `load` pega o
      // carregando, que e justamente o que nao se quer olhar.
      await pagina.waitForTimeout(700);

      if (ROLAR > 0) {
        // ⚠️ Rola o `main`, que e quem rola nestas telas (D-151), e cai
        // para a janela se por algum motivo ele nao existir. Depois
        // espera: `scrollBy` e assincrono e capturar em seguida pegaria
        // a tela no meio do caminho.
        await pagina.evaluate((y) => {
          const alvo = document.querySelector("main");
          if (alvo && alvo.scrollHeight > alvo.clientHeight) alvo.scrollBy(0, y);
          else window.scrollBy(0, y);
        }, ROLAR);
        await pagina.waitForTimeout(400);
      }

      const arquivo = join(SAIDA, nomeArquivo(rota, tema));
      await pagina.screenshot({ path: arquivo, fullPage: false });

      const caiuNoLogin = new URL(pagina.url()).pathname.startsWith("/login");
      gravadas.push({
        rota,
        tema,
        http: resposta?.status() ?? 0,
        sessao: caiuNoLogin ? "PERDIDA" : "ok",
        arquivo,
      });
      if (caiuNoLogin) {
        console.log(`  ⚠️  ${rota} caiu no /login — a sessao nao foi aceita.`);
      }
    }

    if (problemas.length) {
      console.log(`\nErros de console no tema ${tema}:`);
      for (const p of [...new Set(problemas)].slice(0, 10)) console.log(`  · ${p}`);
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
}

console.table(
  gravadas.map((g) => ({
    rota: g.rota,
    tema: g.tema,
    http: g.http,
    sessao: g.sessao,
    arquivo: g.arquivo.replace(RAIZ, "."),
  })),
);
console.log(`\n${gravadas.length} captura(s) em ${SAIDA.replace(RAIZ, ".")}\n`);
