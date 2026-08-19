/**
 * Testes do Pricing Engine (SPEC-001 §Testes).
 *
 * Cobrem: cálculos exatos (fixture com números redondos), identidades
 * contábeis, casos-limite, erros tipados E as invariantes econômicas que
 * protegem o comportamento do motor:
 *
 *   - custo ↑        ⇒ preço recomendado não diminui
 *   - duração ↑      ⇒ preço recomendado não diminui
 *   - meta de renda ↑⇒ preço recomendado não diminui
 *   - taxas ↑        ⇒ preço recomendado não diminui
 */

import { describe, expect, it } from "vitest";
import {
  InvalidCostError,
  InvalidDurationError,
  InvalidFeeError,
  InvalidNicheConfigError,
  InvalidPricingInputError,
  UnsupportedPricingModelError,
} from "./errors";
import { charmUp, round2 } from "./math";
import { getModel } from "./models";
import { NAILS_CONFIG } from "./nails";
import { calculate, compareWithCurrent, validateNicheConfig } from "./engine";
import type { NicheConfig, PricingModelId, UserInput } from "./types";

/* ------------------------------- fixtures ------------------------------- */

function makeConfig(overrides: Partial<NicheConfig> = {}): NicheConfig {
  return {
    ...NAILS_CONFIG,
    // arredondamento desligado p/ assertivas exatas
    rounding: "none",
    ...overrides,
  };
}

/** Números redondos para cálculo à mão:
 *  Hp = 20d × 8h × 75% = 120h | F = 1200 | R = 3000 | hc = 4200/120 = 35
 *  h = 120min = 2h | m = 20 | tf = 0 | tx = 2% | M = 20%
 *  P* = (35×2 + 20) / (1 − 0,22) = 90 / 0,78 = 115,3846...
 *  Pmin = (10×2 + 20) / (1 − 0,02) = 40 / 0,98 = 40,8163...
 */
function makeInput(overrides: Partial<UserInput> = {}): UserInput {
  return {
    metaMensal: 3000,
    diasPorMes: 20,
    horasPorDia: 8,
    pctProdutiva: 75,
    custosFixos: { espaco: 1200, impostos: 0, energia: 0, marketing: 0, outros: 0 },
    servico: { nome: "Alongamento de teste", duracaoMin: 120, custoMaterial: 20 },
    taxaPct: 2,
    taxaFixa: 0,
    margemPct: 20,
    precoAtual: null,
    ...overrides,
  };
}

/* --------------------------- cálculos básicos --------------------------- */

describe("cálculos básicos", () => {
  it("calcula preço recomendado e mínimo com valores exatos", () => {
    const r = calculate(makeConfig(), makeInput());
    expect(r.recommendedPrice).toBeCloseTo(115.38, 2);
    expect(r.minimumPrice).toBeCloseTo(40.82, 2);
    expect(r.rates.fullHourRate).toBeCloseTo(35, 6);
    expect(r.rates.fixedCostPerHour).toBeCloseTo(10, 6);
    expect(r.laborAlloc).toBeCloseTo(50, 2);
    expect(r.fixedAlloc).toBeCloseTo(20, 2);
  });

  it("mantém a identidade contábil: preço = material + fixos + taxas + salário + margem", () => {
    const r = calculate(makeConfig(), makeInput());
    const soma =
      r.costMaterial + r.fixedAlloc + r.fees + r.laborAlloc + r.buffer;
    expect(soma).toBeCloseTo(r.recommendedPrice, 1);
  });

  it("líquido por serviço = salário + margem (± erro de arredondamento)", () => {
    const r = calculate(makeConfig(), makeInput());
    expect(r.netPerService).toBeCloseTo(r.laborAlloc + r.buffer, 1);
    expect(r.rates.netHourRate).toBeCloseTo(r.netPerService / 2, 1);
  });

  it("métricas mensais batem com o cálculo à mão", () => {
    const r = calculate(makeConfig(), makeInput());
    expect(r.monthly.productiveHours).toBe(120);
    expect(r.monthly.capacityServices).toBe(60); // ⌊120/2⌋
    expect(r.monthly.breakEvenUnits).toBe(13); // ⌈1200/93,07⌉
    expect(r.monthly.servicesToGoal).toBe(42); // ⌈3000/73,07⌉
    expect(r.monthly.goalFitsCapacity).toBe(true);
  });

  it("é determinístico: mesmas entradas → resultado idêntico", () => {
    const a = calculate(makeConfig(), makeInput());
    const b = calculate(makeConfig(), makeInput());
    expect(a).toEqual(b);
  });

  it("aplica arredondamento charm quando configurado (Nails)", () => {
    const r = calculate(NAILS_CONFIG, makeInput());
    expect(r.recommendedPrice).toBe(115.9);
    expect(r.minimumPrice).toBe(40.9);
  });

  it("suporta o modelo cost-plus-margin registrado", () => {
    const r = calculate(makeConfig({ pricingModel: "cost-plus-margin" }), makeInput());
    // (10×2 + 20) × 1,2 / 0,98 = 48,9796
    expect(r.recommendedPrice).toBeCloseTo(48.98, 2);
  });
});

/* ------------------------- invariantes econômicas ------------------------ */

describe("invariantes econômicas", () => {
  function recOf(input: UserInput): number {
    return calculate(makeConfig(), input).recommendedPrice;
  }

  function assertNonDecreasing(values: number[], build: (v: number) => UserInput) {
    const prices = values.map((v) => recOf(build(v)));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  }

  const base = makeInput();

  it("custo de material ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([5, 20, 60, 150], (v) =>
      makeInput({ servico: { ...base.servico, custoMaterial: v } }),
    );
  });

  it("custos fixos ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([300, 1200, 3000, 6000], (v) =>
      makeInput({ custosFixos: { ...base.custosFixos, espaco: v } }),
    );
  });

  it("duração do serviço ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([30, 60, 120, 240], (v) =>
      makeInput({ servico: { ...base.servico, duracaoMin: v } }),
    );
  });

  it("meta de renda ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([1000, 3000, 6000, 12000], (v) => makeInput({ metaMensal: v }));
  });

  it("taxa percentual ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([0, 2, 5, 10], (v) => makeInput({ taxaPct: v }));
  });

  it("taxa fixa adicional ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([0, 3, 10, 30], (v) => makeInput({ taxaFixa: v }));
  });

  it("margem ↑ ⇒ preço não diminui", () => {
    assertNonDecreasing([0, 10, 20, 40], (v) => makeInput({ margemPct: v }));
  });

  it("charm rounding é monótono não-decrescente", () => {
    let prev = 0;
    for (let x = 0; x <= 300; x += 0.07) {
      const v = charmUp(round2(x));
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeGreaterThanOrEqual(x - 1e-9);
      prev = v;
    }
  });
});

/* --------------------------- erros e limites ---------------------------- */

describe("entradas inválidas e casos-limite", () => {
  it("rejeita meta de renda zerada", () => {
    expect(() => calculate(makeConfig(), makeInput({ metaMensal: 0 }))).toThrow(
      InvalidPricingInputError,
    );
  });

  it("rejeita jornada inválida (0 dias / 0% produtivo)", () => {
    expect(() => calculate(makeConfig(), makeInput({ diasPorMes: 0 }))).toThrow(
      InvalidPricingInputError,
    );
    expect(() => calculate(makeConfig(), makeInput({ pctProdutiva: 0 }))).toThrow(
      InvalidPricingInputError,
    );
  });

  it("rejeita duração fora dos limites", () => {
    expect(() =>
      calculate(makeConfig(), makeInput({ servico: { ...makeInput().servico, duracaoMin: 0 } })),
    ).toThrow(InvalidPricingInputError);
    expect(() =>
      calculate(makeConfig(), makeInput({ servico: { ...makeInput().servico, duracaoMin: 3 } })),
    ).toThrow(InvalidDurationError);
  });

  it("rejeita custo negativo", () => {
    expect(() =>
      calculate(makeConfig(), makeInput({ custosFixos: { espaco: -50 } })),
    ).toThrow(InvalidCostError);
  });

  it("rejeita taxas + margem acima do limite do nicho (fórmula indefinida)", () => {
    expect(() => calculate(makeConfig(), makeInput({ taxaPct: 80, margemPct: 30 }))).toThrow(
      InvalidFeeError,
    );
  });

  it("rejeita configuração de nicho sem itens de custo", () => {
    expect(() => validateNicheConfig({ ...NAILS_CONFIG, costItems: [] })).toThrow(
      InvalidNicheConfigError,
    );
  });

  it("rejeita configuração com modelo inexistente", () => {
    expect(() => validateNicheConfig({ ...NAILS_CONFIG, pricingModel: "mágico" })).toThrow(
      InvalidNicheConfigError,
    );
  });

  it("registro de modelos lança erro tipado para modelo desconhecido", () => {
    expect(() => getModel("inexistente" as PricingModelId)).toThrow(
      UnsupportedPricingModelError,
    );
  });

  it("avisa quando a meta não cabe na agenda", () => {
    // margem 0: Qm = ⌈Hp/h⌉ = 3 > capacidade ⌊Hp/h⌋ = 2 (Hp = 2d × 5h × 50%)
    const r = calculate(
      makeConfig(),
      makeInput({ metaMensal: 50000, diasPorMes: 2, horasPorDia: 5, pctProdutiva: 50, margemPct: 0 }),
    );
    expect(r.monthly.capacityServices).toBe(2);
    expect(r.monthly.servicesToGoal).toBe(3);
    expect(r.monthly.goalFitsCapacity).toBe(false);
    expect(r.warnings.some((w) => w.code === "GOAL_OVER_CAPACITY")).toBe(true);
  });

  it("sem aviso quando a meta cabe na agenda", () => {
    const r = calculate(makeConfig(), makeInput());
    expect(r.warnings).toHaveLength(0);
  });
});

/* ------------------------------- comparação ------------------------------ */

describe("comparação com preço atual", () => {
  const result = calculate(makeConfig(), makeInput()); // rec ≈ 115,38 | min ≈ 40,82

  it("classifica preço abaixo do mínimo", () => {
    const c = compareWithCurrent(result, 30);
    expect(c.verdict).toBe("abaixo-do-minimo");
    expect(c.currentNetPerService).toBeLessThan(0);
    expect(c.delta).toBeGreaterThan(0);
  });

  it("classifica preço entre mínimo e recomendado", () => {
    const c = compareWithCurrent(result, 80);
    expect(c.verdict).toBe("abaixo-do-ideal");
    expect(c.delta).toBeGreaterThan(0);
  });

  it("classifica preço acima do recomendado", () => {
    const c = compareWithCurrent(result, 150);
    expect(c.verdict).toBe("acima-do-recomendado");
    expect(c.delta).toBeLessThan(0);
    expect(c.currentNetPerService).toBeGreaterThan(result.netPerService);
  });

  it("projeta o salário mensal real no preço atual", () => {
    const c = compareWithCurrent(result, 80);
    expect(c.monthlyNetAtCurrent).toBeCloseTo(c.currentNetPerService * c.capacityServices, 1);
  });
});

/* ------------------------------ arredondamento --------------------------- */

describe("arredondamento charm (R$ X,90)", () => {
  it("aplica a regra documentada", () => {
    expect(charmUp(85.1)).toBe(85.9); // ⌈85,1⌉=86 → 85,90 ≥ 85,10 ✓
    expect(charmUp(85.92)).toBe(86.9); // 85,90 < 85,92 → 86,90
    expect(charmUp(86)).toBe(86.9);
    expect(charmUp(0)).toBe(0);
  });

  it("nunca devolve valor abaixo do bruto", () => {
    for (const x of [0.05, 12.34, 99.95, 100, 245.61]) {
      expect(charmUp(x)).toBeGreaterThanOrEqual(x);
    }
  });
});
