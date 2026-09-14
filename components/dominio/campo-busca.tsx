"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Piso de letras para disparar uma busca no servidor.
 *
 * ⚠️ Uma letra não é uma pergunta. Na base real "a" casa com **3.980
 * pessoas e 2.274 organizações** — quase tudo. Essa busca custa uma ida
 * ao banco, uma navegação inteira e um resultado que não ajuda ninguém a
 * achar nada. Duas letras já recortam.
 */
export const MINIMO_BUSCA = 2;

/**
 * Campo de busca que filtra enquanto se digita.
 *
 * ⚠️ **O CAMPO NÃO DEPENDE DA REDE. SÓ O RESULTADO DEPENDE.** Esta é a
 * regra inteira deste componente, e foi ela que a versão anterior
 * quebrou: ela ressincronizava o texto digitado com o valor que voltava
 * da URL, e a URL é o que a busca de 350 ms atrás escreveu. Quem
 * continuava digitando durante a navegação via as letras seguintes serem
 * **engolidas** no instante em que a resposta chegava — quanto mais
 * lenta a rede, mais letras sumiam.
 *
 * A correção é saber distinguir o **eco da própria busca** de uma
 * mudança vinda de fora. `enviado` guarda o último termo que ESTE campo
 * mandou buscar: se a URL chega com ele, é o eco e não se toca no texto;
 * se chega com outra coisa (voltar do navegador, "Limpar", troca de
 * aba), aí sim o campo adota o que veio.
 *
 * ⚠️ `aoBuscar` vive num ref e NÃO entra nas dependências do efeito. Os
 * chamadores passam função inline (`(t) => aplicar("busca", t)`), que
 * muda de identidade a cada render do pai — dentro das dependências,
 * cada render do pai reiniciaria o temporizador, e numa tela que
 * re-renderiza sozinha a busca nunca dispararia.
 *
 * A tecla `/` põe o foco aqui de qualquer lugar da tela. `Esc` limpa.
 */
export function CampoBusca({
  valor,
  aoBuscar,
  placeholder,
  className = "",
  minimo = MINIMO_BUSCA,
  espera = 300,
}: {
  valor: string;
  aoBuscar: (termo: string) => void;
  placeholder: string;
  className?: string;
  /** Letras necessárias para buscar. Use 1 onde o filtro é em memória. */
  minimo?: number;
  /** Pausa na digitação antes de pedir o resultado, em ms. */
  espera?: number;
}) {
  const [texto, setTexto] = useState(valor);
  const campo = useRef<HTMLInputElement>(null);

  /**
   * O último termo que este campo mandou buscar — o que identifica o eco.
   *
   * ⚠️ É ESTADO, e não `useRef`, porque ele participa da decisão tomada
   * durante o render logo abaixo. Ref lido no render é justamente o que
   * o `react-hooks/refs` proíbe, e com razão: o valor de um ref não
   * agenda renderização, então a comparação poderia ser feita contra
   * algo que a tela ainda não viu.
   */
  const [enviado, setEnviado] = useState(valor);

  /* ⚠️ A função do chamador vive num ref e NÃO entra nas dependências do
     efeito — ver a nota do componente. O ref é escrito DENTRO de um
     efeito, nunca no render. */
  const aoBuscarRef = useRef(aoBuscar);
  useEffect(() => {
    aoBuscarRef.current = aoBuscar;
  });

  /* Ajustado durante o render, e não por efeito: é o padrão que o React
     recomenda para estado que acompanha uma prop, e evita o repique de
     uma renderização extra. */
  const [urlAnterior, setUrlAnterior] = useState(valor);
  if (valor !== urlAnterior) {
    setUrlAnterior(valor);
    // ⚠️ SÓ adota o valor da URL quando ele NÃO é o eco da própria busca.
    // Sem esta condição, o campo apaga o que foi digitado durante a
    // navegação — era o defeito das letras comidas.
    if (valor !== enviado) {
      setEnviado(valor);
      setTexto(valor);
    }
  }

  useEffect(() => {
    const t = texto.trim();
    // Abaixo do piso o termo vira vazio: encurtar a busca desfaz o
    // filtro, em vez de deixar na tela um recorte que o campo já não
    // descreve.
    const alvo = t.length >= minimo ? t : "";
    if (alvo === enviado) return;

    const id = setTimeout(() => {
      setEnviado(alvo);
      aoBuscarRef.current(alvo);
    }, espera);
    return () => clearTimeout(id);
  }, [texto, enviado, minimo, espera]);

  // Atalho `/` — ignorado quando já se está digitando em outro campo.
  useEffect(() => {
    function naTecla(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === "INPUT" ||
        alvo?.tagName === "TEXTAREA" ||
        alvo?.tagName === "SELECT" ||
        alvo?.isContentEditable;
      if (digitando) return;
      e.preventDefault();
      campo.current?.focus();
    }
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, []);

  const curto = texto.trim().length > 0 && texto.trim().length < minimo;

  return (
    <div className={`relative ${className}`}>
      <Search
        className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
        aria-hidden
      />
      <input
        ref={campo}
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && texto) {
            e.preventDefault();
            setTexto("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        // `off` nos três: o histórico do navegador e o corretor do celular
        // competiam com a lista de resultados, cobrindo-a.
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-control-md bg-surface border-border text-md w-full rounded-md border pl-8 pr-8"
      />
      {texto && (
        <button
          type="button"
          onClick={() => {
            setTexto("");
            campo.current?.focus();
          }}
          aria-label="Limpar busca"
          className="text-text-muted hover:text-text absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}

      {/* Sem isto, uma letra só pareceria uma busca que não devolve nada
          — dizer por que é o que separa "está esperando" de "quebrou". */}
      {curto && (
        <p
          role="status"
          className="text-text-muted absolute left-0 top-full z-10 mt-1 text-2xs"
        >
          Digite {minimo} letras para buscar.
        </p>
      )}
    </div>
  );
}
