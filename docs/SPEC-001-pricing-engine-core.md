# SPEC-001 — Pricing Engine Core

Status: **implementada no MVP** · Versão 1.0.0 · Nicho ativo: `nails`

Esta é a especificação formal do motor. A UI é descartável; este documento e
`src/engine/` são o ativo.

---

## 1. Conceitos e contratos

```
UserInput  →  [Zod schema]  →  PricingContext  →  [model strategy]  →  RawPrice
NicheConfig → [Zod schema] ─┘                                          ↓
                                                        [rounding do nicho]
                                                                       ↓
                                                              PricingResult (auditável)
```

- `calculate(config, input): PricingResult` — função **pura e determinística**.
- Configuração inválida ⇒ `InvalidNicheConfigError` (nunca chega ao motor).
- Entrada inválida ⇒ `InvalidPricingInputError` / `InvalidCostError` /
  `InvalidDurationError` / `InvalidFeeError`.
- Modelo desconhecido ⇒ `UnsupportedPricingModelError`.

## 2. Variáveis

| Símbolo | Significado | Origem |
| --- | --- | --- |
| R | meta de renda mensal (remuneração desejada) | input |
| F | custos fixos mensais (Σ itens do nicho) | input |
| D, Hd | dias/mês, horas/dia | input |
| p | % produtivo | input |
| Hp | horas produtivas = D × Hd × p/100 | motor |
| hc | hora cheia = (F + R) / Hp | motor |
| h | duração do serviço (horas) | input |
| m | material por serviço | input |
| tf, tx | taxa fixa / taxa % sobre o preço | input |
| M | margem de segurança (% do preço final) | input |

## 3. Fórmulas oficiais

- **F3 preço recomendado**: `P* = (hc × h + m + tf) ÷ (1 − (tx + M)/100)`
- **F4 piso mínimo**: `Pmin = (F/Hp × h + m + tf) ÷ (1 − tx/100)` — sem salário, sem margem.
- **F5 taxas**: `fees(P) = P × tx/100 + tf`
- **F6 líquido/serviço**: `L(P) = P − fees(P) − m − F/Hp × h` (≡ salário alocado + margem)
- **F7 ponto de equilíbrio**: `Qe = ⌈F ÷ CM⌉`, `CM = P − fees(P) − m`
- **F8 serviços p/ meta**: `Qm = ⌈R ÷ L(P)⌉`, comparado a `⌊Hp ÷ h⌋` (capacidade)

### ADR-003 — por que dividir e não multiplicar

Taxas e margem incidem **sobre o preço final**. `P = base ÷ (1 − d)` garante que, após
descontar `d%` de `P`, reste exatamente a base. `P = base × (1 + d)` subcobraria
(ex.: base 100, d 20%: divisão → 125, cujo desconto devolve 100; multiplicação → 120,
cujo desconto devolve 96).

### Exemplo numérico (fixture de teste)

D=20, Hd=8, p=75 → Hp=120 · F=1200 · R=3000 → hc=35 · h=2 · m=20 · tf=0 · tx=2% · M=20%

`P* = (35×2 + 20) ÷ 0,78 = 115,38` (arredondamento `none`) · `Pmin = 40 ÷ 0,98 = 40,82`
Com arredondamento `charm` (Nails): **R$ 115,90** e piso **R$ 40,90**.

## 4. Arredondamento (configuração do nicho)

- `charm` (Nails): `c = ⌈x⌉; r = c − 0,10; P = r se r ≥ x, senão c + 0,90`.
  Propriedades: monótono não-decrescente e `P ≥ x` — preserva as invariantes.
- `ceilTenth`: teto na primeira casa decimal.
- `none`: 2 casas decimais.

## 5. Invariantes (protegidas por testes)

1. m ↑ ou F ↑ ⇒ P* não diminui.
2. h ↑ ⇒ P* não diminui.
3. R ↑ ⇒ P* não diminui.
4. tx ↑ ou tf ↑ ou M ↑ ⇒ P* não diminui.
5. Determinismo: mesmas entradas ⇒ resultado idêntico.
6. P* ≥ Pmin, sempre.

## 6. Limites e validação

- `R ≥ 50`; `1 ≤ D ≤ 31`; `1 ≤ Hd ≤ 16`; `5 ≤ p ≤ 100`; `5 ≤ duração ≤ 720 min`;
  `0 ≤ tx ≤ 95`; `0 ≤ M ≤ 60`; **`tx + M ≤ 95`** (limite do nicho; acima ⇒ `InvalidFeeError`).
- Itens de custo: `0 ≤ valor ≤ teto do nicho`; soma considera apenas itens do nicho.
- `Hp ≤ 0` ⇒ `InvalidDurationError` (guarda dupla, além do schema).

## 7. Extensibilidade

- Novo modelo: implementar `PricingModelStrategy` e registrar em `models.ts`.
  O piso mínimo e o arredondamento permanecem no motor (universais).
- Novo nicho: novo `NicheConfig` (catálogo, custos, presets, limites, textos,
  rounding) validado pelo mesmo schema. Zero alteração no motor.

## 8. ADRs

| ADR | Decisão |
| --- | --- |
| 001 | Separação Engine ↔ Niche Config (dados validados, nunca `if niche`) |
| 002 | Zod como barreira única de schema |
| 003 | Dedução por divisão (ver §3) |
| 004 | Persistência local (localStorage) até necessidade real de backend |
| 005 | Analytics de funil anonimizado em buffer local, sink trocável |

## 9. Plano de testes (`src/engine/engine.test.ts`)

- Cálculos exatos com fixture de números redondos (assertivas à mão).
- Identidade contábil: `P = m + fixos + taxas + salário + margem`.
- Invariantes §5 com varredura de valores.
- Erros tipados em cada categoria; limites; `charm` monótono.
- Comparação com preço atual: 3 veredictos + projeção mensal.

Quality gate: domínio crítico com cobertura ≥ 80% — sem testes artificiais.
