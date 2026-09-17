export interface RequestLog {
  event: "request" | "error" | "cron";
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  cron?: string;
  message?: string;
  error?: string;
}

/** Emits machine-readable logs without credentials, tokens, request bodies, or user PII. */
export function logEvent(record: RequestLog): void {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    service: "xbet-telegram-worker",
    ...record,
  }));
}

export function requestId(): string {
  return crypto.randomUUID();
}

export function withRequestId(response: Response, id: string): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-ID", id);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
