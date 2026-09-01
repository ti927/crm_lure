"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, Users, Plus, MapPin, X } from "lucide-react";
import { CampoBusca } from "@/components/dominio/campo-busca";
import { DialogoOrganizacao } from "./dialogo-organizacao";
import { DialogoPessoa } from "./dialogo-pessoa";
import type { Aba, Locais } from "./consulta";

/**
 * Barra da Lista de Contatos: abas Organizações/Pessoas, busca por nome e
 * o botão de criar (que abre o diálogo da aba atual). Ao criar, leva
 * direto para a ficha nova, onde se completa vínculos e contatos.
 */
export function BarraContatos({
  aba,
  total,
  locais,
}: {
  aba: Aba;
  total: number;
  /** Nulo na aba Pessoas: pessoa não tem endereço na base (D-160). */
  locais: Locais | null;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [dialogo, setDialogo] = useState<"organizacao" | "pessoa" | null>(null);

  const busca = params.get("busca") ?? "";
  const local = params.get("local") ?? "";

  function trocarAba(nova: Aba) {
    const p = new URLSearchParams();
    if (nova === "pessoas") p.set("aba", "pessoas");
    // Busca e página não sobrevivem à troca de aba: são recortes de
    // conjuntos diferentes.
    const s = p.toString();
    iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
  }

  const aplicarBusca = useCallback(
    (valor: string) => {
      const p = new URLSearchParams(params);
      if (valor) p.set("busca", valor);
      else p.delete("busca");
      // Busca nova sempre volta à primeira página: continuar na página 7
      // de um conjunto que encolheu mostraria vazio.
      p.delete("pagina");
      const s = p.toString();
      iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
    },
    [params, caminho, router, iniciar]
  );

  /**
   * O local é UM parâmetro — ver `parseLocal` em `consulta.ts`.
   *
   * ⚠️ Volta para a primeira página, pelo mesmo motivo da busca: seguir
   * na página 7 de um conjunto que encolheu de 1.699 para 65 grupos
   * mostraria vazio, e vazio se lê como "não há nada em Anápolis".
   */
  const aplicarLocal = useCallback(
    (valor: string) => {
      const p = new URLSearchParams(params);
      if (valor) p.set("local", valor);
      else p.delete("local");
      p.delete("pagina");
      const s = p.toString();
      iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
    },
    [params, caminho, router, iniciar]
  );

  function aoFecharDialogo(r: { mudou: boolean; id?: string }) {
    setDialogo(null);
    if (r.mudou && r.id) {
      const destino =
        dialogo === "organizacao"
          ? `/contatos/organizacoes/${r.id}`
          : `/contatos/pessoas/${r.id}`;
      router.push(destino);
    }
  }

  const abaClasse = (a: Aba) =>
    `inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-md font-medium ${
      aba === a ? "bg-surface-hover text-text" : "text-text-muted hover:text-text"
    }`;

  return (
    <>
      <div
        className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        data-pendente={pendente || undefined}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Contatos</h1>
          <div className="border-border flex rounded-md border p-0.5">
            <button type="button" onClick={() => trocarAba("organizacoes")} className={abaClasse("organizacoes")}>
              <Building2 className="size-4" aria-hidden />
              Organizações
            </button>
            <button type="button" onClick={() => trocarAba("pessoas")} className={abaClasse("pessoas")}>
              <Users className="size-4" aria-hidden />
              Pessoas
            </button>
          </div>
          <span className="text-text-muted text-sm">
            {total.toLocaleString("pt-BR")}
          </span>
        </div>

        {/* No celular a busca ocupa a linha inteira: é a ação principal
            da tela, e um campo de 14rem espremido ao lado do botão seria
            pequeno demais para o polegar. */}
        <div className="flex w-full items-center gap-2 md:w-auto">
          <CampoBusca
            valor={busca}
            aoBuscar={aplicarBusca}
            placeholder={aba === "organizacoes" ? "Buscar organização" : "Buscar pessoa"}
            className="min-w-0 flex-1 md:w-56 md:flex-none"
          />

          {/* ⚠️ Um seletor só, e não um par "UF" + "Cidade". Com dois, o
              usuário pode montar recortes vazios — cidade de Goiás com o
              estado de São Paulo — e cabe a ele descobrir por que a lista
              zerou. Aqui as cidades já vivem dentro do estado a que
              pertencem, e escolher errado não é possível.

              ⚠️ `<select>` nativo, e não um menu construído: são 69
              opções em grupos, e o nativo dá busca por digitação, rolagem
              e teclado de graça — além de virar a roleta do sistema no
              celular, onde metade deste CRM roda (D-097). */}
          {locais && (
            <div className="relative shrink-0">
              <MapPin
                className={`pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 ${
                  local ? "text-brand-ink" : "text-text-muted"
                }`}
                aria-hidden
              />
              <select
                value={local}
                onChange={(e) => aplicarLocal(e.target.value)}
                aria-label="Filtrar por local"
                className={`h-control-md bg-surface text-md w-full min-w-0 rounded-md border pl-8 pr-2 md:w-52 ${
                  // A borda de marca é o mesmo sinal de "filtro ativo" da
                  // linha de filtro da Lista — e nunca o único: o próprio
                  // texto da opção escolhida fica escrito no controle.
                  local ? "border-brand-ink" : "border-border"
                }`}
              >
                <option value="">Todos os locais</option>

                {locais.ufs.map((u) => (
                  <optgroup key={u.uf} label={u.uf}>
                    {/* O estado inteiro vem antes das cidades dele, e
                        alcança também os cadastros que só sabem a UF —
                        por isso o total pode passar a soma das cidades. */}
                    <option value={u.uf}>
                      {u.uf} — todo o estado ({u.total.toLocaleString("pt-BR")})
                    </option>
                    {u.cidades.map((c) => (
                      <option key={c.nome} value={`${u.uf}:${c.nome}`}>
                        {c.nome} ({c.quantidade.toLocaleString("pt-BR")})
                      </option>
                    ))}
                  </optgroup>
                ))}

                {/* Cidade sem UF: a base tem um cadastro em Luanda, e
                    `organizacao_uf_valida` só aceita as 27 siglas — por
                    desenho, endereço estrangeiro fica sem estado. */}
                {locais.semUf.length > 0 && (
                  <optgroup label="Fora do Brasil">
                    {locais.semUf.map((c) => (
                      <option key={c.nome} value={`:${c.nome}`}>
                        {c.nome} ({c.quantidade.toLocaleString("pt-BR")})
                      </option>
                    ))}
                  </optgroup>
                )}

                {locais.semLocal > 0 && (
                  <optgroup label="Sem endereço">
                    {/* ⚠️ São 1.877 organizações — a MAIORIA da base. Este
                        recorte não é sobra: é o único caminho até elas
                        para preencher o endereço que falta. */}
                    <option value="sem">
                      Sem local ({locais.semLocal.toLocaleString("pt-BR")})
                    </option>
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {local && (
            <button
              type="button"
              onClick={() => aplicarLocal("")}
              aria-label="Limpar filtro de local"
              className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium"
            >
              <X className="size-3.5" aria-hidden />
              <span className="hidden md:inline">Limpar</span>
            </button>
          )}


          <button
            type="button"
            onClick={() => setDialogo(aba === "organizacoes" ? "organizacao" : "pessoa")}
            aria-label={aba === "organizacoes" ? "Nova organização" : "Nova pessoa"}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold md:px-3"
          >
            <Plus className="size-4" aria-hidden />
            {/* No celular o rótulo sai e fica só o "+": a linha já está
                ocupada pela busca. */}
            <span className="hidden md:inline">
              {aba === "organizacoes" ? "Nova organização" : "Nova pessoa"}
            </span>
          </button>
        </div>
      </div>

      {dialogo === "organizacao" && <DialogoOrganizacao aoFechar={aoFecharDialogo} />}
      {dialogo === "pessoa" && <DialogoPessoa aoFechar={aoFecharDialogo} />}
    </>
  );
}
