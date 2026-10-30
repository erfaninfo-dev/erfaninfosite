/**
 * Error types for the wordsapi client.
 *
 * Each one is distinct because the API fails in genuinely different ways and
 * the UI reacts differently to each. See docs/api-contract.md §0.
 */

export type ApiErrorKind =
  /** Network failure, DNS, connection reset. Retryable. */
  | 'network'
  /** Exceeded the per-endpoint timeout budget. Retryable. */
  | 'timeout'
  /** Non-2xx with a JSON `{"error": "..."}` body. */
  | 'http'
  /**
   * The response was not JSON. An unknown .php path on this host returns a full
   * HTML page, so this is a real, observed case rather than a theoretical one.
   */
  | 'not-json'
  /** JSON parsed, but did not match the zod schema — a backend shape change. */
  | 'validation';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly endpoint: string;
  readonly status?: number;
  readonly detail?: string;

  constructor(opts: {
    kind: ApiErrorKind;
    endpoint: string;
    message: string;
    status?: number;
    detail?: string;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.endpoint = opts.endpoint;
    this.status = opts.status;
    this.detail = opts.detail;
  }

  get retryable(): boolean {
    if (this.kind === 'network' || this.kind === 'timeout') return true;
    // 5xx is worth one more try; 4xx means we asked wrongly and a retry
    // would ask wrongly again.
    return this.kind === 'http' && this.status !== undefined && this.status >= 500;
  }
}

/**
 * Structured server log. Deliberately logs no tokens, no query values beyond
 * the endpoint name, and no user data — the brief requires logs without PII or
 * secrets, and in Phase 1 there is nothing user-specific to leak anyway.
 */
export function logApiError(error: ApiError): void {
  const payload = {
    level: 'error',
    source: 'wordsapi',
    kind: error.kind,
    endpoint: error.endpoint,
    status: error.status ?? null,
    message: error.message,
    detail: error.detail?.slice(0, 500) ?? null,
  };
  console.error(JSON.stringify(payload));
}
