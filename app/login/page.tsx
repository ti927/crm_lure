import { BotaoGoogle } from "@/components/dominio/botao-google";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="bg-surface border-border w-full max-w-sm rounded-lg border p-8 shadow-md">
        <h1 className="text-2xl font-semibold tracking-tight">CRM Lure</h1>
        <p className="text-text-secondary mt-1 text-md">
          Entre com a sua conta corporativa.
        </p>

        {erro && (
          <p className="bg-danger-bg text-danger-ink mt-6 rounded-md px-3 py-2 text-sm">
            {ERROS[erro] ?? "Não foi possível entrar."}
          </p>
        )}

        <BotaoGoogle proximo={proximo} />
      </div>
    </main>
  );
}
