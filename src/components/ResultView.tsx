import { useEffect, useState } from "react";
import { track } from "../analytics/tracker";
import type { BreakdownKind, ComparisonResult, PricingResult } from "../engine/types";
import { getModel } from "../engine/models";
import { brl, brl0, num, pct } from "../lib/format";
import { useCountUp } from "../lib/hooks";
import { Button, Chip, Kicker, Reveal } from "./ui";

const KIND_COLOR: Record<BreakdownKind, string> = {
  cost: "bg-gold",
  fee: "bg-plum-3",
  labor: "bg-jade",
  buffer: "bg-lacquer",
};

function PriceBar({
  label,
  value,
  max,
  color,
  note,
  delay,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note?: string;
  delay: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.max(2, (value / max) * 100)), 80 + delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">
          {label} {note && <span className="normal-case tracking-normal">· {note}</span>}
        </span>
        <span className="price-tick font-mono text-xl font-extrabold text-ink">{brl(value)}</span>
      </div>
      <div className="h-7 w-full border-2 border-ink/15 bg-white/60">
        <div className={`bar-anim h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ResultView({
  result,
  comparison,
  onAddToTable,
  onRestart,
}: {
  result: PricingResult;
  comparison: ComparisonResult | null;
  onAddToTable: (item: {
    nome: string;
    duracaoMin: number;
    preco: number;
    origem: "motor" | "manual";
  }) => void;
  onRestart: () => void;
}) {
  const [added, setAdded] = useState(false);
  const animPrice = useCountUp(result.recommendedPrice, 900);
  const model = getModel(result.model);
  const maxBar = Math.max(
    result.recommendedPrice,
    result.minimumPrice,
    comparison?.currentPrice ?? 0,
  );

  useEffect(() => {
    track("result_viewed", { preco: result.recommendedPrice });
    if (comparison) track("price_comparison_viewed", { veredicto: comparison.verdict });
  }, [result, comparison]);

  const verdictCopy =
    comparison?.verdict === "abaixo-do-minimo"
      ? {
          titulo: "Abaixo do piso: cada atendimento paga para trabalhar.",
          texto: `Seu preço atual não cobre nem o mínimo (custos + taxas). A cada ${result.service.nome.toLowerCase()} você perde ${brl(Math.abs(Math.min(0, comparison.currentNetPerService)))} antes mesmo do seu salário entrar na conta.`,
        }
      : comparison?.verdict === "abaixo-do-ideal"
        ? {
            titulo: "Dá para pagar as contas — mas não a sua meta.",
            texto: `Seu preço cobre o piso, mas está ${brl(comparison.delta)} abaixo do recomendado. No fim do mês, isso vira ${brl(Math.max(0, comparison.monthlyNetAtCurrent < result.monthly.targetIncome ? result.monthly.targetIncome - comparison.monthlyNetAtCurrent : 0))} a menos no seu bolso.`,
          }
        : comparison
          ? {
              titulo: "Seu preço está acima do recomendado. 👏",
              texto: `Você cobra ${brl(Math.abs(comparison.delta))} além do necessário para bater a meta — excelente posicionamento. Guarde essa folga para meses fracos.`,
            }
          : null;

  return (
    <section className="halftone-light relative py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        {/* Cabeçalho do resultado */}
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
          <Reveal>
            <Kicker>Resultado · {result.service.nome}</Kicker>
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-ink-soft uppercase">
              Preço recomendado pelo motor
            </p>
            <p className="price-tick mt-2 font-mono text-7xl font-extrabold tracking-tight text-lacquer sm:text-8xl">
              {brl(Math.round(animPrice * 100) / 100)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip tone="gold">piso mínimo {brl(result.minimumPrice)}</Chip>
              <Chip tone="jade">líquido {brl(result.netPerService)}/serviço</Chip>
              <Chip tone="ink">{result.service.duracaoMin} min</Chip>
              {result.rounding === "charm" && <Chip tone="lacquer">arredondamento R$ X,90</Chip>}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="border-2 border-ink bg-ink p-6 text-paper shadow-[8px_8px_0_0_var(--color-gold)]">
              <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
                Sua agenda falando
              </p>
              <dl className="price-tick mt-4 grid grid-cols-2 gap-x-6 gap-y-4 font-mono">
                <div>
                  <dt className="text-xs text-paper/60">Valor/hora líquido</dt>
                  <dd className="text-2xl font-extrabold text-jade">
                    {brl(result.rates.netHourRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-paper/60">Hora cheia (custos+meta)</dt>
                  <dd className="text-2xl font-extrabold">{brl(result.rates.fullHourRate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-paper/60">Ponto de equilíbrio</dt>
                  <dd className="text-2xl font-extrabold text-gold">
                    {result.monthly.breakEvenUnits ?? "—"}
                    <span className="text-xs font-semibold text-paper/50"> serviços/mês</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-paper/60">Para bater a meta</dt>
                  <dd className="text-2xl font-extrabold text-gold">
                    {result.monthly.servicesToGoal ?? "—"}
                    <span className="text-xs font-semibold text-paper/50">
                      {" "}
                      de {result.monthly.capacityServices} possíveis
                    </span>
                  </dd>
                </div>
              </dl>
              {result.warnings.map((w) => (
                <p
                  key={w.code}
                  className="mt-5 border-2 border-gold bg-gold/15 p-3.5 text-sm font-semibold text-gold"
                >
                  ⚠ {w.message}
                </p>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Comparativo de preços */}
        <Reveal delay={100}>
          <div className="mt-16">
            <h2 className="mb-6 font-display text-2xl sm:text-3xl">Onde seu preço está</h2>
            <div className="space-y-6 border-2 border-ink bg-white/60 p-7">
              {comparison && (
                <PriceBar
                  label="Seu preço atual"
                  value={comparison.currentPrice}
                  max={maxBar}
                  color={
                    comparison.verdict === "abaixo-do-minimo" ? "bg-lacquer" : "bg-ink/45"
                  }
                  delay={0}
                />
              )}
              <PriceBar
                label="Piso mínimo"
                value={result.minimumPrice}
                max={maxBar}
                color="bg-gold"
                note="abaixo disso é prejuízo"
                delay={120}
              />
              <PriceBar
                label="Recomendado pelo motor"
                value={result.recommendedPrice}
                max={maxBar}
                color="bg-lacquer"
                note="custos + salário + meta + margem"
                delay={240}
              />
              {verdictCopy && comparison && (
                <div
                  className={`mt-2 border-l-4 p-4 ${
                    comparison.verdict === "acima-do-recomendado"
                      ? "border-jade bg-jade/10"
                      : "border-lacquer bg-lacquer/5"
                  }`}
                >
                  <p className="font-bold text-ink">{verdictCopy.titulo}</p>
                  <p className="mt-1 text-sm text-ink-soft">{verdictCopy.texto}</p>
                </div>
              )}
              {comparison && (
                <div className="price-tick grid gap-4 border-t-2 border-dashed border-ink/15 pt-5 font-mono text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-ink-soft uppercase">Diferença p/ o recomendado</p>
                    <p
                      className={`text-lg font-extrabold ${
                        comparison.delta > 0 ? "text-lacquer" : "text-jade"
                      }`}
                    >
                      {comparison.delta > 0 ? "+" : ""}
                      {brl(comparison.delta)} ({num(Math.abs(comparison.deltaPct))}
                      {comparison.delta > 0 ? "% pra cima" : "% acima"})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft uppercase">Líquido hoje, por serviço</p>
                    <p
                      className={`text-lg font-extrabold ${
                        comparison.currentNetPerService < 0 ? "text-lacquer" : "text-ink"
                      }`}
                    >
                      {brl(comparison.currentNetPerService)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft uppercase">Salário mensal no preço atual</p>
                    <p className="text-lg font-extrabold text-ink">
                      {brl(comparison.monthlyNetAtCurrent)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Para onde vai cada real */}
        <Reveal delay={80}>
          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="mb-6 font-display text-2xl sm:text-3xl">Para onde vai cada real</h2>
              <div className="flex h-10 w-full overflow-hidden border-2 border-ink">
                {result.breakdown.map((line) => (
                  <div
                    key={line.id}
                    className={`bar-anim h-full ${KIND_COLOR[line.kind]}`}
                    style={{ width: `${(line.value / result.recommendedPrice) * 100}%` }}
                    title={`${line.label}: ${brl(line.value)}`}
                  />
                ))}
              </div>
              <ul className="mt-5 space-y-2.5">
                {result.breakdown.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center justify-between gap-3 border-b border-ink/10 pb-2.5"
                  >
                    <span className="flex items-center gap-2.5 text-sm text-ink">
                      <i className={`h-3 w-3 ${KIND_COLOR[line.kind]}`} />
                      {line.label}
                    </span>
                    <span className="price-tick font-mono text-sm font-bold">
                      {brl(line.value)}
                      <span className="ml-2 text-xs font-semibold text-ink-soft">
                        {pct((line.value / result.recommendedPrice) * 100, 0)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Auditoria do cálculo */}
            <div className="border-2 border-ink bg-plum p-7 text-paper shadow-[8px_8px_0_0_rgba(200,16,70,0.4)]">
              <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
                Como o motor calculou — auditoria
              </p>
              <p className="mt-2 font-mono text-xs text-paper/60">{model.label}</p>
              <dl className="price-tick mt-5 space-y-3 font-mono text-sm">
                <div className="border-b border-paper/15 pb-3">
                  <dt className="text-paper/60">1 · Hora cheia: (fixos + meta) ÷ horas produtivas</dt>
                  <dd className="mt-1 text-gold">
                    ({brl0(result.monthly.fixedMonthlyCost)} + {brl0(result.monthly.targetIncome)}) ÷{" "}
                    {num(result.monthly.productiveHours)}h = {brl(result.rates.fullHourRate)}/h
                  </dd>
                </div>
                <div className="border-b border-paper/15 pb-3">
                  <dt className="text-paper/60">2 · Base do serviço: hora cheia × duração + material + taxa fixa</dt>
                  <dd className="mt-1 text-gold">
                    {brl(result.rates.fullHourRate)} × {num(result.service.duracaoMin / 60)}h +{" "}
                    {brl(result.costMaterial)} + {brl(result.feeFixed)}
                  </dd>
                </div>
                <div className="border-b border-paper/15 pb-3">
                  <dt className="text-paper/60">3 · Preço bruto: base ÷ (1 − taxas% − margem%)</dt>
                  <dd className="mt-1 text-gold">
                    ÷ (1 − {num(result.feePct + (result.buffer / result.recommendedPrice) * 100)}
                    %) → dedução de {num(result.feePct)}% taxas + margem
                  </dd>
                </div>
                <div>
                  <dt className="text-paper/60">
                    4 · Arredondamento do nicho ({result.rounding === "charm" ? "R$ X,90" : result.rounding})
                  </dt>
                  <dd className="mt-1 text-2xl font-extrabold text-paper">
                    = {brl(result.recommendedPrice)}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-relaxed text-paper/55">
                Mesma entrada, mesmo resultado — sempre. A fórmula completa e as premissas
                estão na página de método. Conceitos separados: custo ≠ salário ≠ margem ≠
                faturamento.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Ações */}
        <Reveal delay={60}>
          <div className="mt-16 flex flex-wrap items-center gap-4">
            <Button
              onClick={() => {
                onAddToTable({
                  nome: result.service.nome,
                  duracaoMin: result.service.duracaoMin,
                  preco: result.recommendedPrice,
                  origem: "motor",
                });
                setAdded(true);
              }}
              disabled={added}
              className="disabled:opacity-60"
            >
              {added ? "✓ Na sua tabela" : "Adicionar à tabela de preços"}
            </Button>
            <Button variant="outline" onClick={onRestart}>
              ← Calcular outro serviço
            </Button>
            <a
              href="#/tabela"
              className="focus-ring font-mono text-sm font-bold text-lacquer underline decoration-2 underline-offset-4 hover:text-lacquer-deep"
            >
              Ver tabela de preços →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
