import { useEffect, useMemo, useState } from "react";
import { track } from "../analytics/tracker";
import { calculate, compareWithCurrent } from "../engine/engine";
import { friendlyMessage, isPricingError } from "../engine/errors";
import { NAILS_CONFIG } from "../engine/nails";
import type { PricingResult, UserInput } from "../engine/types";
import { brl, brl0, num } from "../lib/format";
import { useCountUp, useLocalStorage } from "../lib/hooks";
import { ResultView } from "./ResultView";
import { Button, Field, Kicker, NumberField, Reveal, SliderField } from "./ui";

const STEPS = [
  { id: "meta", title: "Meta de renda", desc: "Quanto você quer levar pra casa" },
  { id: "jornada", title: "Jornada", desc: "Dias, horas e tempo produtivo" },
  { id: "custos", title: "Custos fixos", desc: "O que vence todo mês" },
  { id: "servico", title: "Serviço", desc: "O que vamos precificar" },
  { id: "taxas", title: "Taxas & margem", desc: "Maquininha e segurança" },
  { id: "atual", title: "Preço atual", desc: "Para comparar (opcional)" },
] as const;

type Draft = UserInput;

function validateStep(draft: Draft, step: number): { ok: boolean; message: string | null } {
  switch (step) {
    case 0:
      if (draft.metaMensal === null || draft.metaMensal < 50)
        return { ok: false, message: "Defina uma meta mensal de pelo menos R$ 50." };
      break;
    case 1:
      if (!(draft.diasPorMes >= 1 && draft.diasPorMes <= 31))
        return { ok: false, message: "Dias por mês deve estar entre 1 e 31." };
      if (!(draft.horasPorDia >= 1 && draft.horasPorDia <= 16))
        return { ok: false, message: "Horas por dia deve estar entre 1 e 16." };
      if (!(draft.pctProdutiva >= 5 && draft.pctProdutiva <= 100))
        return { ok: false, message: "Percentual produtivo entre 5% e 100%." };
      break;
    case 2:
      for (const item of NAILS_CONFIG.costItems) {
        const v = draft.custosFixos[item.id] ?? null;
        if (v === null || v < 0)
          return { ok: false, message: `Informe um valor válido (≥ 0) para "${item.label}".` };
      }
      break;
    case 3:
      if (!draft.servico.nome.trim())
        return { ok: false, message: "Dê um nome ao serviço." };
      if (!(draft.servico.duracaoMin >= 5 && draft.servico.duracaoMin <= 720))
        return { ok: false, message: "Duração entre 5 e 720 minutos." };
      if (draft.servico.custoMaterial === null || draft.servico.custoMaterial < 0)
        return { ok: false, message: "Custo de material inválido (use 0 se não houver)." };
      break;
    case 4:
      if (!(draft.taxaPct >= 0 && draft.taxaPct <= 95))
        return { ok: false, message: "Taxa percentual entre 0% e 95%." };
      if (draft.taxaFixa === null || draft.taxaFixa < 0)
        return { ok: false, message: "Taxa fixa inválida (use 0 se não houver)." };
      if (!(draft.margemPct >= 0 && draft.margemPct <= 60))
        return { ok: false, message: "Margem entre 0% e 60%." };
      if (draft.taxaPct + draft.margemPct > NAILS_CONFIG.limits.maxDeductionPct)
        return {
          ok: false,
          message: `Taxas + margem somam ${num(draft.taxaPct + draft.margemPct)}% — o limite do motor é ${NAILS_CONFIG.limits.maxDeductionPct}%.`,
        };
      break;
    case 5:
      if (draft.precoAtual !== null && draft.precoAtual < 0)
        return { ok: false, message: "Preço atual inválido." };
      break;
  }
  return { ok: true, message: null };
}

/* ------------------------------ Prévia ao vivo --------------------------- */

function LivePreview({ draft }: { draft: Draft }) {
  const preview = useMemo(() => {
    try {
      return { result: calculate(NAILS_CONFIG, draft), error: null as string | null };
    } catch (e) {
      return {
        result: null,
        error: isPricingError(e) ? friendlyMessage(e) : "Preencha os campos para o motor rodar.",
      };
    }
  }, [draft]);

  const price = preview.result?.recommendedPrice ?? 0;
  const anim = useCountUp(price, 450);

  return (
    <div className="border-2 border-ink bg-plum p-6 text-paper shadow-[8px_8px_0_0_rgba(200,16,70,0.5)]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-gold uppercase">
          Prévia ao vivo
        </p>
        <span className="live-dot relative inline-block h-2 w-2 rounded-full bg-jade text-jade" />
      </div>

      {preview.result ? (
        <>
          <p className="price-tick mt-4 font-mono text-5xl font-extrabold tracking-tight text-paper">
            {brl(Math.round(anim * 100) / 100)}
          </p>
          <p className="mt-1 font-mono text-xs tracking-wider text-paper/60 uppercase">
            preço recomendado · {preview.result.service.nome}
          </p>
          <dl className="price-tick mt-5 space-y-2 border-t border-paper/15 pt-4 font-mono text-sm">
            <div className="flex justify-between">
              <dt className="text-paper/60">Piso mínimo</dt>
              <dd className="font-bold text-gold">{brl(preview.result.minimumPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-paper/60">Líquido / hora</dt>
              <dd className="font-bold text-jade">{brl(preview.result.rates.netHourRate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-paper/60">Hora cheia</dt>
              <dd className="font-bold">{brl(preview.result.rates.fullHourRate)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-paper/50">
            Atualiza a cada campo — o motor roda em tempo real no seu navegador.
          </p>
        </>
      ) : (
        <p className="mt-4 min-h-28 text-sm text-paper/70">{preview.error}</p>
      )}
    </div>
  );
}

/* -------------------------------- Wizard -------------------------------- */

export function Calculator({
  onAddToTable,
}: {
  onAddToTable: (item: {
    nome: string;
    duracaoMin: number;
    preco: number;
    origem: "motor" | "manual";
  }) => void;
}) {
  const [draft, setDraft] = useLocalStorage<Draft>("precopro:v1:draft", {
    ...NAILS_CONFIG.defaults,
    custosFixos: Object.fromEntries(NAILS_CONFIG.costItems.map((c) => [c.id, c.defaultValue])),
    servico: {
      nome: NAILS_CONFIG.serviceCatalog[0].label,
      duracaoMin: NAILS_CONFIG.serviceCatalog[0].defaultDurationMin,
      custoMaterial: NAILS_CONFIG.serviceCatalog[0].defaultMaterialCost,
    },
    precoAtual: null,
  } as Draft);

  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingResult | null>(null);

  useEffect(() => {
    track("calculator_started");
  }, []);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const next = () => {
    const v = validateStep(draft, step);
    if (!v.ok) {
      setStepError(v.message);
      return;
    }
    track("step_completed", { step: STEPS[step].id });
    setStepError(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    try {
      const r = calculate(NAILS_CONFIG, draft);
      setResult(r);
      track("calculator_completed", {
        duracao: draft.servico.duracaoMin,
        comparou: draft.precoAtual !== null,
      });
    } catch (e) {
      setStepError(isPricingError(e) ? friendlyMessage(e) : "Não foi possível calcular.");
      track("engine_error", { code: isPricingError(e) ? e.code : "UNKNOWN" });
    }
  };

  const back = () => {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const pickService = (id: string) => {
    const def = NAILS_CONFIG.serviceCatalog.find((s) => s.id === id);
    if (def) {
      patch({
        servico: {
          nome: def.label,
          duracaoMin: def.defaultDurationMin,
          custoMaterial: def.defaultMaterialCost,
        },
      });
    } else {
      patch({ servico: { ...draft.servico, nome: "" } });
    }
  };

  const horasProdutivas = draft.diasPorMes * draft.horasPorDia * (draft.pctProdutiva / 100);
  const totalFixos = NAILS_CONFIG.costItems.reduce((s, c) => s + (draft.custosFixos[c.id] ?? 0), 0);

  if (result) {
    const comparison =
      draft.precoAtual !== null ? compareWithCurrent(result, draft.precoAtual) : null;
    return (
      <ResultView
        result={result}
        comparison={comparison}
        onAddToTable={(item) => onAddToTable(item)}
        onRestart={() => setResult(null)}
      />
    );
  }

  return (
    <section className="halftone-light relative min-h-screen py-14 pb-32 sm:py-20 lg:pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <Kicker>Calculadora · vertical nails</Kicker>
          <h1 className="font-display text-4xl leading-[1.02] sm:text-5xl">
            Seu número em <span className="text-lacquer">6 passos.</span>
          </h1>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Coluna do wizard */}
          <div>
            {/* trilha de progresso */}
            <ol className="mb-8 flex flex-wrap gap-2">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => i < step && (setStep(i), setStepError(null))}
                    className={`focus-ring flex cursor-pointer items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase transition-all ${
                      i === step
                        ? "border-ink bg-lacquer text-paper shadow-[3px_3px_0_0_var(--color-ink)]"
                        : i < step
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/20 text-ink-soft"
                    }`}
                  >
                    <span>{i < step ? "✓" : i + 1}</span>
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                </li>
              ))}
            </ol>

            <Reveal key={step}>
              <div className="border-2 border-ink bg-white/60 p-7 shadow-[8px_8px_0_0_rgba(35,18,29,0.12)] sm:p-9">
                <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-lacquer uppercase">
                  Passo {step + 1} de {STEPS.length} — {STEPS[step].title}
                </p>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl">{STEPS[step].desc}</h2>

                <div className="mt-8 space-y-6">
                  {step === 0 && (
                    <>
                      <SliderField
                        label="Meta de renda mensal (líquida, pra você)"
                        value={draft.metaMensal}
                        onChange={(v) => patch({ metaMensal: v })}
                        min={500}
                        max={12000}
                        step={50}
                        format={brl0}
                      />
                      <Field label="Ou digite o valor exato">
                        <NumberField
                          value={draft.metaMensal}
                          onValue={(v) => patch({ metaMensal: v ?? 0 })}
                          prefix="R$"
                          suffix="/mês"
                        />
                      </Field>
                      <p className="text-sm text-ink-soft">
                        Pense no valor que precisa <strong>sobrar</strong> depois de pagar
                        aluguel, material, MEI e tudo mais. É o seu salário — o motor trata
                        como tal.
                      </p>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Dias trabalhados por mês">
                          <NumberField
                            value={draft.diasPorMes}
                            onValue={(v) => patch({ diasPorMes: v ?? 0 })}
                            suffix="dias"
                          />
                        </Field>
                        <Field label="Horas por dia">
                          <NumberField
                            value={draft.horasPorDia}
                            onValue={(v) => patch({ horasPorDia: v ?? 0 })}
                            suffix="h/dia"
                          />
                        </Field>
                      </div>
                      <SliderField
                        label="% do tempo realmente produtivo"
                        value={draft.pctProdutiva}
                        onChange={(v) => patch({ pctProdutiva: v })}
                        min={30}
                        max={100}
                        step={5}
                        format={(v) => `${v}%`}
                      />
                      <p className="border-l-4 border-gold bg-gold/10 p-4 font-mono text-sm font-semibold text-ink">
                        {num(horasProdutivas)}h produtivas/mês na sua jornada — é com elas que a
                        conta fecha.
                      </p>
                      <p className="text-sm text-ink-soft">
                        Entre uma cliente e outra tem limpeza, esterilização, atraso, resposta
                        no WhatsApp. 70% produtivo já é um dia bom.
                      </p>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      {NAILS_CONFIG.costItems.map((item) => (
                        <Field
                          key={item.id}
                          label={item.label}
                          hint={item.hint}
                          error={
                            (draft.custosFixos[item.id] ?? null) === null
                              ? null
                              : (draft.custosFixos[item.id] ?? 0) < 0
                                ? "Use 0 se não tiver esse custo."
                                : null
                          }
                        >
                          <NumberField
                            value={draft.custosFixos[item.id] ?? null}
                            onValue={(v) =>
                              patch({ custosFixos: { ...draft.custosFixos, [item.id]: v ?? 0 } })
                            }
                            prefix="R$"
                            suffix="/mês"
                          />
                        </Field>
                      ))}
                      <p className="border-l-4 border-lacquer bg-lacquer/5 p-4 font-mono text-sm font-bold text-ink">
                        Total de custos fixos: {brl(totalFixos)} /mês
                      </p>
                      <p className="text-sm text-ink-soft">
                        Custos que existem <strong>com ou sem cliente</strong>. Material entra
                        depois, por serviço — aqui é só o que vence todo mês.
                      </p>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <Field label="Serviço do catálogo">
                        <select
                          value={
                            NAILS_CONFIG.serviceCatalog.some((s) => s.label === draft.servico.nome)
                              ? NAILS_CONFIG.serviceCatalog.find((s) => s.label === draft.servico.nome)?.id
                              : "custom"
                          }
                          onChange={(e) => pickService(e.target.value)}
                          className="focus-ring w-full cursor-pointer border-2 border-ink/20 bg-white px-4 py-3 font-mono text-sm font-semibold"
                        >
                          {NAILS_CONFIG.serviceCatalog.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                          <option value="custom">✏️ Outro serviço (personalizar)</option>
                        </select>
                      </Field>
                      <Field label="Nome do serviço">
                        <input
                          type="text"
                          value={draft.servico.nome}
                          onChange={(e) =>
                            patch({ servico: { ...draft.servico, nome: e.target.value } })
                          }
                          placeholder="Ex.: Alongamento em gel"
                          className="focus-ring w-full border-2 border-ink/20 bg-white/70 px-4 py-3 text-lg font-semibold transition-colors focus:border-lacquer"
                        />
                      </Field>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Duração média" hint="em minutos">
                          <NumberField
                            value={draft.servico.duracaoMin}
                            onValue={(v) =>
                              patch({ servico: { ...draft.servico, duracaoMin: v ?? 0 } })
                            }
                            suffix="min"
                          />
                        </Field>
                        <Field label="Material por atendimento" hint="gel, lixas, luvas...">
                          <NumberField
                            value={draft.servico.custoMaterial}
                            onValue={(v) =>
                              patch({ servico: { ...draft.servico, custoMaterial: v ?? 0 } })
                            }
                            prefix="R$"
                          />
                        </Field>
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-ink">
                          Como você costuma receber?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {NAILS_CONFIG.feePresets.map((p) => {
                            const ativo = draft.taxaPct === p.pct && draft.taxaFixa === p.fixed;
                            return (
                              <button
                                key={p.id}
                                onClick={() => patch({ taxaPct: p.pct, taxaFixa: p.fixed })}
                                className={`focus-ring cursor-pointer border-2 px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase transition-all ${
                                  ativo
                                    ? "border-ink bg-lacquer text-paper shadow-[3px_3px_0_0_var(--color-ink)]"
                                    : "border-ink/20 hover:border-ink"
                                }`}
                              >
                                {p.label} · {num(p.pct)}%
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Taxa % sobre o preço">
                          <NumberField
                            value={draft.taxaPct}
                            onValue={(v) => patch({ taxaPct: v ?? 0 })}
                            suffix="%"
                          />
                        </Field>
                        <Field label="Taxa fixa por serviço">
                          <NumberField
                            value={draft.taxaFixa}
                            onValue={(v) => patch({ taxaFixa: v ?? 0 })}
                            prefix="R$"
                          />
                        </Field>
                      </div>
                      <SliderField
                        label="Margem de segurança"
                        value={draft.margemPct}
                        onChange={(v) => patch({ margemPct: v })}
                        min={0}
                        max={40}
                        step={1}
                        format={(v) => `${v}%`}
                      />
                      <p className="text-sm text-ink-soft">
                        A margem é um <strong>buffer do negócio</strong>: cobre reajuste de
                        material, mês fraco e manutenção. 15% é um bom começo.
                      </p>
                    </>
                  )}

                  {step === 5 && (
                    <>
                      <Field
                        label="Quanto você cobra hoje por esse serviço?"
                        hint="opcional — deixa a comparação em branco se preferir"
                      >
                        <NumberField
                          value={draft.precoAtual}
                          onValue={(v) => patch({ precoAtual: v })}
                          prefix="R$"
                        />
                      </Field>
                      <div className="border-2 border-dashed border-ink/25 p-5">
                        <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-ink-soft uppercase">
                          Resumo do cálculo
                        </p>
                        <dl className="price-tick mt-3 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm sm:grid-cols-3">
                          <div>
                            <dt className="text-xs text-ink-soft">Meta</dt>
                            <dd className="font-bold">{brl0(draft.metaMensal)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-soft">Fixos/mês</dt>
                            <dd className="font-bold">{brl0(totalFixos)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-soft">Horas prod.</dt>
                            <dd className="font-bold">{num(horasProdutivas)}h</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-soft">Serviço</dt>
                            <dd className="font-bold truncate">{draft.servico.nome}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-soft">Duração</dt>
                            <dd className="font-bold">{draft.servico.duracaoMin}min</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-soft">Deduções</dt>
                            <dd className="font-bold">
                              {num(draft.taxaPct + draft.margemPct)}%
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </>
                  )}
                </div>

                {stepError && (
                  <p className="mt-6 border-2 border-lacquer bg-lacquer/10 p-3.5 font-mono text-sm font-semibold text-lacquer-deep">
                    ▲ {stepError}
                  </p>
                )}

                <div className="mt-8 flex items-center justify-between gap-4">
                  <Button variant="ghost" onClick={back} disabled={step === 0} className="disabled:opacity-30">
                    ← Voltar
                  </Button>
                  {step < STEPS.length - 1 ? (
                    <Button variant="dark" onClick={next}>
                      Próximo →
                    </Button>
                  ) : (
                    <Button onClick={next}>Ver meu número →</Button>
                  )}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Prévia sticky */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <LivePreview draft={draft} />
              <p className="mt-4 font-mono text-xs leading-relaxed text-ink-soft">
                A prévia usa o mesmo motor do resultado final — mesma fórmula, mesmo
                arredondamento. Nada de “estimativa” diferente por trás do pano.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* prévia mobile */}
      <MobileBar draft={draft} />
    </section>
  );
}

function MobileBar({ draft }: { draft: Draft }) {
  const preview = useMemo(() => {
    try {
      return calculate(NAILS_CONFIG, draft);
    } catch {
      return null;
    }
  }, [draft]);

  if (!preview) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t-2 border-lacquer bg-ink px-5 py-3 text-paper lg:hidden">
      <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-paper/60 uppercase">
        Prévia ao vivo
      </span>
      <span className="price-tick font-mono text-xl font-extrabold text-gold">
        {brl(preview.recommendedPrice)}
      </span>
    </div>
  );
}
