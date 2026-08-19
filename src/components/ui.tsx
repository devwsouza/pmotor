import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useInView } from "../lib/hooks";
import { parseBrNumber } from "../lib/format";

/* ------------------------------- Reveal --------------------------------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "gold";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-lacquer text-paper hover:bg-lacquer-deep shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5",
  dark: "bg-ink text-paper hover:bg-plum-2 shadow-[4px_4px_0_0_rgba(200,16,70,0.55)] hover:-translate-y-0.5",
  outline:
    "border-2 border-ink text-ink hover:bg-ink hover:text-paper shadow-[4px_4px_0_0_rgba(35,18,29,0.15)]",
  ghost: "text-ink hover:bg-blush",
  gold: "bg-gold text-ink hover:brightness-105 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...rest}
      className={`focus-ring inline-flex cursor-pointer items-center justify-center gap-2 px-6 py-3 font-mono text-sm font-bold tracking-wide uppercase transition-all duration-200 active:translate-y-0.5 active:shadow-none ${buttonStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Kicker --------------------------------- */

export function Kicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={`mb-4 flex items-center gap-3 font-mono text-[11px] font-bold tracking-[0.22em] uppercase ${
        light ? "text-gold" : "text-lacquer"
      }`}
    >
      <span className={`h-[2px] w-8 ${light ? "bg-gold" : "bg-lacquer"}`} />
      {children}
    </p>
  );
}

/* -------------------------------- Chip ---------------------------------- */

export function Chip({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "lacquer" | "gold" | "jade" | "paper";
}) {
  const tones: Record<string, string> = {
    ink: "border-ink/20 bg-ink/5 text-ink",
    lacquer: "border-lacquer/30 bg-lacquer/10 text-lacquer-deep",
    gold: "border-gold/50 bg-gold/15 text-ink",
    jade: "border-jade/30 bg-jade/10 text-jade",
    paper: "border-paper/30 bg-paper/10 text-paper",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Accordion ------------------------------- */

export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y-2 divide-ink/10 border-y-2 border-ink/10">
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 px-1 py-4 text-left font-semibold text-ink transition-colors hover:text-lacquer [&::-webkit-details-marker]:hidden">
            <span className="text-base sm:text-lg">{item.q}</span>
            <span className="font-mono text-xl text-lacquer transition-transform duration-300 group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="px-1 pb-5 text-ink-soft">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/* -------------------------------- Field --------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="text-right text-xs text-ink-soft/80">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block font-mono text-xs font-semibold text-lacquer">
          ▲ {error}
        </span>
      )}
    </label>
  );
}

/* ----------------------------- NumberField ------------------------------ */

const inputBase =
  "focus-ring w-full border-2 border-ink/20 bg-white/70 px-4 py-3 font-mono text-lg font-semibold text-ink placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-ink-soft/60 transition-colors focus:border-lacquer";

export function NumberField({
  value,
  onValue,
  placeholder,
  suffix,
  prefix,
  compact = false,
}: {
  value: number | null;
  onValue: (v: number | null) => void;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  compact?: boolean;
}) {
  // texto local: sincroniza com mudanças externas sem derrubar o cursor ao digitar
  const [text, setText] = useState(value !== null ? String(value).replace(".", ",") : "");

  useEffect(() => {
    const parsed = text.trim() === "" ? null : parseBrNumber(text);
    if (parsed !== value) {
      setText(value !== null ? String(value).replace(".", ",") : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-sm font-bold text-ink-soft">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw.trim() === "") {
            onValue(null);
            return;
          }
          const parsed = parseBrNumber(raw);
          // estados intermediários ("8,") mantêm o último valor válido
          if (parsed !== null) onValue(parsed);
        }}
        placeholder={placeholder ?? "0"}
        className={`${inputBase} ${prefix ? "pl-11" : ""} ${suffix ? "pr-16" : ""} ${
          compact ? "py-2 text-base" : ""
        }`}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs font-bold tracking-wider text-ink-soft uppercase">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ------------------------------- Slider --------------------------------- */

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="price-tick font-mono text-lg font-bold text-lacquer">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="focus-ring w-full cursor-pointer accent-lacquer"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-soft/70">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
