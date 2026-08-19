# PREÇOPRO / PRICING ENGINE

> Tese: **não queremos criar uma calculadora para cada nicho — queremos criar um motor de
> precificação capaz de entender as particularidades de cada nicho.**

**PreçoPro Nails** é a primeira vertical (manicures, nail designers, alongamentos).
O **Pricing Engine** é o ativo tecnológico principal; a plataforma multinicho é a visão de
longo prazo.

Status: **validação ativa do MVP** — a hipótese comercial ainda precisa ser provada
(§4 do Documento Mestre). Nada aqui trata hipótese como fato.

---

## O que o MVP faz

| Área | Estado |
| --- | --- |
| Landing page com raio-x interativo | ✅ |
| Calculadora em 6 passos (meta → jornada → custos → serviço → taxas → preço atual) | ✅ |
| Pricing Engine determinístico (`src/engine/`) | ✅ |
| Configuração do nicho Nails (`src/engine/nails.ts`) | ✅ |
| Resultado auditável + comparação com preço atual | ✅ |
| Tabela de preços (edição + copiar p/ WhatsApp) | ✅ |
| Página "Método" (SPEC-001 em linguagem humana) | ✅ |
| Analytics de funil anonimizado, buffer local (LGPD) | ✅ |
| Error Boundary | ✅ |
| Testes Vitest: cálculos, limites, invariantes | ✅ |
| CI (typecheck → test → build) | ✅ |

Fora do MVP (deliberadamente): backend, auth, assinatura, WhatsApp API, IA, mobile, CRM.

## Rodando

```bash
npm install
npm run dev        # desenvolvimento
npx vitest run     # testes do motor (meta: domínio crítico ≥ 80%)
npx tsc --noEmit   # typecheck strict
npm run build      # produção
```

## Arquitetura

```
UI (React)  →  DOMAIN (types/errors)  →  PRICING ENGINE (engine.ts)
                                              ↑
                                  NICHE CONFIG (nails.ts, validada por Zod)
```

- `src/engine/engine.ts` — fachada pura: `calculate(config, input) → PricingResult`.
- `src/engine/models.ts` — registro de estratégias (`target-income` ativo, `cost-plus-margin` registrado).
- `src/engine/schema.ts` — barreira Zod; nada chega ao motor sem parse.
- `src/engine/errors.ts` — erros tipados com `code` estável + issues localizáveis.
- `src/engine/math.ts` — fórmulas puras e documentadas (F1–F8).
- `src/analytics/tracker.ts` — eventos de funil sem dado pessoal, sink trocável.

Regra de ouro: diferenças entre nichos são **configuração validada**, nunca
`if (niche === "...")`. Novo nicho = novo arquivo em `niches/` + landing própria.

## Documentação

- `docs/SPEC-001-pricing-engine-core.md` — especificação formal do motor (fórmulas,
  premissas, invariantes, erros, plano de testes).
- Página `#/metodo` da aplicação — a mesma spec em linguagem de usuária.
- ADRs resumidas na SPEC-001 (001 separação engine/nicho, 002 Zod, 003 dedução por
  divisão, 004 localStorage, 005 analytics local).

## Próximos passos (decisão pendente de dados)

1. Trafegar → medir funil (landing → calculadora → resultado → oferta).
2. Critério de sinal positivo: **5+ vendas reais e repetíveis**.
3. Sinal de ajuste: muito uso e pouca compra → revisar preço/posicionamento.
4. Só depois: SPEC-002 (próxima vertical) e evolução para SaaS.
