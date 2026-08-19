/**
 * Erros tipados do domínio (SPEC-001 §Erros).
 *
 * Regra: regras de domínio NUNCA lançam `new Error("...")` genérico.
 * Todo erro carrega um `code` estável (para logs/analytics) e `issues`
 * localizáveis (para apresentação na interface).
 */

export type PricingErrorCode =
  | "INVALID_PRICING_INPUT"
  | "INVALID_NICHE_CONFIG"
  | "UNSUPPORTED_PRICING_MODEL"
  | "INVALID_COST"
  | "INVALID_DURATION"
  | "INVALID_FEE";

export interface ErrorIssue {
  readonly path: string;
  readonly message: string;
}

export class PricingError extends Error {
  readonly code: PricingErrorCode;
  readonly issues: readonly ErrorIssue[];

  constructor(code: PricingErrorCode, message: string, issues: readonly ErrorIssue[] = []) {
    super(message);
    this.name = "PricingError";
    this.code = code;
    this.issues = issues;
  }
}

/** Entradas do usuário fora dos intervalos/tipos aceitos. */
export class InvalidPricingInputError extends PricingError {
  constructor(issues: readonly ErrorIssue[]) {
    super("INVALID_PRICING_INPUT", "Entrada de precificação inválida.", issues);
    this.name = "InvalidPricingInputError";
  }
}

/** Configuração de nicho rejeitada pelo schema antes de chegar ao motor. */
export class InvalidNicheConfigError extends PricingError {
  constructor(issues: readonly ErrorIssue[]) {
    super("INVALID_NICHE_CONFIG", "Configuração de nicho inválida.", issues);
    this.name = "InvalidNicheConfigError";
  }
}

/** Modelo de precificação inexistente no registro de estratégias. */
export class UnsupportedPricingModelError extends PricingError {
  constructor(modelId: string) {
    super(
      "UNSUPPORTED_PRICING_MODEL",
      `Modelo de precificação não suportado: "${modelId}".`,
      [{ path: "pricingModel", message: `Modelo "${modelId}" não está registrado no motor.` }],
    );
    this.name = "UnsupportedPricingModelError";
  }
}

/** Valores de custo impossíveis (negativos, fora do limite). */
export class InvalidCostError extends PricingError {
  constructor(issues: readonly ErrorIssue[]) {
    super("INVALID_COST", "Há valores de custo inválidos.", issues);
    this.name = "InvalidCostError";
  }
}

/** Duração ou capacidade produtiva inválida (ex.: horas produtivas = 0). */
export class InvalidDurationError extends PricingError {
  constructor(issues: readonly ErrorIssue[]) {
    super("INVALID_DURATION", "Duração ou jornada inválida.", issues);
    this.name = "InvalidDurationError";
  }
}

/** Taxas/margem que tornariam a fórmula indefinida (dedução >= 100%). */
export class InvalidFeeError extends PricingError {
  constructor(issues: readonly ErrorIssue[]) {
    super("INVALID_FEE", "Taxas e margem incompatíveis.", issues);
    this.name = "InvalidFeeError";
  }
}

export function isPricingError(value: unknown): value is PricingError {
  return value instanceof PricingError;
}

/** Mensagens amigáveis por código — usadas pela interface. */
export function friendlyMessage(error: PricingError): string {
  switch (error.code) {
    case "INVALID_FEE":
      return "Taxas + margem altas demais: o motor não consegue fechar a conta. Reduza a soma abaixo do limite.";
    case "INVALID_DURATION":
      return "Jornada ou duração inválida — sem horas produtivas não existe preço que feche a conta.";
    case "INVALID_COST":
      return "Revise os custos: valores negativos ou acima do limite não são aceitos.";
    case "UNSUPPORTED_PRICING_MODEL":
      return "Este nicho usa um modelo que o motor ainda não implementa.";
    case "INVALID_NICHE_CONFIG":
      return "A configuração deste nicho está incompleta. Recarregue a página.";
    default:
      return "Alguns campos precisam de atenção antes de calcular.";
  }
}
