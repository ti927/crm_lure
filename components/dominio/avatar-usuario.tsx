/**
 * Avatar do usuario.
 *
 * A foto veio do Pipedrive e esta servida do nosso lado, em
 * public/usuarios/ — as URLs originais morrem com o contrato em 3/9.
 * Quem nao tem foto ganha as iniciais, que e o caso do Julio e de
 * qualquer pessoa que entre pelo Google sem imagem.
 */

const TAMANHOS = {
  sm: "size-5 text-[10px]",
  md: "size-6 text-[11px]",
  lg: "size-8 text-xs",
} as const;

/** Duas iniciais: primeiro e ultimo nome. "Daniela" vira "D". */
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function AvatarUsuario({
  nome,
  foto,
  tamanho = "md",
}: {
  nome: string;
  foto?: string | null;
  tamanho?: keyof typeof TAMANHOS;
}) {
  const classe = `${TAMANHOS[tamanho]} shrink-0 rounded-full object-cover`;

  if (foto) {
    // Imagem local de 120x120 servida de public/: passar pelo otimizador
    // do Next custaria uma funcao por avatar sem ganho nenhum.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={foto} alt="" aria-hidden className={classe} />
    );
  }

  return (
    <span
      aria-hidden
      className={`${classe} bg-surface-hover text-text-secondary border-border inline-flex items-center justify-center border font-semibold`}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Avatar + nome, o par que aparece na tabela e no seletor. */
export function UsuarioComFoto({
  nome,
  foto,
  tamanho = "md",
}: {
  nome: string;
  foto?: string | null;
  tamanho?: keyof typeof TAMANHOS;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AvatarUsuario nome={nome} foto={foto} tamanho={tamanho} />
      <span className="truncate">{nome}</span>
    </span>
  );
}
