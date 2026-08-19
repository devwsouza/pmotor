/**
 * Matemática financeira do Pricing Engine (SPEC-001 §Fórmulas).
 *
 * Princípios:
 *  - funções PURAS e determinísticas (mesma entrada → mesma saída, sempre);
 *  - cada fórmula documentada com suas variáveis;
 *  - arredondamento monetário aplicado só na saída, nunca no meio do cálculo;
 *  - conceitos separados: custo ≠ remuneração ≠ lucro ≠ margem ≠ faturamento.
 *
 * Legenda padrão das fórmulas:
 *  R  = meta de renda mensal (remuneração desejada)
 *  F  = custos fixos mensais
 *  Hp = horas produtivas/mês        m  = material por serviço
 *  h  = duração do serviço (horas)  tf = taxa fixa por serviço
 *  tx = taxa % sobre o preço        M  = margem de segurança %
 */

import { InvalidDurationError, InvalidFeeError } from "./errors";
import type { RoundingMode } from "./types";

/** Arredondamento monetário padrão (2 casas). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Teto na primeira casa decimal: 40,82 → 40,90. */
export function ceilTenth(value: number): number {
  return Math.ceil(value * 10 - 1e-9) / 10;
}

/**
 * Arredondamento "charm" (R$ X,90) — regra do nicho Nails.
 *
 * c = ⌈x⌉ ; r = c − 0,10
 * P = r, se r ≥ x ; senão P = c + 0,90
 *
 * Propriedade importante: é MONÓTONO NÃO-DECRESCENTE e sempre ≥ x,
 * o que preserva as invariantes econômicas do motor após o arredondamento.
 */
export function charmUp(value: number): number {
  if (value <= 0) return 0;
  const c = Math.ceil(value - 1e-9);
  const r = c - 0.1;
  return round2(r >= value - 1e-9 ? r : c + 0.9);
}

export function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case "charm":
      return charmUp(value);
    case "ceilTenth":
      return round2(ceilTenth(value));
    case "none":
      return round2(value);
  }
}

/** F1 — Horas produtivas mensais: Hp = dias × horas/dia × pct/100. */
export function productiveHoursPerMonth(
  daysPerMonth: number,
  hoursPerDay: number,
  productivePct: number,
): number {
  return daysPerMonth * hoursPerDay * (productivePct / 100);
}

/**
 * F2 — Hora cheia: hc = (F + R) / Hp.
 * Quanto CADA hora produtiva precisa render para pagar os custos fixos
 * E a remuneração desejada. Lança InvalidDurationError se Hp ≤ 0.
 */
export function fullHourRate(
  fixedMonthlyCost: number,
  targetIncome: number,
  productiveHours: number,
): number {
  if (!(productiveHours > 0)) {
    throw new InvalidDurationError([
      {
        path: "productiveHours",
        message: "Horas produtivas mensais devem ser maiores que zero.",
      },
    ]);
  }
  return (fixedMonthlyCost + targetIncome) / productiveHours;
}

/**
 * F3 — Preço a partir de base líquida: P = base / (1 − d/100).
 * A dedução (taxas + margem) incide SOBRE o preço final, por isso a divisão:
 * garante que, após descontar d% do preço, reste exatamente a base.
 * Indefinido para d ≥ 100 → InvalidFeeError.
 */
export function priceFromNetBase(netBase: number, deductionPct: number): number {
  if (!(deductionPct < 100)) {
    throw new InvalidFeeError([
      {
        path: "deductionPct",
        message: `Dedução total de ${deductionPct}% torna o preço indefinido (limite: < 100%).`,
      },
    ]);
  }
  return netBase / (1 - deductionPct / 100);
}

/** F5 — Taxas sobre um preço: fees(P) = P × tx/100 + tf. */
export function feeAmount(price: number, feePct: number, feeFixed: number): number {
  return price * (feePct / 100) + feeFixed;
}

/**
 * F6 — Líquido por serviço: L(P) = P − fees(P) − m − F/Hp×h.
 * É o que vai para o bolso da profissional: salário alocado + margem.
 */
export function netPerService(
  price: number,
  feePct: number,
  feeFixed: number,
  material: number,
  fixedAlloc: number,
): number {
  return price - feeAmount(price, feePct, feeFixed) - material - fixedAlloc;
}

/**
 * F7 — Contribuição unitária (análise CVP): CM = P − fees(P) − m.
 * O que cada serviço contribui para custos fixos + renda (antes do fixo).
 */
export function unitContribution(
  price: number,
  feePct: number,
  feeFixed: number,
  material: number,
): number {
  return price - feeAmount(price, feePct, feeFixed) - material;
}

/** Divisão com teto inteiro e tolerância numérica: ⌈a/b⌉. */
export function ceilDiv(a: number, b: number): number | null {
  if (!(b > 1e-9)) return null;
  return Math.max(0, Math.ceil(a / b - 1e-9));
}

/** Divisão simples com guarda: retorna null quando indefinida. */
export function safeDiv(a: number, b: number): number | null {
  if (!(Math.abs(b) > 1e-12)) return null;
  return a / b;
}
