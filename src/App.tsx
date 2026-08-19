import { useCallback } from "react";
import { readStoredEvents, track } from "./analytics/tracker";
import { Calculator } from "./components/Calculator";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Landing } from "./components/Landing";
import { MethodPage } from "./components/MethodPage";
import { PriceTablePage } from "./components/PriceTablePage";
import { NAILS_CONFIG } from "./engine/nails";
import type { PriceTableItem } from "./engine/types";
import { useHashRoute, useLocalStorage } from "./lib/hooks";

function Logo() {
  return (
    <a href="#/inicio" className="focus-ring group flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center border-2 border-ink bg-lacquer font-mono text-sm font-extrabold text-paper shadow-[3px_3px_0_0_var(--color-ink)] transition-transform group-hover:-rotate-6">
        R$
      </span>
      <span className="leading-none">
        <span className="block font-display text-xl tracking-tight text-ink">
          PREÇO<span className="text-lacquer">PRO</span>
        </span>
        <span className="mt-0.5 block font-mono text-[9px] font-bold tracking-[0.24em] text-ink-soft uppercase">
          powered by pricing engine
        </span>
      </span>
    </a>
  );
}

function Nav({
  route,
  navigate,
  tableCount,
}: {
  route: string;
  navigate: (r: string) => void;
  tableCount: number;
}) {
  const links = [
    { id: "calculadora", label: "Calculadora" },
    { id: "tabela", label: `Tabela${tableCount > 0 ? ` (${tableCount})` : ""}` },
    { id: "metodo", label: "Método" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(l.id)}
              className={`focus-ring cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-wider uppercase transition-all sm:text-sm ${
                route === l.id
                  ? "bg-ink text-paper shadow-[3px_3px_0_0_rgba(200,16,70,0.5)]"
                  : "text-ink hover:bg-blush"
              }`}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => navigate("calculadora")}
            className="focus-ring hidden cursor-pointer bg-lacquer px-4 py-2 font-mono text-xs font-bold tracking-wide text-paper uppercase shadow-[3px_3px_0_0_var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-lacquer-deep md:inline-flex"
          >
            Calcular preço
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer({ navigate }: { navigate: (r: string) => void }) {
  const eventCount = readStoredEvents().length;
  return (
    <footer className="grid-lines border-t-2 border-ink bg-plum py-14 text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <p className="font-display text-2xl">
            PREÇO<span className="text-lacquer">PRO</span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/65">
            Não fazemos uma calculadora por nicho — construímos um{" "}
            <strong className="text-paper">motor de precificação</strong> que entende as
            regras de cada profissão. Nails é a primeira vertical; as próximas chegam quando
            os dados mandarem.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 border border-paper/20 px-3 py-1.5 font-mono text-[11px] tracking-wider text-paper/70 uppercase">
            <span className="live-dot relative inline-block h-1.5 w-1.5 rounded-full bg-jade text-jade" />
            motor v{NAILS_CONFIG.version} · determinístico · testes verdes
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
            Produto
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {(
              [
                ["calculadora", "Calculadora"],
                ["tabela", "Tabela de preços"],
                ["metodo", "Método & fórmulas"],
                ["inicio", "Início"],
              ] as const
            ).map(([r, label]) => (
              <li key={r}>
                <button
                  onClick={() => navigate(r)}
                  className="focus-ring cursor-pointer text-paper/75 transition-colors hover:text-gold"
                >
                  {label} →
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
            Bastidores da validação
          </p>
          <p className="mt-4 text-sm leading-relaxed text-paper/65">
            Este MVP existe para responder uma pergunta:{" "}
            <em className="text-paper">profissionais de nails pagariam por isso?</em>{" "}
            Cada cálculo seu vira um evento anônimo de funil —{" "}
            <strong className="text-paper">{eventCount}</strong> registrados neste navegador.
            Nada sai do seu dispositivo (LGPD: minimização de verdade).
          </p>
          <p className="mt-5 font-mono text-[11px] text-paper/45">
            © {new Date().getFullYear()} PreçoPro · SPEC-001 · feito para ser validado, não
            para impressionar vanity metrics.
          </p>
        </div>
      </div>
    </footer>
  );
}

function AppInner() {
  const { route, navigate } = useHashRoute("inicio");
  const [table, setTable] = useLocalStorage<PriceTableItem[]>("precopro:v1:table", []);

  const addItem = useCallback(
    (item: Omit<PriceTableItem, "id" | "createdAt">) => {
      setTable((prev) => {
        if (prev.length === 0) track("pricing_table_created");
        track("table_item_added", { nome: item.nome, origem: item.origem });
        return [
          ...prev,
          { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() },
        ];
      });
    },
    [setTable],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<Omit<PriceTableItem, "id" | "createdAt">>) => {
      setTable((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    [setTable],
  );

  const removeItem = useCallback(
    (id: string) => {
      track("table_item_removed");
      setTable((prev) => prev.filter((i) => i.id !== id));
    },
    [setTable],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Nav route={route} navigate={navigate} tableCount={table.length} />
      <main className="flex-1">
        {route === "calculadora" ? (
          <Calculator onAddToTable={addItem} />
        ) : route === "tabela" ? (
          <PriceTablePage
            items={table}
            onUpdate={updateItem}
            onRemove={removeItem}
            onNavigate={navigate}
          />
        ) : route === "metodo" ? (
          <MethodPage />
        ) : (
          <Landing onNavigate={navigate} />
        )}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
