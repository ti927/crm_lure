"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Columns3, Calendar, Users, Package, ChartColumn, Bell } from "lucide-react";

/**
 * Menu lateral.
 *
 * D-059 lista seis destinos: Negocios, Atividades, Contatos,
 * Produtos/Servicos, Estatisticas e Configuracoes.
 *
 * Estatisticas estava fora do MVP pela D-093 e voltou em 19/08 por pedido
 * do maestro (D-130), depois que a D-125 tirou o prazo — metade da
 * justificativa da D-093 era o calendario. Configuracoes segue fora
 * (D-096): item de menu que leva a lugar nenhum e defeito, nao
 * antecipacao.
 */
const DESTINOS = [
  { href: "/negocios", rotulo: "Negócios", Icone: Briefcase },
  { href: "/kanban", rotulo: "Kanban", Icone: Columns3 },
  { href: "/atividades", rotulo: "Atividades", Icone: Calendar },
  { href: "/contatos", rotulo: "Contatos", Icone: Users },
  { href: "/produtos", rotulo: "Produtos", Icone: Package },
  { href: "/estatisticas", rotulo: "Estatísticas", Icone: ChartColumn },
];

/**
 * Preferência pessoal, separada das seções de trabalho por uma linha.
 *
 * ⚠️ Não é a tela de Configurações da D-096, que segue fora do MVP: esta
 * ajusta o próprio sino de quem está logado e não administra nada. O
 * Doc 15 §5.2 pede a entrada no menu lateral; o agrupamento à parte é
 * que evita ler "Notificações" como sétima seção do CRM.
 */
const PESSOAIS = [{ href: "/notificacoes", rotulo: "Notificações", Icone: Bell }];

export function Navegacao({ aoNavegar }: { aoNavegar?: () => void } = {}) {
  const caminho = usePathname();

  const item = ({ href, rotulo, Icone }: (typeof DESTINOS)[number]) => {
    const ativo = caminho === href || caminho.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={aoNavegar}
        aria-current={ativo ? "page" : undefined}
        className={`h-control-lg flex items-center gap-2.5 rounded-md px-2.5 text-md transition-colors ${
          ativo
            ? "bg-surface-hover text-text font-semibold"
            : "text-text-secondary hover:bg-surface-hover hover:text-text font-medium"
        }`}
      >
        {/* A faixa amarela marca o item ativo sem depender so da cor do
            texto — o #ffdd00 aqui e fundo, nunca tinta (Doc 08). */}
        <span
          className={`h-5 w-0.5 shrink-0 rounded-pill ${ativo ? "bg-brand" : "bg-transparent"}`}
          aria-hidden
        />
        <Icone className="size-4 shrink-0" aria-hidden />
        {rotulo}
      </Link>
    );
  };

  return (
    <nav aria-label="Seções do sistema" className="flex flex-col gap-0.5 p-2">
      {DESTINOS.map(item)}
      <hr className="border-border my-1.5" />
      {PESSOAIS.map(item)}
    </nav>
  );
}
