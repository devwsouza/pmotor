/**
 * Validação de schemas (ADR-002 — Zod).
 *
 * Fluxo obrigatório: NICHE CONFIG / USER INPUT → schema → motor.
 * Nada chega ao Pricing Engine sem passar por aqui. Erros de schema são
 * convertidos em erros tipados do domínio (errors.ts) pela camada engine.
 */

import { z } from "zod";

/** Número finito obrigatório (rejeita NaN/±Infinity). */
const finite = z.number().refine(Number.isFinite, "Informe um número válido.");

function range(min: number, max: number, msgMin: string, msgMax?: string) {
  return finite.min(min, msgMin).max(max, msgMax ?? "Valor acima do limite permitido.");
}

export const NicheConfigSchema = z.object({
  id: z.string().min(1, "id do nicho obrigatório."),
  name: z.string().min(1, "nome do nicho obrigatório."),
  version: z.string().min(1, "versão da configuração obrigatória."),
  currency: z.literal("BRL"),
  pricingModel: z.enum(["target-income", "cost-plus-margin"], {
    message: "Modelo de precificação não suportado.",
  }),
  rounding: z.enum(["charm", "ceilTenth", "none"], {
    message: "Estratégia de arredondamento inválida.",
  }),
  defaults: z.object({
    metaMensal: finite,
    diasPorMes: finite,
    horasPorDia: finite,
    pctProdutiva: finite,
    margemPct: finite,
    taxaPct: finite,
    taxaFixa: finite,
  }),
  costItems: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        hint: z.string().optional(),
        defaultValue: finite,
      }),
    )
    .min(1, "Um nicho precisa de ao menos um item de custo fixo."),
  serviceCatalog: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        defaultDurationMin: finite,
        defaultMaterialCost: finite,
      }),
    )
    .min(1, "Um nicho precisa de ao menos um serviço no catálogo."),
  feePresets: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        pct: finite,
        fixed: finite,
      }),
    )
    .min(1, "Um nicho precisa de ao menos um preset de taxa."),
  limits: z.object({
    maxDeductionPct: range(50, 99, "Limite de dedução inválido."),
    minDuracaoMin: range(1, 60, "Duração mínima inválida."),
    maxDuracaoMin: range(60, 1440, "Duração máxima inválida."),
    maxCostItem: range(1, 10_000_000, "Teto de custo inválido."),
  }),
  texts: z.object({
    tagline: z.string().min(1),
  }),
});

export const UserInputSchema = z.object({
  metaMensal: range(50, 1_000_000, "Meta mínima de R$ 50."),
  diasPorMes: range(1, 31, "Informe entre 1 e 31 dias."),
  horasPorDia: range(1, 16, "Informe entre 1 e 16 horas por dia."),
  pctProdutiva: range(5, 100, "Use entre 5% e 100%."),
  // Faixas de domínio (negativos, tetos por nicho) são regra do MOTOR
  // em engine.ts — viram InvalidCostError/InvalidDurationError tipados.
  custosFixos: z.record(z.string(), finite),
  servico: z.object({
    nome: z.string().trim().min(1, "Dê um nome ao serviço.").max(60, "Máximo de 60 caracteres."),
    duracaoMin: range(1, 1440, "Duração entre 1 e 1440 minutos."),
    custoMaterial: range(0, 100_000, "Material não pode ser negativo."),
  }),
  taxaPct: range(0, 95, "Taxa % entre 0 e 95."),
  taxaFixa: range(0, 10_000, "Taxa fixa entre 0 e R$ 10.000."),
  margemPct: range(0, 60, "Margem entre 0% e 60%."),
  precoAtual: z.union([z.null(), range(0, 1_000_000, "Preço atual inválido.")]),
});

export type NicheConfigSchemaShape = z.infer<typeof NicheConfigSchema>;
export type UserInputSchemaShape = z.infer<typeof UserInputSchema>;
