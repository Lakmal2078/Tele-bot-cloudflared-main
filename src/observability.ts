export type LogEventName =
  | "request"
  | "error"
  | "cron"
  | "bot"
  | "security"
  | "storage"
  | "fsm";

export interface RequestLog {
  event: LogEventName;
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  cron?: string;
  message?: string;
  error?: string;
  /** Non-PII structured fields only (ids as opaque numbers, never tokens). */
  meta?: Record<string, string | number | boolean | null>;
}

/** Emits machine-readable logs without credentials, tokens, request bodies, or user PII. */
export function logEvent(record: RequestLog): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "xbet-telegram-worker",
      level: record.event === "error" ? "error" : "info",
      ...record,
    })
  );
}

export function requestId(): string {
  return crypto.randomUUID();
}

export function withRequestId(response: Response, id: string): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-ID", id);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
