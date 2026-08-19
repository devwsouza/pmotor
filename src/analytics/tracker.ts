/**
 * Analytics de produto — MVP (ADR-005).
 *
 * Responde: "o usuário está usando? onde o funil quebra?"
 * Princípios (LGPD/minimização):
 *  - nenhum dado pessoal é coletado (sem nome, sem e-mail, sem IP);
 *  - sessionId é aleatório e vive só na memória da aba;
 *  - eventos ficam em buffer local (máx. 500) para inspeção do time;
 *  - quando houver ferramenta definitiva, basta trocar o sink.
 */

export type AnalyticsEventName =
  | "landing_view"
  | "calculator_started"
  | "step_completed"
  | "calculator_completed"
  | "result_viewed"
  | "price_comparison_viewed"
  | "pricing_table_created"
  | "table_item_added"
  | "table_item_removed"
  | "table_copied"
  | "method_viewed"
  | "offer_viewed"
  | "checkout_started"
  | "waitlist_joined"
  | "engine_error";

export interface StoredEvent {
  readonly name: AnalyticsEventName;
  readonly ts: number;
  readonly sessionId: string;
  readonly props: Readonly<Record<string, string | number | boolean>>;
}

const STORAGE_KEY = "precopro:v1:analytics";
const MAX_EVENTS = 500;

const sessionId = Math.random().toString(36).slice(2, 10);

function sanitize(
  props: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!props) return out;
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function track(
  name: AnalyticsEventName,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  const event: StoredEvent = {
    name,
    ts: Date.now(),
    sessionId,
    props: sanitize(props as Record<string, unknown> | undefined),
  };

  try {
    const existing = readStoredEvents();
    const next = [...existing, event].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // armazenamento indisponível (modo privado) — analytics não pode quebrar o app
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[analytics] ${name}`, event.props);
  }
}

export function readStoredEvents(): readonly StoredEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredEvent[]) : [];
  } catch {
    return [];
  }
}
