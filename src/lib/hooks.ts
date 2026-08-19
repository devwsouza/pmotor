import { useCallback, useEffect, useRef, useState } from "react";

/** Estado persistido em localStorage com fallback silencioso. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // modo privado / storage cheio — o app segue funcionando sem persistir
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Observa entrada do elemento no viewport (uma única vez). */
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

/** Contador animado (easing cúbico) que persegue o valor alvo. */
export function useCountUp(target: number, durationMs = 650): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return display;
}

/** Hash routing mínimo: "#/calculadora" ↔ estado, sem dependência extra. */
export function useHashRoute(defaultRoute: string) {
  const read = useCallback(
    () => window.location.hash.replace(/^#\/?/, "") || defaultRoute,
    [defaultRoute],
  );
  const [route, setRouteState] = useState(read);

  useEffect(() => {
    const onChange = () => setRouteState(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [read]);

  const navigate = useCallback((next: string) => {
    window.location.hash = `/${next}`;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return { route, navigate };
}
