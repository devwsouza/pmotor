import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/**
 * Error Boundary (obrigatório antes do lançamento público).
 * Evita a "tela branca": registra o erro e oferece recuperação amigável.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Error monitoring mínimo: console + estrutura pronta p/ sink futuro.
    // eslint-disable-next-line no-console
    console.error("[error-monitoring]", {
      message: error.message,
      stack: error.stack,
      component: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-plum p-6">
        <div className="w-full max-w-lg border-2 border-paper/20 bg-plum-2 p-8 text-paper shadow-[8px_8px_0_0_rgba(200,16,70,0.4)]">
          <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-gold uppercase">
            Erro inesperado · code UI-500
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight">
            O motor travou no meio do esmalte.
          </h1>
          <p className="mt-4 text-paper/75">
            Seus dados de cálculo ficam salvos no navegador — nada se perdeu. Recarregue a
            página para continuar de onde parou.
          </p>
          <p className="mt-4 border border-paper/15 bg-plum p-3 font-mono text-xs break-all text-paper/60">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="focus-ring mt-6 cursor-pointer bg-lacquer px-6 py-3 font-mono text-sm font-bold tracking-wide text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
