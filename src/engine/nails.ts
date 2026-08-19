/**
 * Configuração do nicho NAILS (SPEC-002 — primeira vertical).
 *
 * Tudo que é específico do nicho vive aqui, como DADO validado por schema:
 * catálogo de serviços, itens de custo, presets de taxa, limites, textos,
 * modelo de precificação e regra de arredondamento.
 *
 * Valores padrão são PONTO DE PARTIDA editáveis — não são afirmações de
 * mercado. A usuária ajusta tudo à realidade dela.
 */

import type { NicheConfig, UserInput } from "./types";

export const NAILS_CONFIG: NicheConfig = {
  id: "nails",
  name: "PreçoPro Nails",
  version: "1.0.0",
  currency: "BRL",
  pricingModel: "target-income",
  rounding: "charm",

  defaults: {
    metaMensal: 3500,
    diasPorMes: 22,
    horasPorDia: 8,
    pctProdutiva: 70,
    margemPct: 15,
    taxaPct: 2.5,
    taxaFixa: 0,
  },

  costItems: [
    {
      id: "espaco",
      label: "Aluguel / espaço",
      hint: "sua parte do salão, cadeira ou estúdio",
      defaultValue: 400,
    },
    { id: "impostos", label: "Impostos (MEI/DAS)", hint: "guia mensal aproximada", defaultValue: 76 },
    { id: "energia", label: "Energia e água", hint: "cabine, lixa elétrica, esterilização", defaultValue: 90 },
    { id: "marketing", label: "Marketing / redes", hint: "tráfego, fotos, panfletos", defaultValue: 60 },
    { id: "outros", label: "Outros fixos", hint: "sistema, contador, transporte fixo", defaultValue: 0 },
  ],

  serviceCatalog: [
    { id: "esmaltacao", label: "Esmaltação tradicional", defaultDurationMin: 45, defaultMaterialCost: 8 },
    { id: "esmaltacao-gel", label: "Esmaltação em gel", defaultDurationMin: 60, defaultMaterialCost: 15 },
    { id: "banho-gel", label: "Banho de gel", defaultDurationMin: 90, defaultMaterialCost: 30 },
    { id: "alongamento-gel", label: "Alongamento em gel", defaultDurationMin: 150, defaultMaterialCost: 45 },
    { id: "alongamento-fibra", label: "Alongamento em fibra", defaultDurationMin: 150, defaultMaterialCost: 40 },
    { id: "manutencao", label: "Manutenção de alongamento", defaultDurationMin: 90, defaultMaterialCost: 25 },
    { id: "pedicure", label: "Pedicure", defaultDurationMin: 60, defaultMaterialCost: 10 },
    { id: "nail-art", label: "Nail art (adicional)", defaultDurationMin: 30, defaultMaterialCost: 6 },
  ],

  feePresets: [
    { id: "pix", label: "Pix / dinheiro", pct: 0, fixed: 0 },
    { id: "debito", label: "Débito", pct: 1.99, fixed: 0 },
    { id: "credito-vista", label: "Crédito à vista", pct: 3.19, fixed: 0 },
    { id: "credito-parc", label: "Crédito parcelado", pct: 4.99, fixed: 0 },
  ],

  limits: {
    maxDeductionPct: 95,
    minDuracaoMin: 5,
    maxDuracaoMin: 720,
    maxCostItem: 1_000_000,
  },

  texts: {
    tagline: "Precificação com método para manicures e nail designers",
  },
};

/** Entrada inicial do wizard, derivada da configuração do nicho. */
export function buildInitialInput(config: NicheConfig): UserInput {
  const custosFixos: Record<string, number> = {};
  for (const item of config.costItems) custosFixos[item.id] = item.defaultValue;
  const first = config.serviceCatalog[0];
  return {
    metaMensal: config.defaults.metaMensal,
    diasPorMes: config.defaults.diasPorMes,
    horasPorDia: config.defaults.horasPorDia,
    pctProdutiva: config.defaults.pctProdutiva,
    custosFixos,
    servico: {
      nome: first.label,
      duracaoMin: first.defaultDurationMin,
      custoMaterial: first.defaultMaterialCost,
    },
    taxaPct: config.defaults.taxaPct,
    taxaFixa: config.defaults.taxaFixa,
    margemPct: config.defaults.margemPct,
    precoAtual: null,
  };
}
