"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, X } from "lucide-react";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { useAviso } from "@/components/dominio/avisos";
import { local } from "@/lib/formato";
import { SeletorAsync, type ItemBusca } from "@/app/(sistema)/contatos/seletor-async";
import {
  buscarOrganizacoes,
  criarOrganizacao,
  type Homonima,
} from "@/app/(sistema)/contatos/acoes";
import { criarNegocio, type DadosNegocio } from "./acoes";

type Opcao = { id: string; nome: string };
type Etapa = { id: string; nome: string; ordem: number };

/**
 * Criar negócio.
 *
 * ⚠️ Só o título e a organização são obrigatórios (D-023). Todo o resto
 * é opcional — inclusive o valor, porque em Cold Lead ninguém sabe ainda.
 *
 * ⚠️ Nenhuma etapa exige desfecho na criação (D-145, revoga a
 * D-047). O bloco de Ganho/Perdido que este formulário revelava ao
 * escolher "Aguardando Contrato" saiu junto — ver a nota no corpo.
 */
export function DialogoNegocio({
  etapas,
  usuarios,
  origens,
  produtos,
  responsavelPadrao,
  organizacaoFixa,
  aoFechar,
}: {
  etapas: Etapa[];
  usuarios: Opcao[];
  origens: Opcao[];
  produtos: Opcao[];
  responsavelPadrao?: string | null;
  /**
   * Organização já decidida, quando o diálogo abre de DENTRO da ficha
   * dela. Aqui o campo deixa de ser pergunta: quem clicou em "Novo
   * negócio" na ficha da "Sementes Veneza" já disse de quem é o negócio,
   * e reabrir a busca convidaria a escolher a organização errada — numa
   * base em que 41% dos nomes se repetem, esse erro é barato de cometer.
   */
  organizacaoFixa?: { id: string; nome: string } | null;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();

  const [titulo, setTitulo] = useState("");
  const [organizacao, setOrganizacao] = useState<ItemBusca | null>(
    organizacaoFixa ? { id: organizacaoFixa.id, nome: organizacaoFixa.nome } : null
  );
  // A primeira etapa da ordem é Cold Lead: é onde todo contato novo
  // nasce, e é o caminho que precisa ser o mais curto.
  const [etapaId, setEtapaId] = useState(etapas[0]?.id ?? "");
  const [valor, setValor] = useState("");
  const [responsavelId, setResponsavelId] = useState(responsavelPadrao ?? "");
  const [origemId, setOrigemId] = useState("");
  const [produtoId, setProdutoId] = useState("");


  const [salvando, setSalvando] = useState(false);
  const [criandoOrg, setCriandoOrg] = useState(false);
  /** Cadastros de mesmo nome achados ao tentar criar — ver `criarOrgComNome`. */
  const [orgsHomonimas, setOrgsHomonimas] = useState<Homonima[] | null>(null);
  /**
   * ⚠️ O nome como a pessoa DIGITOU. "Criar mesmo assim" tem que criar o
   * que ela escreveu — o cadastro homônimo pode diferir em acento ou
   * caixa, e é exatamente por isso que ele casou com o dela.
   */
  const [nomeTentado, setNomeTentado] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  /**
   * ⚠️ D-145 revogou a D-047: criar não exige desfecho em etapa nenhuma.
   *
   * O bloco de Ganho/Perdido que existia aqui saiu junto. Marcar o
   * resultado passou a ser ato da ficha do negócio, pelos botões do topo
   * — e faz sentido que seja: um negócio que nasce já fechado é caso
   * raro, e o formulário de criação não precisa carregar a exceção.
   */
  const podeSalvar =
    titulo.trim() !== "" && organizacao !== null && etapaId !== "";

  /**
   * Organização nova sem sair daqui. No Pipedrive é assim: digita-se o
   * nome do cliente novo e ele passa a existir. Obrigar a ir até
   * Contatos, cadastrar e voltar quebraria justamente o fluxo que este
   * diálogo veio consertar — registrar um lead que acabou de ligar.
   */
  async function criarOrgComNome(nome: string, confirmado = false) {
    setCriandoOrg(true);
    const r = await criarOrganizacao(
      { nome, cidade: "", uf: "", endereco: "", website: "", bubbleId: "" },
      { confirmado }
    );
    setCriandoOrg(false);
    if (r?.erro) return setErro(r.erro);

    /**
     * ⚠️ A ação recusa a primeira tentativa quando já existe cadastro de
     * mesmo nome. ESTE é o caminho apressado — quem está registrando um
     * lead que acabou de ligar — e por isso é onde a duplicata nasce.
     * Aqui o aviso não vira diálogo dentro de diálogo: ele OFERECE a
     * organização que já existe, porque em nove de cada dez vezes é
     * exatamente ela que a pessoa queria.
     */
    const achadas = (r as { duplicadas?: Homonima[] }).duplicadas;
    if (achadas?.length) {
      setNomeTentado(nome);
      return setOrgsHomonimas(achadas);
    }

    const id = (r as { id?: string }).id;
    if (id) {
      setOrganizacao({ id, nome });
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

    // Sem desfecho: o status vem de `etapa.status_inicial` (D-045).
    const r = await criarNegocio(dados);
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
                {/* Sem o X quando a organização veio da ficha: ali ela não
                    é escolha, é o contexto de onde o clique partiu. */}
                {!organizacaoFixa && (
                  <button
                    type="button"
                    onClick={() => setOrganizacao(null)}
                    aria-label="Trocar organização"
                    className="hover:bg-surface-hover shrink-0 rounded p-1 opacity-60 hover:opacity-100"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
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

                {orgsHomonimas && orgsHomonimas.length > 0 && (
                  <div
                    role="alert"
                    className="border-warning bg-warning-bg mt-2 rounded-md border p-2.5"
                  >
                    <p className="text-sm font-semibold">
                      {orgsHomonimas.length === 1
                        ? "Esta organização já existe."
                        : `Já existem ${orgsHomonimas.length} com este nome.`}
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {orgsHomonimas.map((o) => (
                        <li key={o.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setOrganizacao({ id: o.id, nome: o.nome });
                              setOrgsHomonimas(null);
                            }}
                            className="hover:bg-surface-hover flex w-full min-w-0 items-baseline gap-2 rounded px-1.5 py-1 text-left"
                          >
                            <span className="text-md min-w-0 flex-1 truncate font-medium">
                              {o.nome}
                            </span>
                            <span className="text-text-muted shrink-0 text-xs">
                              {local(o.cidade, o.uf) || "usar esta"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        setOrgsHomonimas(null);
                        void criarOrgComNome(nomeTentado, true);
                      }}
                      className="text-text-secondary hover:text-text mt-1.5 px-1.5 text-xs underline"
                    >
                      Criar outra com o mesmo nome
                    </button>
                  </div>
                )}
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
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-4 text-md font-semibold disabled:opacity-40"
          >
            {salvando ? "Criando…" : "Criar negócio"}
          </button>
        </div>
      </div>
    </div>
  );
}
