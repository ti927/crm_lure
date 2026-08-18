import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { paraWhatsApp } from "./consulta";
import type { LinhaPessoa } from "./consulta";

/**
 * Contatos em cartões, para o celular (D-097 + pedido do maestro: é a
 * tela mais usada no telefone).
 *
 * Não é a tabela redimensionada — é outra forma: um cartão por contato,
 * alvo de toque grande, e as ações que valem no celular em destaque
 * (ligar/WhatsApp e e-mail direto do cartão, sem precisar abrir a ficha).
 */

export function CartoesPessoa({ pessoas }: { pessoas: LinhaPessoa[] }) {
  return (
    <ul className="md:hidden">
      {pessoas.map((p) => {
        const vinculo = p.pessoa_organizacao?.[0];
        const telefone = p.forma_contato?.find((c) => c.tipo === "telefone");
        const email = p.forma_contato?.find((c) => c.tipo === "email");
        return (
          <li key={p.id} className="border-border flex items-center gap-1 border-b pr-2">
            <Link href={`/contatos/pessoas/${p.id}`} className="min-w-0 flex-1 px-4 py-3">
              <span className="text-md block truncate font-medium">{p.nome}</span>
              {vinculo?.organizacao && (
                <span className="text-text-muted mt-0.5 block truncate text-sm">
                  {vinculo.organizacao.nome}
                  {vinculo.cargo && ` · ${vinculo.cargo}`}
                </span>
              )}
            </Link>

            {/* Ações diretas: no celular, ligar e escrever são o motivo de
                abrir a agenda de contatos. */}
            <span className="flex shrink-0 gap-1">
              {telefone && (
                <a
                  href={`https://wa.me/${paraWhatsApp(telefone.valor)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp de ${p.nome}`}
                  className="border-border text-success-ink inline-flex size-9 items-center justify-center rounded-md border"
                >
                  <Phone className="size-4" aria-hidden />
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email.valor}`}
                  aria-label={`E-mail de ${p.nome}`}
                  className="border-border text-info-ink inline-flex size-9 items-center justify-center rounded-md border"
                >
                  <Mail className="size-4" aria-hidden />
                </a>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
