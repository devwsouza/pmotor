/**
 * Entidades de domínio do Pricing Engine (SPEC-001 §Conceitos).
 *
 * O motor é independente de nicho e de UI: tudo que varia entre nichos
 * vive em NicheConfig (dados), nunca em condicionais `if (niche === ...)`.
 */

export type Currency = "BRL";

/** Estratégia de arredondamento aplicada ao preço final. Definida pelo nicho. */
export type RoundingMode = "charm" | "ceilTenth" | "none";

/** Modelos de precificação suportados pelo registro de estratégias. */
export type PricingModelId = "target-income" | "cost-plus-margin";

/* ----------------------------- Configuração ----------------------------- */

export interface CostItemDef {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly defaultValue: number;
}

export interface ServiceDef {
  readonly id: string;
  readonly label: string;
  readonly defaultDurationMin: number;
  readonly defaultMaterialCost: number;
}

export interface FeePreset {
  readonly id: string;
  readonly label: string;
  readonly pct: number;
  readonly fixed: number;
}

export interface NicheConfig {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly currency: Currency;
  readonly pricingModel: PricingModelId;
  readonly rounding: RoundingMode;
  readonly defaults: {
    readonly metaMensal: number;
    readonly diasPorMes: number;
    readonly horasPorDia: number;
    readonly pctProdutiva: number;
    readonly margemPct: number;
    readonly taxaPct: number;
    readonly taxaFixa: number;
  };
  readonly costItems: readonly CostItemDef[];
  readonly serviceCatalog: readonly ServiceDef[];
  readonly feePresets: readonly FeePreset[];
  readonly limits: {
    readonly maxDeductionPct: number;
    readonly minDuracaoMin: number;
    readonly maxDuracaoMin: number;
    readonly maxCostItem: number;
  };
  readonly texts: {
    readonly tagline: string;
  };
}

/* -------------------------------- Entrada ------------------------------- */

export interface ServiceInput {
  readonly nome: string;
  readonly duracaoMin: number;
  readonly custoMaterial: number;
}

/** Tudo que o usuário informa. Validado por schema ANTES de chegar ao motor. */
export interface UserInput {
  /** R — remuneração líquida desejada por mês (meta de renda). */
  readonly metaMensal: number;
  readonly diasPorMes: number;
  readonly horasPorDia: number;
  /** % do tempo efetivamente faturável (o resto é limpeza, atraso, troca...). */
  readonly pctProdutiva: number;
  /** F — soma dos custos fixos mensais, por item de custo do nicho. */
  readonly custosFixos: Readonly<Record<string, number>>;
  readonly servico: ServiceInput;
  /** Taxa percentual sobre o preço (maquininha/plataforma). */
  readonly taxaPct: number;
  /** Taxa fixa por serviço (ex.: antecipação fixa). */
  readonly taxaFixa: number;
  /** M — margem de segurança sobre o preço final (buffer do negócio). */
  readonly margemPct: number;
  /** Preço que a profissional cobra hoje (opcional, p/ comparação). */
  readonly precoAtual: number | null;
}

/* ------------------------------- Contexto ------------------------------- */

/** Derivações intermediárias auditáveis, calculadas uma única vez. */
export interface PricingContext {
  readonly fixedMonthlyCost: number;
  readonly targetIncome: number;
  readonly availableHours: number;
  readonly productiveHours: number;
  /** (F + R) / Hp — quanto cada hora produtiva precisa render. */
  readonly fullHourRate: number;
  /** F / Hp — parcela da hora cheia referente só aos custos fixos. */
  readonly fixedCostPerHour: number;
  readonly durationHours: number;
  readonly material: number;
  readonly feePct: number;
  readonly feeFixed: number;
  readonly marginPct: number;
}

/* ------------------------------- Resultado ------------------------------ */

export type BreakdownKind = "cost" | "fee" | "labor" | "buffer";

export interface BreakdownLine {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly kind: BreakdownKind;
}

export type WarningCode = "GOAL_OVER_CAPACITY" | "NEGATIVE_NET";

export interface PricingWarning {
  readonly code: WarningCode;
  readonly message: string;
}

export interface PricingResult {
  readonly model: PricingModelId;
  readonly rounding: RoundingMode;
  readonly service: {
    readonly nome: string;
    readonly duracaoMin: number;
  };

  /** Preço que cobre custos + taxas + sua meta + margem de segurança. */
  readonly recommendedPrice: number;
  /** Piso: cobre custos fixos proporcionais + material + taxas. Sem salário. */
  readonly minimumPrice: number;

  /** m — material por serviço. */
  readonly costMaterial: number;
  /** F/Hp × h — custos fixos consumidos por este serviço. */
  readonly fixedAlloc: number;
  /** R/Hp × h — seu salário embutido neste serviço. */
  readonly laborAlloc: number;
  /** Taxas incidentes sobre o preço recomendado. */
  readonly fees: number;
  /** M × P — buffer de segurança do negócio. */
  readonly buffer: number;
  /** O que sobra p/ você por serviço: salário + buffer (P − taxas − material − fixos). */
  readonly netPerService: number;

  readonly feePct: number;
  readonly feeFixed: number;

  readonly rates: {
    /** (F + R) / Hp */
    readonly fullHourRate: number;
    /** F / Hp */
    readonly fixedCostPerHour: number;
    /** líquido por hora no preço recomendado (salário + buffer) / h. */
    readonly netHourRate: number;
  };

  readonly monthly: {
    readonly fixedMonthlyCost: number;
    readonly targetIncome: number;
    readonly productiveHours: number;
    /** ⌊Hp / h⌋ — quantos serviços cabem no mês. */
    readonly capacityServices: number;
    /** ⌈F / CM⌉ — serviços p/ pagar os custos fixos (ponto de equilíbrio). */
    readonly breakEvenUnits: number | null;
    /** ⌈R / líquido⌉ — serviços p/ sua meta de renda virar salário. */
    readonly servicesToGoal: number | null;
    readonly goalFitsCapacity: boolean;
  };

  readonly breakdown: readonly BreakdownLine[];
  readonly warnings: readonly PricingWarning[];
}

export type ComparisonVerdict = "abaixo-do-minimo" | "abaixo-do-ideal" | "acima-do-recomendado";

export interface ComparisonResult {
  readonly currentPrice: number;
  readonly delta: number;
  readonly deltaPct: number;
  readonly verdict: ComparisonVerdict;
  readonly currentNetPerService: number;
  readonly currentNetHourRate: number;
  readonly monthlyNetAtCurrent: number;
  readonly capacityServices: number;
}

/* ------------------------------ Tabela ---------------------------------- */

export interface PriceTableItem {
  readonly id: string;
  readonly nome: string;
  readonly duracaoMin: number;
  readonly preco: number;
  readonly origem: "motor" | "manual";
  readonly createdAt: number;
}
