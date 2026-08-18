import { BotaoGoogle } from "@/components/dominio/botao-google";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimboloLure, LogoLure } from "@/components/dominio/marca";

const ERROS: Record<string, string> = {
  sem_codigo: "O Google não devolveu o código de autorização. Tente de novo.",
  falha_na_troca: "Não foi possível concluir o login. Tente de novo.",
  fora_do_dominio:
    "Esta conta não pertence ao domínio da empresa. O acesso é restrito às contas corporativas.",
};

/*
 * Os parametros de consulta sao lidos no servidor de proposito. Com
 * useSearchParams no cliente, a pagina continuaria estatica e o botao so
 * apareceria depois da hidratacao — a primeira tela do sistema nasceria
 * com um buraco. Ler aqui torna a rota dinamica, que e o correto para
 * uma pagina cujo conteudo depende da URL.
 */
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; proximo?: string }>;
}) {
  const { erro, proximo = "/" } = await searchParams;

  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      {/*
        Painel da marca. É sempre escuro, independente do tema do sistema —
        é a identidade, não um componente de interface. Some no celular,
        onde a tela é estreita demais para o split (a marca reaparece
        acima do formulário). Cores forçadas em neutros: o `text-neutral-0`
        no container faz os braços do símbolo (currentColor) ficarem
        brancos; o miolo continua amarelo.
      */}
      <aside className="text-neutral-0 border-border hidden flex-col justify-between border-r bg-neutral-950 p-12 md:flex">
        <div className="flex items-center gap-2.5">
          <SimboloLure className="size-8 shrink-0" />
          <span className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold leading-none tracking-tight">
              LURE
            </span>
            <span
              className="text-neutral-900 inline-flex items-center rounded bg-neutral-0 px-1.5 py-1 text-[11px] font-bold leading-none"
              style={{ letterSpacing: "0.14em" }}
            >
              CRM
            </span>
          </span>
        </div>

        <div>
          <SimboloLure className="mb-7 size-28" />
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight">
            Organize potencial
            <br />
            em resultados.
          </h1>
          <p className="text-neutral-400 mt-3 max-w-sm text-md leading-relaxed">
            Seu funil de vendas, do lead frio ao contrato assinado.
          </p>
        </div>

        <span
          className="text-neutral-600 text-xs"
          style={{ fontFamily: "var(--font-plex-mono)" }}
        >
          Lucro + Rentabilidade
        </span>
      </aside>

      {/* Painel do acesso. Segue o tema do sistema. Usa `surface` (não o
          fundo da página) para destacar do painel de marca no tema escuro,
          onde ambos seriam quase pretos e se fundiriam. */}
      <div className="bg-surface relative flex items-center justify-center px-6 py-12">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* A marca reaparece aqui no celular, onde o painel escuro some. */}
          <div className="mb-8 md:hidden">
            <LogoLure />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">Entrar</h2>
          <p className="text-text-secondary mt-1 text-md">
            Acesse com a sua conta corporativa Lure.
          </p>

          {erro && (
            <p className="bg-danger-bg text-danger-ink mt-6 rounded-md px-3 py-2 text-sm">
              {ERROS[erro] ?? "Não foi possível entrar."}
            </p>
          )}

          <BotaoGoogle proximo={proximo} />
        </div>
      </div>
    </main>
  );
}
