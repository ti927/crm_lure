import { LinkNegocio } from "@/components/dominio/previa-negocio";
import { Building2, User } from "lucide-react";
import { real, data } from "@/lib/formato";
import {
  EtiquetaStatus,
  EtiquetaEtapa,
  faixaDaEtapa,
} from "@/components/dominio/etiquetas";
import type { LinhaNegocio } from "./consulta";

/**
 * A Lista de negócios em cartões, para o celular (B-110, D-097).
 *
 * Não é a tabela de dez colunas espremida — em 390px ela exigiria rolagem
 * horizontal, que é justamente o que o critério proíbe. É outra forma: um
 * cartão por negócio, com o que o vendedor consulta em pé na rua — título,
 * organização, valor, etapa e status. As colunas que sobram (origem,
 * produto, motivo) ficam para a ficha, a um toque de distância.
 *
 * A faixa de cor da etapa acompanha o nome escrito, nunca o substitui
 * (B-076).
 */
export function CartoesNegocio({ negocios }: { negocios: LinhaNegocio[] }) {
  return (
    <ul className="md:hidden">
      {negocios.map((n, i) => (
        <li
          key={n.id}
          style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}
          className="animate-in fade-in fill-mode-backwards duration-300"
        >
          <LinkNegocio
            id={n.id}
            href={`/negocios/${n.id}`}
            className={`border-border hover:bg-surface-hover active:bg-surface-hover faixa-etapa flex flex-col gap-1.5 border-b px-4 py-3 ${faixaDaEtapa(
              n.etapa?.ordem
            )}`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="text-md min-w-0 flex-1 font-medium leading-snug">
                {n.titulo}
              </span>
              <span className="tabular shrink-0 text-md font-semibold">
                {real(n.valor)}
              </span>
            </span>

            {n.organizacao?.nome && (
              <span className="text-text-secondary flex min-w-0 items-center gap-1.5 text-sm">
                <Building2 className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{n.organizacao.nome}</span>
              </span>
            )}

            <span className="flex flex-wrap items-center gap-2">
              <EtiquetaEtapa nome={n.etapa?.nome} ordem={n.etapa?.ordem} />
              <EtiquetaStatus status={n.status} />
              {n.usuario?.nome && (
                <span className="text-text-muted ml-auto flex items-center gap-1 text-xs">
                  <User className="size-3 shrink-0" aria-hidden />
                  {n.usuario.nome}
                </span>
              )}
            </span>

            <span className="text-text-muted text-xs">
              Criado em {data(n.criado_em)}
            </span>
          </LinkNegocio>
        </li>
      ))}
    </ul>
  );
}
