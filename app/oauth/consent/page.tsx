import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoLure } from "@/components/dominio/marca";
import { decide } from "./acoes";

/**
 * Página de autorização do MCP (D-175, Doc 16 §4).
 *
 * O Supabase manda o usuário para cá quando um agente (Grok, claude.ai,
 * Claude Code) pede acesso. Quem não está logado passa antes pelo /login
 * — o `proxy.ts` guarda a query, então o `authorization_id` volta junto.
 *
 * ⚠️ O que se aprova aqui é o agente agir COMO o usuário (D-173): o que
 * ele fizer sai no nome de quem aprovou.
 */

export const dynamic = "force-dynamic";

export default async function Consentimento({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; falha?: string }>;
}) {
  const { authorization_id: autorizacao, falha } = await searchParams;
  if (!autorizacao) return <Moldura><Aviso texto="Pedido de autorização sem identificação." /></Moldura>;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(autorizacao);

  if (error || !data) {
    return (
      <Moldura>
        <Aviso texto="Este pedido de autorização não vale mais. Volte ao agente e conecte de novo." />
      </Moldura>
    );
  }

  // Já aprovado antes para este agente: o Supabase devolve direto o retorno.
  if ("redirect_url" in data) redirect(data.redirect_url);

  const agente = data.client.name || "Um agente de IA";

  return (
    <Moldura>
      <div className="bg-brand text-brand-on mb-5 flex size-11 items-center justify-center rounded-lg">
        <Bot className="size-6" aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">{agente} quer acessar o CRM</h1>
      <p className="text-text-secondary mt-2 text-md leading-relaxed">
        Ao aprovar, o agente passa a agir <strong className="text-text">como você</strong>{" "}
        ({data.user.email}): vê o que você vê, e o que ele fizer fica registrado no seu nome.
        Você pode desconectá-lo depois.
      </p>

      {falha && (
        <p className="bg-danger-bg text-danger-ink mt-5 rounded-md px-3 py-2 text-sm">
          Não foi possível registrar a decisão. Tente de novo.
        </p>
      )}

      <form action={decide} className="mt-7 flex flex-col gap-2 sm:flex-row-reverse">
        <input type="hidden" name="autorizacao" value={autorizacao} />
        <Button type="submit" name="decisao" value="aprovar" size="lg" className="sm:flex-1">
          Aprovar
        </Button>
        <Button type="submit" name="decisao" value="recusar" size="lg" variant="outline" className="sm:flex-1">
          Recusar
        </Button>
      </form>
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-surface relative flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8">
          <LogoLure />
        </div>
        {children}
      </div>
    </main>
  );
}

function Aviso({ texto }: { texto: string }) {
  return <p className="bg-danger-bg text-danger-ink rounded-md px-3 py-2 text-sm">{texto}</p>;
}
