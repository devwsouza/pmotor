/**
 * Registro de modelos de precificação (ADR-001/003).
 *
 * Cada modelo é uma ESTRATÉGIA pura: recebe um PricingContext validado e
 * devolve o preço bruto recomendado. O motor (engine.ts) aplica o
 * arredondamento do nicho e monta o resultado auditável.
 *
 * O preço MÍNIMO não pertence ao modelo: é um conceito universal do motor
 * (custo + taxas, sem remuneração, sem margem) calculado em engine.ts.
 */

import { UnsupportedPricingModelError } from "./errors";
import { priceFromNetBase } from "./math";
import type { PricingContext, PricingModelId } from "./types";

export interface RawModelOutput {
  /** Preço bruto (antes do arredondamento do nicho). */
  readonly recommendedPrice: number;
}

export interface PricingModelStrategy {
  readonly id: PricingModelId;
  readonly label: string;
  /** Fórmula em linguagem humana — exibida na página "Método". */
  readonly formula: string;
  compute(ctx: PricingContext): RawModelOutput;
}

/**
 * Modelo principal do MVP.
 *
 * P* = (hc × h + m + tf) ÷ (1 − (tx + M)/100)
 * onde hc = (F + R) / Hp — a "hora cheia" que paga custos + salário.
 */
const targetIncomeModel: PricingModelStrategy = {
  id: "target-income",
  label: "Meta de renda + hora cheia",
  formula: "(hora cheia × duração + material + taxa fixa) ÷ (1 − (taxas% + margem%)/100)",
  compute(ctx) {
    const netBase = ctx.fullHourRate * ctx.durationHours + ctx.material + ctx.feeFixed;
    return { recommendedPrice: priceFromNetBase(netBase, ctx.feePct + ctx.marginPct) };
  },
};

/**
 * Modelo alternativo já registrado (não usado por Nails no MVP):
 * markup sobre custo, sem meta de renda.
 *
 * P* = (F/Hp × h + m + tf) × (1 + M/100) ÷ (1 − tx/100)
 */
const costPlusMarginModel: PricingModelStrategy = {
  id: "cost-plus-margin",
  label: "Custo + margem (markup)",
  formula: "(custo fixo proporcional + material + taxa fixa) × (1 + margem%) ÷ (1 − taxas%)",
  compute(ctx) {
    const cost = ctx.fixedCostPerHour * ctx.durationHours + ctx.material + ctx.feeFixed;
    const withMarkup = cost * (1 + ctx.marginPct / 100);
    return { recommendedPrice: priceFromNetBase(withMarkup, ctx.feePct) };
  },
};

const registry = new Map<PricingModelId, PricingModelStrategy>([
  [targetIncomeModel.id, targetIncomeModel],
  [costPlusMarginModel.id, costPlusMarginModel],
]);

export function getModel(id: PricingModelId): PricingModelStrategy {
  const model = registry.get(id);
  if (!model) throw new UnsupportedPricingModelError(id);
  return model;
}

export function listModels(): readonly PricingModelStrategy[] {
  return [...registry.values()];
}
