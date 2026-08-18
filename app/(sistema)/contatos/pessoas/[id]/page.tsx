import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { data as fdata, dataHora } from "@/lib/formato";
import { CabecalhoPessoa } from "./cabecalho-pessoa";
import { OrganizacoesDaPessoa, type OrgVinculada } from "./organizacoes-da-pessoa";
import { FormasDeContato, type Contato } from "./formas-de-contato";

export default async function FichaPessoa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pessoa } = await supabase
    .from("pessoa")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle();

  if (!pessoa) notFound();

  const [
    { data: vinculos },
    { data: contatos },
    { data: atividades },
    { data: anotacoes },
  ] = await Promise.all([
    supabase
      .from("pessoa_organizacao")
      .select("cargo, organizacao(id, nome)")
      .eq("pessoa_id", id),
    supabase.from("forma_contato").select("id, tipo, valor").eq("pessoa_id", id),
    supabase
      .from("atividade")
      .select("id, titulo, data, concluida, tipo_atividade(nome)")
      .eq("pessoa_id", id)
      .order("data", { ascending: false })
      .limit(50),
    supabase
      .from("anotacao")
      .select("id, texto, criado_em, usuario(nome)")
      .eq("pessoa_id", id)
      .order("criado_em", { ascending: false })
      .limit(50),
  ]);

  const organizacoes: OrgVinculada[] = (vinculos ?? [])
    .filter((v) => v.organizacao)
    .map((v) => ({ id: v.organizacao!.id, nome: v.organizacao!.nome, cargo: v.cargo }));

  const secao = "text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps";

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-border shrink-0 border-b px-4 py-3">
        <Link
          href="/contatos?aba=pessoas"
          className="text-text-muted hover:text-text mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Contatos
        </Link>
        <CabecalhoPessoa pessoa={pessoa} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto lg:grid-cols-[20rem_minmax(0,1fr)] lg:overflow-hidden">
        <div className="bg-surface flex flex-col gap-5 overflow-y-auto p-4 lg:border-r lg:border-border">
          <OrganizacoesDaPessoa pessoaId={pessoa.id} organizacoes={organizacoes} />
          <FormasDeContato pessoaId={pessoa.id} contatos={(contatos ?? []) as Contato[]} />
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          <section>
            <h2 className={secao}>
              Atividades {atividades && atividades.length > 0 && `(${atividades.length})`}
            </h2>
            {!atividades || atividades.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhuma atividade.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {atividades.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-md">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${a.concluida ? "bg-success" : "bg-border-strong"}`}
                      aria-hidden
                    />
                    <span className={`truncate ${a.concluida ? "text-text-muted line-through" : ""}`}>
                      {a.titulo ?? a.tipo_atividade?.nome ?? "Atividade"}
                    </span>
                    <span className="text-text-muted tabular ml-auto shrink-0 text-sm">{fdata(a.data)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className={secao}>
              Anotações {anotacoes && anotacoes.length > 0 && `(${anotacoes.length})`}
            </h2>
            {!anotacoes || anotacoes.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhuma anotação.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {anotacoes.map((an) => (
                  <li key={an.id} className="border-border rounded-md border px-3 py-2">
                    <p className="text-md whitespace-pre-wrap">{an.texto}</p>
                    <p className="text-text-muted mt-1 text-xs">
                      {an.usuario?.nome ?? "—"} · {dataHora(an.criado_em)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
