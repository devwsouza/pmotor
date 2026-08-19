/**
 * Pricing Engine — fachada do motor (SPEC-001).
 *
 * Responsabilidades, nesta ordem:
 *   1. validar a configuração do nicho (schema → InvalidNicheConfigError);
 *   2. validar a entrada do usuário (schema + regras entre campos);
 *   3. montar o PricingContext (derivações auditáveis);
 *   4. executar a estratégia do modelo de precificação;
 *   5. aplicar o arredondamento do nicho;
 *   6. montar o PricingResult auditável (breakdown, métricas, avisos).
 *
 * O motor não conhece UI, não conhece "nails" enquanto código e não guarda
 * estado: calculate(config, input) é uma função pura.
 */

import { z } from "zod";
import {
  InvalidCostError,
  InvalidDurationError,
  InvalidFeeError,
  InvalidNicheConfigError,
  InvalidPricingInputError,
} from "./errors";
import type { ErrorIssue } from "./errors";
import {
  applyRounding,
  ceilDiv,
  feeAmount,
  fullHourRate,
  netPerService,
  priceFromNetBase,
  productiveHoursPerMonth,
  round2,
  safeDiv,
  unitContribution,
} from "./math";
import { getModel } from "./models";
import { NicheConfigSchema, UserInputSchema } from "./schema";
import type {
  ComparisonResult,
  NicheConfig,
  PricingContext,
  PricingResult,
  PricingWarning,
  UserInput,
} from "./types";

function zodIssues(error: z.ZodError): ErrorIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(raiz)",
    message: issue.message,
  }));
}

/** Valida uma configuração de nicho. Config inválida NUNCA chega ao motor. */
export function validateNicheConfig(raw: unknown): NicheConfig {
  const parsed = NicheConfigSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidNicheConfigError(zodIssues(parsed.error));
  return parsed.data;
}

/** F — soma dos custos fixos mensais considerando apenas itens do nicho. */
function sumFixedCosts(config: NicheConfig, input: UserInput): number {
  let total = 0;
  for (const item of config.costItems) {
    const value = input.custosFixos[item.id] ?? 0;
    if (value < 0 || value > config.limits.maxCostItem) {
      throw new InvalidCostError([
        {
          path: `custosFixos.${item.id}`,
          message: `"${item.label}" deve estar entre 0 e o teto do nicho.`,
        },
      ]);
    }
    total += value;
  }
  return total;
}

/** Regras entre campos que dependem da configuração do nicho. */
function enforceNicheRules(config: NicheConfig, input: UserInput): void {
  const deduction = input.taxaPct + input.margemPct;
  if (deduction > config.limits.maxDeductionPct) {
    throw new InvalidFeeError([
      {
        path: "taxaPct+margemPct",
        message: `Taxas (${input.taxaPct}%) + margem (${input.margemPct}%) somam ${deduction}%, acima do limite de ${config.limits.maxDeductionPct}%.`,
      },
    ]);
  }
  const { duracaoMin } = input.servico;
  if (duracaoMin < config.limits.minDuracaoMin || duracaoMin > config.limits.maxDuracaoMin) {
    throw new InvalidDurationError([
      {
        path: "servico.duracaoMin",
        message: `Duração deve estar entre ${config.limits.minDuracaoMin} e ${config.limits.maxDuracaoMin} minutos.`,
      },
    ]);
  }
}

/**
 * Calcula o preço de um serviço. Determinístico: mesma entrada → mesmo resultado.
 * Lança apenas erros tipados do domínio (errors.ts).
 */
export function calculate(rawConfig: unknown, rawInput: unknown): PricingResult {
  const config = validateNicheConfig(rawConfig);

  const parsedInput = UserInputSchema.safeParse(rawInput);
  if (!parsedInput.success) throw new InvalidPricingInputError(zodIssues(parsedInput.error));
  const input: UserInput = parsedInput.data;

  enforceNicheRules(config, input);

  const fixedMonthlyCost = sumFixedCosts(config, input);
  const availableHours = input.diasPorMes * input.horasPorDia;
  const productiveHours = productiveHoursPerMonth(
    input.diasPorMes,
    input.horasPorDia,
    input.pctProdutiva,
  );
  const hourRate = fullHourRate(fixedMonthlyCost, input.metaMensal, productiveHours);
  const fixedCostPerHour = fixedMonthlyCost / productiveHours;
  const durationHours = input.servico.duracaoMin / 60;

  const ctx: PricingContext = {
    fixedMonthlyCost,
    targetIncome: input.metaMensal,
    availableHours,
    productiveHours,
    fullHourRate: hourRate,
    fixedCostPerHour,
    durationHours,
    material: input.servico.custoMaterial,
    feePct: input.taxaPct,
    feeFixed: input.taxaFixa,
    marginPct: input.margemPct,
  };

  const model = getModel(config.pricingModel);
  const raw = model.compute(ctx);

  const recommendedPrice = applyRounding(raw.recommendedPrice, config.rounding);

  // Piso universal do motor (independente do modelo):
  // cobre custo fixo proporcional + material + taxas. Sem salário, sem margem.
  const minBase = fixedCostPerHour * durationHours + input.servico.custoMaterial + input.taxaFixa;
  const minimumPrice = applyRounding(priceFromNetBase(minBase, input.taxaPct), config.rounding);

  const fees = round2(feeAmount(recommendedPrice, input.taxaPct, input.taxaFixa));
  const fixedAlloc = round2(fixedCostPerHour * durationHours);
  const laborAlloc = round2((input.metaMensal / productiveHours) * durationHours);
  const buffer = round2(recommendedPrice * (input.margemPct / 100));
  const net = round2(
    netPerService(recommendedPrice, input.taxaPct, input.taxaFixa, input.servico.custoMaterial, fixedAlloc),
  );
  const netHourRate = round2(safeDiv(net, durationHours) ?? 0);

  const contribution = unitContribution(
    recommendedPrice,
    input.taxaPct,
    input.taxaFixa,
    input.servico.custoMaterial,
  );
  const capacityServices = Math.floor(productiveHours / durationHours);
  const breakEvenUnits = fixedMonthlyCost > 0 ? ceilDiv(fixedMonthlyCost, contribution) : 0;
  const servicesToGoal = ceilDiv(input.metaMensal, net);

  const warnings: PricingWarning[] = [];
  const goalFitsCapacity = servicesToGoal !== null && servicesToGoal <= capacityServices;
  if (!goalFitsCapacity) {
    warnings.push({
      code: "GOAL_OVER_CAPACITY",
      message: `Sua meta pede ${servicesToGoal ?? "mais"} serviços/mês, mas sua agenda comporta ${capacityServices}. Aumente o preço, reduza custos ou amplie a jornada.`,
    });
  }

  return {
    model: model.id,
    rounding: config.rounding,
    service: { nome: input.servico.nome, duracaoMin: input.servico.duracaoMin },
    recommendedPrice,
    minimumPrice,
    costMaterial: round2(input.servico.custoMaterial),
    fixedAlloc,
    laborAlloc,
    fees,
    buffer,
    netPerService: net,
    feePct: input.taxaPct,
    feeFixed: input.taxaFixa,
    rates: {
      fullHourRate: round2(hourRate),
      fixedCostPerHour: round2(fixedCostPerHour),
      netHourRate,
    },
    monthly: {
      fixedMonthlyCost: round2(fixedMonthlyCost),
      targetIncome: input.metaMensal,
      productiveHours: round2(productiveHours),
      capacityServices,
      breakEvenUnits,
      servicesToGoal,
      goalFitsCapacity,
    },
    breakdown: [
      { id: "material", label: "Materiais", value: round2(input.servico.custoMaterial), kind: "cost" },
      { id: "fixos", label: "Custos fixos (proporcional)", value: fixedAlloc, kind: "cost" },
      { id: "taxas", label: "Taxas (maquininha/plataforma)", value: fees, kind: "fee" },
      { id: "salario", label: "Seu salário embutido", value: laborAlloc, kind: "labor" },
      { id: "margem", label: "Margem de segurança", value: buffer, kind: "buffer" },
    ],
    warnings,
  };
}

/**
 * Compara o preço atual com o resultado do motor.
 * Auto-contida: usa apenas dados já presentes no PricingResult.
 */
export function compareWithCurrent(
  result: PricingResult,
  currentPrice: number,
): ComparisonResult {
  const fees = feeAmount(currentPrice, result.feePct, result.feeFixed);
  const net = currentPrice - fees - result.costMaterial - result.fixedAlloc;
  const durationHours = result.service.duracaoMin / 60;
  const delta = result.recommendedPrice - currentPrice;
  const verdict: ComparisonResult["verdict"] =
    currentPrice < result.minimumPrice
      ? "abaixo-do-minimo"
      : currentPrice < result.recommendedPrice
        ? "abaixo-do-ideal"
        : "acima-do-recomendado";

  return {
    currentPrice: round2(currentPrice),
    delta: round2(delta),
    deltaPct: round2(currentPrice > 0 ? (delta / currentPrice) * 100 : 0),
    verdict,
    currentNetPerService: round2(net),
    currentNetHourRate: round2(safeDiv(net, durationHours) ?? 0),
    monthlyNetAtCurrent: round2(net * result.monthly.capacityServices),
    capacityServices: result.monthly.capacityServices,
  };
}
