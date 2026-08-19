import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { track } from "../analytics/tracker";
import { brl, brl0, num } from "../lib/format";
import { useCountUp, useInView } from "../lib/hooks";
import { feeAmount } from "../engine/math";
import { listModels } from "../engine/models";
import { Accordion, Button, Chip, Kicker, NumberField, Reveal } from "./ui";

const TAXA_EXEMPLO = 2.5; // % — maquininha padrão usada nos exemplos rápidos

/* ============================ Raio-X relâmpago ============================ */

function RaioX({ onGoFull }: { onGoFull: () => void }) {
  const [preco, setPreco] = useState(80);
  const [durMin, setDurMin] = useState(120);
  const [material, setMaterial] = useState<number | null>(25);

  const mat = material ?? 0;
  const horas = durMin / 60;
  const taxa = feeAmount(preco, TAXA_EXEMPLO, 0);
  const sobra = preco - taxa - mat;
  const sobraHora = sobra / horas;
  const animado = useCountUp(sobraHora);

  const pMat = Math.min(100, (mat / preco) * 100);
  const pTaxa = Math.min(100 - pMat, (taxa / preco) * 100);
  const pSobra = Math.max(0, 100 - pMat - pTaxa);

  const sinal =
    sobraHora < 0
      ? { texto: "Preço negativo: você paga para trabalhar.", cor: "text-lacquer" }
      : sobraHora < 20
        ? { texto: "Sobra pouco — seus fixos ainda comem isso.", cor: "text-gold" }
        : sobraHora < 40
          ? { texto: "No caminho. Confirme no cálculo completo.", cor: "text-jade" }
          : { texto: "Sobra bruta boa. Valide no cálculo completo.", cor: "text-jade" };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="animate-float absolute -top-6 -left-4 z-10 rotate-[-6deg] border-2 border-ink bg-gold px-3 py-1.5 font-mono text-xs font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
        style={{ "--tilt": "-6deg" } as CSSProperties}
      >
        quanto sobra?
      </div>
      <div
        aria-hidden
        className="animate-float absolute -right-3 -bottom-5 z-10 rotate-[4deg] border-2 border-ink bg-paper px-3 py-1.5 font-mono text-xs font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
        style={{ "--tilt": "4deg", animationDelay: "1.2s" } as CSSProperties}
      >
        e o aluguel? e o MEI?
      </div>

      <div className="relative -rotate-1 border-2 border-ink bg-plum p-6 text-paper shadow-[10px_10px_0_0_rgba(200,16,70,0.55)] transition-transform duration-300 hover:rotate-0 sm:p-8">
        <div className="halftone-dark pointer-events-none absolute inset-0" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
              Raio-X relâmpago
            </p>
            <span className="live-dot relative inline-block h-2 w-2 rounded-full bg-jade text-jade" />
          </div>
          <h2 className="mt-2 font-display text-2xl leading-tight">
            Teste o preço que você cobra hoje
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="raiox-preco" className="text-sm font-semibold text-paper/80">
                  Seu preço atual
                </label>
                <span className="price-tick font-mono text-xl font-bold text-gold">
                  {brl0(preco)}
                </span>
              </div>
              <input
                id="raiox-preco"
                type="range"
                min={20}
                max={300}
                step={5}
                value={preco}
                onChange={(e) => setPreco(Number(e.target.value))}
                className="focus-ring w-full cursor-pointer accent-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-paper/80">Duração</span>
                <select
                  value={durMin}
                  onChange={(e) => setDurMin(Number(e.target.value))}
                  className="focus-ring w-full cursor-pointer border-2 border-paper/25 bg-plum-2 px-3 py-2.5 font-mono text-sm font-semibold text-paper"
                >
                  <option value={45}>45 min</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 horas</option>
                  <option value={150}>2h30</option>
                </select>
              </label>
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-paper/80">
                  Material (R$)
                </span>
                <div className="[&_input]:border-paper/25 [&_input]:bg-plum-2 [&_input]:text-paper [&_input]:text-sm">
                  <NumberField value={material} onValue={setMaterial} placeholder="25" compact />
                </div>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-paper/20 pt-5">
              <p className="font-mono text-[11px] tracking-[0.18em] text-paper/60 uppercase">
                Sobra bruta por hora
              </p>
              <p
                className={`price-tick mt-1 font-mono text-5xl font-extrabold tracking-tight ${
                  sobraHora < 0 ? "text-lacquer" : "text-paper"
                }`}
              >
                {brl(Math.round(animado * 100) / 100)}
                <span className="text-lg font-semibold text-paper/50">/h</span>
              </p>

              <div className="mt-4 flex h-4 w-full overflow-hidden border border-paper/25">
                <div className="bar-anim bg-gold" style={{ width: `${pMat}%` }} />
                <div className="bar-anim bg-plum-3" style={{ width: `${pTaxa}%` }} />
                <div
                  className={`bar-anim ${sobraHora < 0 ? "bg-lacquer" : "bg-jade"}`}
                  style={{ width: `${pSobra}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-wider text-paper/60 uppercase">
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 bg-gold" /> material {brl(mat)}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 bg-plum-3" /> taxa {brl(taxa)}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className={`h-2 w-2 ${sobraHora < 0 ? "bg-lacquer" : "bg-jade"}`} /> sobra{" "}
                  {brl(sobra)}
                </span>
              </div>

              <p className={`mt-4 text-sm font-semibold ${sinal.cor}`}>{sinal.texto}</p>
              <p className="mt-1 text-xs text-paper/55">
                Estimativa rápida (taxa {num(TAXA_EXEMPLO)}%, sem custos fixos). O cálculo
                completo inclui jornada, fixos, meta de renda e margem.
              </p>

              <Button variant="gold" className="mt-5 w-full" onClick={onGoFull}>
                Fazer o cálculo completo →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== Seções =================================== */

function Marquee() {
  const itens = [
    ["NAILS", "em validação"],
    ["BEAUTY", "no radar"],
    ["DELIVERY", "no radar"],
    ["CONFEITARIA", "no radar"],
    ["FREELANCER", "no radar"],
    ["FOTOGRAFIA", "no radar"],
    ["ELETRICISTA", "no radar"],
    ["ARTESANATO", "no radar"],
    ["CONSULTORIA", "no radar"],
  ] as const;
  const faixa = (key: string) => (
    <div key={key} className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {itens.map(([nome, status]) => (
        <span
          key={`${key}-${nome}`}
          className="flex items-center gap-3 px-6 font-display text-sm tracking-wide whitespace-nowrap uppercase"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status === "em validação" ? "bg-jade" : "bg-paper/40"
            }`}
          />
          {nome}
          <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-paper/60 lowercase">
            {status}
          </span>
          <span className="pl-6 text-gold">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-y-2 border-ink bg-lacquer py-3.5 text-paper">
      <div className="animate-marquee flex w-max">
        {faixa("a")}
        {faixa("b")}
      </div>
    </div>
  );
}

function Problema() {
  const exemplo = useMemo(() => {
    const preco = 80;
    const horas = 2;
    const material = 25;
    const taxa = feeAmount(preco, TAXA_EXEMPLO, 0);
    const sobra = preco - taxa - material;
    return { preco, material, taxa, sobra, porHora: sobra / horas };
  }, []);

  const doer = [
    {
      n: "01",
      t: "Preço pela concorrência",
      d: "A outra nail designer não tem o seu aluguel, nem a sua meta, nem o seu material. O preço dela não paga a sua conta.",
    },
    {
      n: "02",
      t: "Faturamento ≠ lucro",
      d: "Agenda cheia e dinheiro curto: quando o preço está errado, trabalhar MAIS é o que menos resolve.",
    },
    {
      n: "03",
      t: "Hora que não fecha",
      d: "Sem dividir o preço pelas horas reais, ninguém sabe quanto a própria hora rende — e o que ela deveria render.",
    },
    {
      n: "04",
      t: "Medo de reajustar",
      d: "Sem um número que sustente a conversa, aumentar preço vira um ato de fé — e a maioria adia para nunca.",
    },
  ];

  return (
    <section className="halftone-light relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div>
          <Reveal>
            <Kicker>O problema</Kicker>
            <h2 className="font-display text-4xl leading-[1.02] sm:text-5xl">
              Preço “no feeling” <span className="text-lacquer">custa caro.</span>
            </h2>
          </Reveal>
          <div className="mt-10 space-y-8">
            {doer.map((item, i) => (
              <Reveal key={item.n} delay={i * 90}>
                <div className="group flex gap-5 border-t-2 border-ink/10 pt-6 transition-colors">
                  <span className="font-mono text-sm font-extrabold text-lacquer/70 transition-colors group-hover:text-lacquer">
                    {item.n}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-ink">{item.t}</h3>
                    <p className="mt-1.5 max-w-md text-ink-soft">{item.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={150}>
          <div className="sticky top-28 border-2 border-ink bg-ink p-7 text-paper shadow-[8px_8px_0_0_var(--color-lacquer)]">
            <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
              Exemplo real do motor
            </p>
            <h3 className="mt-2 font-display text-2xl leading-tight">
              Alongamento a {brl0(exemplo.preco)} parece bom. Até abrir a conta:
            </h3>
            <dl className="price-tick mt-6 space-y-2.5 font-mono text-sm">
              <div className="flex justify-between border-b border-paper/15 pb-2">
                <dt className="text-paper/70">Preço cobrado</dt>
                <dd className="font-bold">{brl(exemplo.preco)}</dd>
              </div>
              <div className="flex justify-between border-b border-paper/15 pb-2">
                <dt className="text-paper/70">Taxa da maquininha</dt>
                <dd className="text-lacquer font-bold">− {brl(exemplo.taxa)}</dd>
              </div>
              <div className="flex justify-between border-b border-paper/15 pb-2">
                <dt className="text-paper/70">Material</dt>
                <dd className="text-lacquer font-bold">− {brl(exemplo.material)}</dd>
              </div>
              <div className="flex justify-between border-b border-paper/15 pb-2">
                <dt className="text-paper/70">Sobra (2 horas de trabalho)</dt>
                <dd className="font-bold">{brl(exemplo.sobra)}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <dt className="text-paper/70">Por hora, antes dos fixos</dt>
                <dd className="text-3xl font-extrabold text-gold">{brl(exemplo.porHora)}</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm text-paper/65">
              E ainda faltam aluguel, MEI, energia — e o seu salário. O motor calcula o preço
              que cobre <em>tudo isso</em> e ainda bate sua meta.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Motor() {
  const etapas = [
    { t: "Suas entradas", d: "meta, jornada, custos, serviço" },
    { t: "Schema (Zod)", d: "inválido não entra no motor" },
    { t: "Pricing Engine", d: "matemática determinística" },
    { t: "Config do nicho", d: "nails hoje, outros amanhã" },
    { t: "Resultado", d: "preço + auditoria completa" },
  ];
  return (
    <section className="grid-lines relative overflow-hidden bg-plum py-24 text-paper sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <Kicker light>Por dentro do motor</Kicker>
          <h2 className="max-w-2xl font-display text-4xl leading-[1.02] sm:text-5xl">
            Um motor. <span className="text-gold">Muitos nichos.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-paper/70">
            Não fazemos uma calculadora por nicho. O Pricing Engine entende as regras de cada
            profissão por <strong className="text-paper">configuração</strong> — zero{" "}
            <code className="font-mono text-sm text-gold">if (nicho === ...)</code>.
          </p>
        </Reveal>

        <div className="mt-14 flex flex-wrap items-stretch gap-3">
          {etapas.map((e, i) => (
            <Reveal key={e.t} delay={i * 80} className="flex items-center gap-3">
              <div className="group h-full border-2 border-paper/25 bg-plum-2 px-5 py-4 transition-all duration-200 hover:-translate-y-1 hover:border-gold">
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-gold uppercase">
                  etapa {i + 1}
                </p>
                <p className="mt-1 font-display text-lg">{e.t}</p>
                <p className="mt-0.5 text-xs text-paper/60">{e.d}</p>
              </div>
              {i < etapas.length - 1 && (
                <svg width="22" height="14" viewBox="0 0 22 14" className="hidden shrink-0 text-lacquer sm:block" aria-hidden>
                  <path d="M0 7h18M13 1l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" />
                </svg>
              )}
            </Reveal>
          ))}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <div className="border-2 border-paper/20 bg-ink/60 p-6">
              <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-paper/50 uppercase">
                Fórmula oficial do modelo “meta de renda”
              </p>
              <p className="price-tick mt-4 overflow-x-auto font-mono text-lg font-semibold whitespace-nowrap text-gold sm:text-xl">
                P* = (hc × h + m + tf) ÷ (1 − (tx + M)/100)
              </p>
              <div className="mt-4 grid gap-x-8 gap-y-1.5 font-mono text-xs text-paper/65 sm:grid-cols-2">
                <p>hc = (custos fixos + meta) ÷ horas produtivas</p>
                <p>h = duração do serviço em horas</p>
                <p>m = material por serviço · tf = taxa fixa</p>
                <p>tx = taxa % · M = margem de segurança</p>
              </div>
              <a
                href="#/metodo"
                className="focus-ring mt-5 inline-block font-mono text-sm font-bold text-gold underline decoration-2 underline-offset-4 transition-colors hover:text-paper"
              >
                Ver a especificação completa →
              </a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex h-full flex-col justify-between gap-5 border-2 border-paper/20 p-6">
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-paper/50 uppercase">
                  Modelos registrados no motor
                </p>
                <ul className="mt-4 space-y-3">
                  {listModels().map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{m.label}</p>
                        <p className="font-mono text-[11px] text-paper/50">{m.formula}</p>
                      </div>
                      <Chip tone={m.id === "target-income" ? "gold" : "paper"}>
                        {m.id === "target-income" ? "ativo" : "reserva"}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-paper/60">
                Determinístico · testado · auditável — o mesmo resultado, para sempre, para a
                mesma entrada.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Oferta({ onCalcular }: { onCalcular: () => void }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [aceite, setAceite] = useState(false);
  const [reservado, setReservado] = useState(false);

  useEffect(() => {
    if (inView) track("offer_viewed");
  }, [inView]);

  const emailOk = /.+@.+\..+/.test(email);

  return (
    <section ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
          <Reveal>
            <Kicker>Validação aberta</Kicker>
            <h2 className="font-display text-4xl leading-[1.02] sm:text-5xl">
              Quanto custa saber <span className="text-lacquer">seu número?</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Transparência total: o PreçoPro Nails está em validação e{" "}
              <strong className="text-ink">o preço abaixo é uma hipótese</strong> — seu uso e
              seu feedback decidem se ele fica. A calculadora, você já pode usar agora.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Calculadora completa com meta de renda e jornada real",
                "Comparação direta com o preço que você cobra hoje",
                "Tabela de preços pronta para mandar no WhatsApp",
                "Método de cálculo 100% aberto, sem caixa-preta",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" className="mt-0.5 shrink-0 text-jade" aria-hidden>
                    <path d="M3 10.5 8 15.5 17 5" stroke="currentColor" strokeWidth="2.6" fill="none" />
                  </svg>
                  <span className="text-ink">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140}>
            <div className="relative rotate-1 border-2 border-ink bg-gold p-8 shadow-[10px_10px_0_0_var(--color-ink)] transition-transform duration-300 hover:rotate-0">
              <div className="pointer-events-none absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-ink bg-paper" />
              <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-ink/70 uppercase">
                Lançamento · pagamento único
              </p>
              <p className="price-tick mt-3 font-mono text-6xl font-extrabold tracking-tight text-ink">
                R$ 19,90
              </p>
              <p className="mt-2 font-mono text-xs font-semibold tracking-wider text-ink/70 uppercase">
                preço de validação — pode mudar
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  variant="dark"
                  onClick={() => {
                    track("checkout_started");
                    setAberto(true);
                  }}
                >
                  Quero garantir esse preço
                </Button>
                <Button variant="outline" onClick={onCalcular}>
                  Calcular grátis agora →
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-md border-2 border-ink bg-paper p-8 shadow-[10px_10px_0_0_var(--color-lacquer)]"
            onClick={(e) => e.stopPropagation()}
          >
            {reservado ? (
              <>
                <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-jade uppercase">
                  Reserva confirmada ✓
                </p>
                <h3 className="mt-2 font-display text-2xl">Preço garantido!</h3>
                <p className="mt-3 text-ink-soft">
                  Quando o checkout abrir, seu lugar na fila de R$ 19,90 está guardado. A
                  reserva ficou salva <strong>somente no seu navegador</strong>.
                </p>
                <Button className="mt-6 w-full" onClick={() => setAberto(false)}>
                  Voltar
                </Button>
              </>
            ) : (
              <>
                <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-lacquer uppercase">
                  Checkout em breve
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight">
                  Reserve o preço de lançamento
                </h3>
                <p className="mt-3 text-sm text-ink-soft">
                  O pagamento entra no ar junto com o lançamento. Deixe seu e-mail para
                  garantir os R$ 19,90 — ele fica salvo{" "}
                  <strong>apenas no seu navegador</strong> (nada vai para servidores).
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="focus-ring mt-5 w-full border-2 border-ink/20 bg-white px-4 py-3 font-mono text-sm"
                />
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={aceite}
                    onChange={(e) => setAceite(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#c81046]"
                  />
                  Entendo que meu e-mail fica armazenado apenas neste navegador e posso apagá-lo
                  quando quiser (LGPD).
                </label>
                <Button
                  className="mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!emailOk || !aceite}
                  onClick={() => {
                    try {
                      localStorage.setItem("precopro:v1:waitlist", JSON.stringify({ ts: Date.now() }));
                    } catch {
                      /* sem storage */
                    }
                    track("waitlist_joined");
                    setReservado(true);
                  }}
                >
                  Reservar por R$ 19,90
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24 sm:pb-32">
      <Reveal>
        <Kicker>Perguntas diretas</Kicker>
        <h2 className="mb-8 font-display text-3xl sm:text-4xl">Antes que você pergunte:</h2>
      </Reveal>
      <Reveal delay={100}>
        <Accordion
          items={[
            {
              q: "Isso é assinatura?",
              a: "Não. O plano de lançamento é pagamento único. Assinatura só existiria — e só faria sentido — se o produto evoluir para um SaaS com valor recorrente claro. Hoje, simples: paga uma vez, usa.",
            },
            {
              q: "Onde ficam os meus números?",
              a: "No seu navegador. O MVP roda 100% no seu dispositivo (localStorage): nada de conta, nada de servidor, nada de dado pessoal enviado a terceiros. É a nossa leitura prática da LGPD: minimizar.",
            },
            {
              q: "Serve para a minha cidade e o meu salão?",
              a: "O motor não chuta valores de mercado — ele calcula com os SEUS custos, a SUA jornada e a SUA meta. Por isso funciona em capital e interior: quem define a realidade é você, o motor faz a conta fechar.",
            },
            {
              q: "E os outros nichos (delivery, confeitaria...)?",
              a: "Estão no radar, não no forno. Cada vertical nova só recebe investimento depois que a anterior provar valor real — é assim que o Pricing Engine cresce sem virar um frankenstein.",
            },
          ]}
        />
      </Reveal>
    </section>
  );
}

/* ================================ Página ================================= */

export function Landing({ onNavigate }: { onNavigate: (r: string) => void }) {
  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <>
      {/* Abertura: a ferramenta falando primeiro */}
      <section className="relative overflow-hidden">
        <div className="halftone-light pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24 lg:pb-32">
          <div>
            <Reveal>
              <Chip tone="lacquer">
                <span className="live-dot relative inline-block h-1.5 w-1.5 rounded-full bg-lacquer text-lacquer" />
                produto em validação ativa
              </Chip>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-7xl">
                Você sabe quanto <span className="underline decoration-lacquer decoration-8 underline-offset-4">cobra</span>.
                <br />
                Sabe quanto <span className="text-lacquer">precisa</span> cobrar?
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-7 max-w-xl text-lg text-ink-soft sm:text-xl">
                O PreçoPro Nails transforma seus custos, seu tempo, suas taxas e sua meta de
                renda em um <strong className="text-ink">preço recomendado com auditoria completa</strong> —
                e compara com o que você cobra hoje.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button onClick={() => onNavigate("calculadora")}>
                  Calcular meu preço →
                </Button>
                <Button variant="outline" onClick={() => onNavigate("metodo")}>
                  Ver o método
                </Button>
              </div>
              <p className="mt-6 font-mono text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
                2 minutos · sem planilha · sem cadastro · seu número, não o da concorrência
              </p>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <RaioX onGoFull={() => onNavigate("calculadora")} />
          </Reveal>
        </div>
      </section>

      <Marquee />
      <Problema />
      <Motor />
      <Oferta onCalcular={() => onNavigate("calculadora")} />
      <Faq />

      {/* Fechamento */}
      <section className="stripes-gold border-y-2 border-ink p-1">
        <div className="bg-plum py-20 text-center text-paper">
          <Reveal>
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">
              Pare de chutar. <span className="text-gold">Calcule.</span>
            </h2>
            <Button variant="gold" className="mt-8" onClick={() => onNavigate("calculadora")}>
              Abrir a calculadora →
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
