import { useEffect, type ReactNode } from "react";
import { track } from "../analytics/tracker";
import { listModels } from "../engine/models";
import { Chip, Kicker, Reveal } from "./ui";

function FormulaBlock({ title, formula, children }: { title: string; formula: string; children?: ReactNode }) {
  return (
    <div className="border-2 border-ink bg-white/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(200,16,70,0.35)]">
      <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-lacquer uppercase">{title}</p>
      <p className="price-tick mt-2 overflow-x-auto font-mono text-base font-bold whitespace-nowrap text-ink sm:text-lg">
        {formula}
      </p>
      {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

const variaveis = [
  ["R", "Meta de renda mensal — o salário líquido que você quer levar pra casa", "você informa"],
  ["F", "Custos fixos mensais (aluguel, MEI, energia, marketing...)", "você informa"],
  ["D, Hd", "Dias por mês e horas por dia de trabalho", "você informa"],
  ["p", "% do tempo produtivo (o resto é limpeza, atraso, troca)", "você informa"],
  ["Hp", "Horas produtivas: D × Hd × p/100", "motor calcula"],
  ["hc", "Hora cheia: quanto cada hora produtiva precisa render", "motor calcula"],
  ["h", "Duração do serviço em horas", "você informa"],
  ["m", "Custo de material por atendimento", "você informa"],
  ["tf", "Taxa fixa por serviço", "você informa"],
  ["tx", "Taxa percentual sobre o preço (maquininha)", "você informa"],
  ["M", "Margem de segurança sobre o preço final", "você informa"],
] as const;

const erros = [
  ["INVALID_PRICING_INPUT", "Entrada fora dos intervalos aceitos", "antes do cálculo"],
  ["INVALID_NICHE_CONFIG", "Configuração do nicho rejeitada pelo schema", "antes do cálculo"],
  ["UNSUPPORTED_PRICING_MODEL", "Modelo não registrado no motor", "durante o cálculo"],
  ["INVALID_COST", "Custo negativo ou acima do teto", "antes do cálculo"],
  ["INVALID_DURATION", "Duração ou horas produtivas impossíveis", "antes/durante"],
  ["INVALID_FEE", "Taxas + margem ≥ limite (fórmula indefinida)", "antes do cálculo"],
] as const;

const adrs = [
  {
    id: "ADR-001",
    t: "Separação Pricing Engine ↔ Configuração de Nicho",
    d: "Diferenças entre nichos são DADOS (schema validado), nunca condicionais no motor. Novo nicho = novo arquivo de configuração.",
  },
  {
    id: "ADR-002",
    t: "Zod como barreira de schema",
    d: "Nenhuma configuração ou entrada chega ao motor sem parse. Erros de schema viram erros tipados do domínio.",
  },
  {
    id: "ADR-003",
    t: "Dedução por divisão, não por multiplicação",
    d: "Taxas incidem SOBRE o preço final. P = base ÷ (1 − d) garante que, após descontar d% do preço, reste exatamente a base — multiplicar por (1 + d) subcobraria.",
  },
  {
    id: "ADR-004",
    t: "Persistência local (localStorage)",
    d: "MVP sem backend: rascunho, tabela e eventos vivem no navegador. Backend só entra com necessidade real (conta, pagamento, sync).",
  },
  {
    id: "ADR-005",
    t: "Analytics como buffer local anonimizado",
    d: "Eventos de funil sem dado pessoal, com sink trocável. Validação comercial é objetivo central — medir não é opcional.",
  },
];

export function MethodPage() {
  useEffect(() => {
    track("method_viewed");
  }, []);

  return (
    <section className="halftone-light relative py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <Kicker>Método aberto · SPEC-001</Kicker>
          <h1 className="font-display text-4xl leading-[1.02] sm:text-5xl">
            Sem caixa-preta: <span className="text-lacquer">a conta inteira, aberta.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-soft">
            Todo número que o PreçoPro mostra nasce das fórmulas abaixo — determinísticas,
            testadas e auditáveis. Se você discorda de uma premissa, o lugar de mexer é aqui,
            não “no feeling”.
          </p>
        </Reveal>

        {/* Variáveis */}
        <Reveal delay={80}>
          <h2 className="mt-16 mb-5 font-display text-2xl">1 · Variáveis</h2>
          <div className="overflow-x-auto border-2 border-ink bg-white/70">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink bg-ink font-mono text-[11px] tracking-[0.18em] text-paper uppercase">
                  <th className="px-4 py-3">Símbolo</th>
                  <th className="px-4 py-3">Significado</th>
                  <th className="px-4 py-3">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {variaveis.map(([s, m, o]) => (
                  <tr key={s} className="transition-colors hover:bg-blush/50">
                    <td className="px-4 py-2.5 font-mono font-extrabold text-lacquer">{s}</td>
                    <td className="px-4 py-2.5 text-ink">{m}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft uppercase">{o}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Fórmulas */}
        <Reveal delay={80}>
          <h2 className="mt-16 mb-5 font-display text-2xl">2 · Fórmulas oficiais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormulaBlock title="F1 · Horas produtivas" formula="Hp = D × Hd × p/100">
              Ninguém fatura 100% do tempo. A conta fecha com as horas que realmente rendem.
            </FormulaBlock>
            <FormulaBlock title="F2 · Hora cheia" formula="hc = (F + R) ÷ Hp">
              Cada hora produtiva precisa pagar sua parte dos fixos E do seu salário.
            </FormulaBlock>
            <FormulaBlock title="F3 · Preço recomendado" formula="P* = (hc × h + m + tf) ÷ (1 − (tx + M)/100)">
              A base cobre tempo + material + taxa fixa; a divisão embute as deduções que
              incidem sobre o preço final (ver ADR-003).
            </FormulaBlock>
            <FormulaBlock title="F4 · Piso mínimo" formula="Pmin = (F/Hp × h + m + tf) ÷ (1 − tx/100)">
              Sem salário, sem margem: abaixo disso, o serviço dá prejuízo contábil.
            </FormulaBlock>
            <FormulaBlock title="F5 · Taxas" formula="fees(P) = P × tx/100 + tf" />
            <FormulaBlock title="F6 · Líquido por serviço" formula="L(P) = P − fees(P) − m − F/Hp × h">
              O que vai pro seu bolso: salário alocado + margem de segurança.
            </FormulaBlock>
            <FormulaBlock title="F7 · Ponto de equilíbrio" formula="Qe = ⌈F ÷ CM⌉, CM = P − fees(P) − m">
              Quantos serviços pagam os custos fixos do mês (análise de contribuição).
            </FormulaBlock>
            <FormulaBlock title="F8 · Serviços para a meta" formula="Qm = ⌈R ÷ L(P)⌉">
              Comparado com a capacidade ⌊Hp ÷ h⌋ — se Qm &gt; capacidade, o motor avisa que a
              meta não cabe na agenda.
            </FormulaBlock>
          </div>
        </Reveal>

        {/* Modelos */}
        <Reveal delay={80}>
          <h2 className="mt-16 mb-5 font-display text-2xl">3 · Modelos registrados</h2>
          <div className="space-y-3">
            {listModels().map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white/70 px-5 py-4"
              >
                <div>
                  <p className="font-display text-lg">{m.label}</p>
                  <p className="price-tick font-mono text-sm text-ink-soft">{m.formula}</p>
                </div>
                <Chip tone={m.id === "target-income" ? "lacquer" : "ink"}>
                  {m.id === "target-income" ? "ativo em Nails" : "registrado p/ futuro"}
                </Chip>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Arredondamento */}
        <Reveal delay={80}>
          <h2 className="mt-16 mb-5 font-display text-2xl">4 · Arredondamento (config do nicho)</h2>
          <div className="border-2 border-ink bg-plum p-6 text-paper">
            <p className="font-mono text-sm text-paper/80">
              Nails usa <strong className="text-gold">charm pricing (R$ X,90)</strong>: c = ⌈x⌉;
              r = c − 0,10; se r ≥ x então P = r, senão P = c + 0,90.
            </p>
            <p className="mt-3 text-sm text-paper/60">
              Ex.: 115,38 → R$ 115,90 · 85,92 → R$ 86,90. A regra é monótona: nunca reduz o
              preço bruto, então as invariantes continuam valendo depois do arredondamento.
              Outros nichos podem usar teto decimal ou arredondamento simples — é configuração.
            </p>
          </div>
        </Reveal>

        {/* Premissas e invariantes */}
        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="mb-5 font-display text-2xl">5 · Premissas declaradas</h2>
            <ul className="space-y-3">
              {[
                "Toda hora produtiva vale igual — independente do serviço (a duração ajusta a fatia).",
                "Custos fixos são mensais e existem com ou sem cliente.",
                "Taxas percentuais incidem sobre o preço final — por isso a divisão na fórmula.",
                "Margem de segurança é buffer do negócio, não é lucro garantido.",
                "Salário (R) e margem (M) são conceitos separados e somam no líquido.",
                "Materiais são variáveis: entram por serviço, nunca no fixo.",
              ].map((p) => (
                <li key={p} className="flex gap-3 border-l-4 border-gold bg-white/70 p-3.5 text-sm text-ink">
                  <span className="font-mono font-extrabold text-lacquer">§</span> {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mb-5 font-display text-2xl">6 · Invariantes protegidas por testes</h2>
            <ul className="space-y-3">
              {[
                "Custo (material ou fixo) aumenta ⇒ preço recomendado NUNCA diminui.",
                "Duração do serviço aumenta ⇒ preço NUNCA diminui.",
                "Meta de renda aumenta ⇒ preço NUNCA diminui.",
                "Qualquer taxa adicional ⇒ preço final NUNCA diminui.",
                "Mesmas entradas ⇒ resultado idêntico (determinismo).",
                "Preço recomendado ≥ piso mínimo, sempre.",
              ].map((p) => (
                <li key={p} className="flex gap-3 border-l-4 border-jade bg-white/70 p-3.5 text-sm text-ink">
                  <span className="font-mono font-extrabold text-jade">∀</span> {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Erros */}
        <Reveal delay={80}>
          <h2 className="mt-16 mb-5 font-display text-2xl">7 · Catálogo de erros tipados</h2>
          <div className="overflow-x-auto border-2 border-ink bg-white/70">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink bg-ink font-mono text-[11px] tracking-[0.18em] text-paper uppercase">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Significado</th>
                  <th className="px-4 py-3">Quando ocorre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {erros.map(([c, m, q]) => (
                  <tr key={c} className="transition-colors hover:bg-blush/50">
                    <td className="px-4 py-2.5 font-mono text-xs font-extrabold text-lacquer">{c}</td>
                    <td className="px-4 py-2.5">{m}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft uppercase">{q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* ADRs */}
        <Reveal delay={80}>
          <h2 className="mt-16 mb-5 font-display text-2xl">8 · Decisões de arquitetura (ADRs)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {adrs.map((a) => (
              <div key={a.id} className="border-2 border-ink bg-white/70 p-5">
                <p className="font-mono text-xs font-extrabold tracking-[0.18em] text-lacquer uppercase">
                  {a.id}
                </p>
                <p className="mt-1.5 font-bold text-ink">{a.t}</p>
                <p className="mt-1.5 text-sm text-ink-soft">{a.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl font-mono text-xs leading-relaxed text-ink-soft">
            Documento completo: <span className="font-bold">docs/SPEC-001-pricing-engine-core.md</span>{" "}
            no repositório — a versão canônica desta página, com exemplos numéricos e o plano
            de testes.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
