"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Trophy, X, XCircle } from "lucide-react";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { useAviso } from "@/components/dominio/avisos";
import { SeletorAsync, type ItemBusca } from "@/app/(sistema)/contatos/seletor-async";
import { buscarOrganizacoes, criarOrganizacao } from "@/app/(sistema)/contatos/acoes";
import { ETAPA_DE_DESFECHO, type Desfecho } from "@/app/(sistema)/kanban/constantes";
import { criarNegocio, type DadosNegocio } from "./acoes";

type Opcao = { id: string; nome: string };
type Etapa = { id: string; nome: string; ordem: number };

/**
 * Criar negócio.
 *
 * ⚠️ Só o título e a organização são obrigatórios (D-023). Todo o resto
 * é opcional — inclusive o valor, porque em Cold Lead ninguém sabe ainda.
 *
 * ⚠️ A trava de desfecho (D-047) vale aqui: escolher "Aguardando
 * Contrato" revela Ganho/Perdido no próprio formulário, em vez de abrir
 * um segundo diálogo por cima do primeiro. É a mesma obrigação — e a
 * server action recusa a criação sem desfecho de qualquer jeito, porque
 * formulário se contorna.
 */
export function DialogoNegocio({ etapas, usuarios, origens, produtos, motivos, responsavelPadrao, aoFechar }: {
  etapas: Etapa[];
  usuarios: Opcao[];
  origens: Opcao[];
  produtos: Opcao[];
  motivos: Opcao[];
  responsavelPadrao?: string | null;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();

  const [titulo, setTitulo] = useState("");
  const [organizacao, setOrganizacao] = useState<ItemBusca | null>(null);
  // A primeira etapa da ordem é Cold Lead: é onde todo contato novo
  // nasce, e é o caminho que precisa ser o mais curto.
  const [etapaId, setEtapaId] = useState(etapas[0]?.id ?? "");
  const [valor, setValor] = useState("");
  const [responsavelId, setResponsavelId] = useState(responsavelPadrao ?? "");
  const [origemId, setOrigemId] = useState("");
  const [produtoId, setProdutoId] = useState("");

  const [escolha, setEscolha] = useState<"ganho" | "perdido" | null>(null);
  const [motivoId, setMotivoId] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [criandoOrg, setCriandoOrg] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  const etapa = etapas.find((e) => e.id === etapaId);
  const exigeDesfecho = etapa?.nome === ETAPA_DE_DESFECHO;

  const desfechoResolvido =
    !exigeDesfecho || escolha === "ganho" || (escolha === "perdido" && motivoId);

  const podeSalvar =
    titulo.trim() !== "" && organizacao !== null && etapaId !== "" && desfechoResolvido;

  /**
   * Organização nova sem sair daqui. No Pipedrive é assim: digita-se o
   * nome do cliente novo e ele passa a existir. Obrigar a ir até
   * Contatos, cadastrar e voltar quebraria justamente o fluxo que este
   * diálogo veio consertar — registrar um lead que acabou de ligar.
   */
  async function criarOrgComNome(nome: string) {
    setCriandoOrg(true);
    const r = await criarOrganizacao({ nome, cidade: "", website: "", bubbleId: "" });
    setCriandoOrg(false);
    if (r?.erro) return setErro(r.erro);
    if (r.id) {
      setOrganizacao({ id: r.id, nome });
      avisar(`Organização "${nome}" criada.`);
    }
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const dados: DadosNegocio = {
      titulo,
      organizacaoId: organizacao?.id ?? "",
      etapaId,
      valor,
      responsavelId,
      origemId,
      produtoId,
    };

    const desfecho: Desfecho | undefined = !exigeDesfecho
      ? undefined
      : escolha === "perdido"
        ? { status: "perdido", motivoId }
        : { status: "ganho" };

    const r = await criarNegocio(dados, desfecho);
    setSalvando(false);

    if (r?.erro) return setErro(r.erro);

    avisar("Negócio criado.");
    aoFechar();
    // Abre a ficha do que acabou de nascer, como o Pipedrive faz: quem
    // cadastra costuma querer completar o registro em seguida.
    if (r.id) router.push(`/negocios/${r.id}`);
    else router.refresh();
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5";
  const botaoDesfecho =
    "flex flex-1 items-center justify-center gap-2 rounded-md border py-2 text-md font-medium";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        ref={caixaDialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novo-negocio"
        className="border-border bg-surface my-8 w-full max-w-lg rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-novo-negocio" className="text-lg font-semibold">
          Novo negócio
        </h2>
        <p className="text-text-muted mt-1 text-sm">
          Título e organização são obrigatórios. O resto pode entrar depois.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="neg-titulo" className={rotulo}>
              Título <span className="text-danger-ink">*</span>
            </label>
            <input
              id="neg-titulo"
              type="text"
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Gestão da Estratégia"
              className={campo}
            />
          </div>

          <div>
            <span className={rotulo}>
              Organização <span className="text-danger-ink">*</span>
            </span>

            {organizacao ? (
              <div className="border-border bg-surface-sunken flex h-control-md items-center gap-2 rounded-md border px-2.5">
                <Building2 className="text-text-muted size-4 shrink-0" aria-hidden />
                <span className="text-md min-w-0 flex-1 truncate">{organizacao.nome}</span>
                <button
                  type="button"
                  onClick={() => setOrganizacao(null)}
                  aria-label="Trocar organização"
                  className="hover:bg-surface-hover shrink-0 rounded p-1 opacity-60 hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            ) : (
              <>
                <SeletorAsync
                  buscar={buscarOrganizacoes}
                  aoEscolher={(o) => setOrganizacao(o)}
                  placeholder="Buscar organização…"
                  aoCriar={(nome) => void criarOrgComNome(nome)}
                  rotuloCriar={(nome) => `Criar organização "${nome}"`}
                />
                <p className="text-text-muted mt-1 text-xs">
                  {criandoOrg
                    ? "Criando organização…"
                    : "Procure antes de criar — 41% dos cadastros da base já são nome repetido."}
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="neg-etapa" className={rotulo}>
                Etapa <span className="text-danger-ink">*</span>
              </label>
              <select
                id="neg-etapa"
                value={etapaId}
                onChange={(e) => setEtapaId(e.target.value)}
                className={campo}
              >
                {etapas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="neg-valor" className={rotulo}>
                Valor
              </label>
              <input
                id="neg-valor"
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className={`${campo} tabular`}
              />
            </div>

            <div>
              <label htmlFor="neg-responsavel" className={rotulo}>
                Responsável
              </label>
              <select
                id="neg-responsavel"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className={campo}
              >
                <option value="">—</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="neg-origem" className={rotulo}>
                Origem
              </label>
              <select
                id="neg-origem"
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
                className={campo}
              >
                <option value="">—</option>
                {origens.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="neg-produto" className={rotulo}>
                Produto
              </label>
              <select
                id="neg-produto"
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className={campo}
              >
                <option value="">—</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ⚠️ A trava (D-047). Nascer na etapa final exige desfecho —
              a mesma obrigação de mover para ela. */}
          {exigeDesfecho && (
            <div className="border-border bg-surface-sunken rounded-md border p-3">
              <p className="text-md font-medium">
                {ETAPA_DE_DESFECHO} exige declarar o desfecho
              </p>
              <p className="text-text-muted mt-0.5 text-sm">
                O negócio não é criado sem isto.
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEscolha("ganho")}
                  aria-pressed={escolha === "ganho"}
                  className={`${botaoDesfecho} ${
                    escolha === "ganho"
                      ? "border-success bg-success-bg text-success-ink"
                      : "border-border bg-surface hover:bg-surface-hover"
                  }`}
                >
                  <Trophy className="size-4" aria-hidden />
                  Ganho
                </button>
                <button
                  type="button"
                  onClick={() => setEscolha("perdido")}
                  aria-pressed={escolha === "perdido"}
                  className={`${botaoDesfecho} ${
                    escolha === "perdido"
                      ? "border-danger bg-danger-bg text-danger-ink"
                      : "border-border bg-surface hover:bg-surface-hover"
                  }`}
                >
                  <XCircle className="size-4" aria-hidden />
                  Perdido
                </button>
              </div>

              {escolha === "perdido" && (
                <div className="mt-3">
                  <label htmlFor="neg-motivo" className={rotulo}>
                    Motivo da perda <span className="text-danger-ink">*</span>
                  </label>
                  <select
                    id="neg-motivo"
                    value={motivoId}
                    onChange={(e) => setMotivoId(e.target.value)}
                    className={campo}
                  >
                    <option value="">Escolha um motivo…</option>
                    {motivos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                  <p className="text-text-muted mt-1 text-sm">
                    Obrigatório — é a informação que não dá para recuperar depois.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {erro && (
          <p role="alert" className="text-danger-ink mt-3 text-sm">
            {erro}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={aoFechar}
            className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando || !podeSalvar}
            className="h-control-md bg-brand text-brand-on rounded-md px-4 text-md font-semibold disabled:opacity-40"
          >
            {salvando ? "Criando…" : "Criar negócio"}
          </button>
        </div>
      </div>
    </div>
  );
}
