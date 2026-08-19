/**
 * Formatação pt-BR — camada de apresentação.
 * O motor trabalha sempre com números; a formatação acontece apenas aqui.
 */

const brlFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlFmt0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function brl(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return brlFmt.format(value);
}

export function brl0(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return brlFmt0.format(value);
}

export function num(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return numFmt.format(value);
}

export function pct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}

/**
 * Interpreta entrada de texto em formato brasileiro:
 * "1.234,56" -> 1234.56 | "1234.56" -> 1234.56 | "" -> null
 */
export function parseBrNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (s === "") return null;
  let normalized = s;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
}
