import { Construction } from "lucide-react";

/**
 * Marcador das telas do MVP que ainda nao foram construidas.
 *
 * Existe para que o menu nao leve a 404: as quatro secoes de D-059 que
 * entram no MVP aparecem desde ja, e a que ainda nao existe diz que nao
 * existe. Sai quando a fase correspondente do Doc 10 for feita.
 */
export function EmConstrucao({
  titulo,
  fase,
  descricao,
}: {
  titulo: string;
  fase: string;
  descricao: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-sm text-center">
          <Construction
            className="text-text-muted mx-auto mb-3 size-6"
            aria-hidden
          />
          <p className="text-text-secondary text-md font-medium">
            Tela ainda não construída — {fase}.
          </p>
          <p className="text-text-muted mt-1 text-sm">{descricao}</p>
        </div>
      </div>
    </div>
  );
}
