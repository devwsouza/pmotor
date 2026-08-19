import { useEffect, useState } from "react";
import { track } from "../analytics/tracker";
import type { PriceTableItem } from "../engine/types";
import { brl } from "../lib/format";
import { Button, Chip, Kicker, NumberField, Reveal } from "./ui";

export function PriceTablePage({
  items,
  onUpdate,
  onRemove,
  onNavigate,
}: {
  items: readonly PriceTableItem[];
  onUpdate: (id: string, patch: Partial<Omit<PriceTableItem, "id" | "createdAt">>) => void;
  onRemove: (id: string) => void;
  onNavigate: (r: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (items.length > 0) setCopied(false);
  }, [items.length]);

  const sorted = [...items].sort((a, b) => a.preco - b.preco);

  const copyTable = async () => {
    const lines = [
      "✦ TABELA DE PREÇOS ✦",
      ...sorted.map((i) => `• ${i.nome} — ${brl(i.preco)} (${i.duracaoMin} min)`),
      "",
      "valores calculados com o PreçoPro Nails",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      track("table_copied", { itens: sorted.length });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="halftone-light relative min-h-screen py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <Kicker>Tabela de preços</Kicker>
          <h1 className="font-display text-4xl leading-[1.02] sm:text-5xl">
            Seu cardápio, <span className="text-lacquer">de pé no chão.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Cada cálculo do motor vira uma linha aqui. Edite o que quiser, copie e mande no
            WhatsApp — ou cole no seu Instagram.
          </p>
        </Reveal>

        {items.length === 0 ? (
          <Reveal delay={120}>
            <div className="mt-12 border-2 border-dashed border-ink/30 bg-white/50 p-12 text-center">
              <p className="font-display text-2xl text-ink">A tabela está vazia.</p>
              <p className="mx-auto mt-2 max-w-md text-ink-soft">
                Calcule um serviço e clique em <strong>“Adicionar à tabela de preços”</strong>{" "}
                no resultado. Em minutos você monta o cardápio completo.
              </p>
              <Button className="mt-7" onClick={() => onNavigate("calculadora")}>
                Calcular o primeiro serviço →
              </Button>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={120}>
            <div className="mt-12 border-2 border-ink bg-white/70 shadow-[10px_10px_0_0_rgba(35,18,29,0.14)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-ink px-6 py-4 text-paper">
                <p className="font-mono text-xs font-bold tracking-[0.2em] uppercase">
                  {items.length} {items.length === 1 ? "serviço" : "serviços"} · salvo neste
                  navegador
                </p>
                <div className="flex gap-2">
                  <Chip tone="gold">média {brl(sorted.reduce((s, i) => s + i.preco, 0) / sorted.length)}</Chip>
                </div>
              </div>

              <ul className="divide-y-2 divide-ink/10">
                {sorted.map((item, idx) => (
                  <li
                    key={item.id}
                    className="group grid grid-cols-[2rem_1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-blush/50 sm:grid-cols-[2.2rem_1fr_6rem_7rem_2.5rem]"
                  >
                    <span className="font-mono text-sm font-extrabold text-lacquer/60">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <input
                        value={item.nome}
                        onChange={(e) => onUpdate(item.id, { nome: e.target.value })}
                        className="focus-ring w-full border-2 border-transparent bg-transparent px-1 py-0.5 font-semibold text-ink transition-colors hover:border-ink/20 focus:border-lacquer"
                        aria-label="Nome do serviço"
                      />
                      <p className="mt-0.5 flex items-center gap-2 px-1 font-mono text-[11px] text-ink-soft">
                        {item.duracaoMin} min
                        <Chip tone={item.origem === "motor" ? "jade" : "ink"}>
                          {item.origem === "motor" ? "via motor" : "manual"}
                        </Chip>
                      </p>
                    </div>
                    <span className="hidden font-mono text-xs text-ink-soft sm:block">
                      {item.duracaoMin} min
                    </span>
                    <div className="w-32 sm:w-36">
                      <NumberField
                        compact
                        value={item.preco}
                        onValue={(v) => onUpdate(item.id, { preco: v ?? 0 })}
                        prefix="R$"
                      />
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="focus-ring justify-self-end cursor-pointer border-2 border-transparent px-2 py-1 font-mono text-lg text-ink-soft transition-all hover:border-lacquer hover:bg-lacquer hover:text-paper"
                      aria-label={`Remover ${item.nome}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink bg-blush/60 px-6 py-5">
                <p className="font-mono text-xs text-ink-soft">
                  Dica: preços são hipóteses — revise a cada 3–6 meses ou quando seus custos
                  mudarem.
                </p>
                <div className="flex gap-3">
                  <Button variant="dark" onClick={() => onNavigate("calculadora")}>
                    + Calcular outro
                  </Button>
                  <Button onClick={copyTable}>{copied ? "✓ Copiada!" : "Copiar p/ WhatsApp"}</Button>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        <Reveal delay={200}>
          <p className="mt-8 max-w-xl font-mono text-xs leading-relaxed text-ink-soft">
            LGPD na prática: sua tabela vive no localStorage do seu navegador. Sem conta, sem
            nuvem, sem terceiros — limpe quando quiser.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
