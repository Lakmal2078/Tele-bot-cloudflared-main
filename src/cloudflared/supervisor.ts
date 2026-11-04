/**
 * Local cloudflared connector supervisor (Node runtime only).
 *
 * The tunnel token is passed to the child process through the inherited
 * environment (`TUNNEL_TOKEN`), never on the command line, so it cannot leak
 * through the process list. Captured output is redacted before it is kept or
 * shown. Nothing here pretends to work: when the CLI or the token is missing
 * the caller receives an explicit reason.
 */

import { spawn, type ChildProcess } from "node:child_process";

const LOG_BUFFER_LINES = 60;

export interface ControlState {
  supported: boolean;
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  binary: string;
  binAvailable: boolean;
  lastExitCode: number | null;
  lastExitAt: string | null;
  message: string;
}

export interface ControlResult {
  ok: boolean;
  message: string;
}

export interface TunnelControl {
  start(): Promise<ControlResult>;
  stop(): Promise<ControlResult>;
  restart(): Promise<ControlResult>;
  state(): ControlState;
  recentLog(): string[];
}

export interface SupervisorOptions {
  binary: string;
  tunnelToken: string;
  metricsAddr: string;
  originService: string;
}

export function redact(text: string, secrets: string[]): string {
  let output = text;
  for (const secret of secrets) {
    const value = (secret || "").trim();
    if (value.length < 8) continue;
    output = output.split(value).join("[redacted]");
  }
  return output;
}

export class LocalTunnelSupervisor implements TunnelControl {
  private options: SupervisorOptions;
  private child: ChildProcess | null = null;
  private startedAt: string | null = null;
  private logs: string[] = [];
  private lastExitCode: number | null = null;
  private lastExitAt: string | null = null;
  private binAvailable: boolean | null = null;
  private starting = false;

  constructor(options: SupervisorOptions) {
    this.options = options;
  }

  configure(options: SupervisorOptions): void {
    this.options = options;
  }

  state(): ControlState {
    const running = Boolean(this.child && this.child.pid && this.child.exitCode === null && !this.child.killed);
    let message: string;
    if (!this.options.tunnelToken) {
      message = "No tunnel token is configured, so a connector cannot be started.";
    } else if (this.binAvailable === false) {
      message = `The "${this.options.binary}" CLI was not found in this runtime.`;
    } else if (running) {
      message = `Connector running with PID ${this.child?.pid}.`;
    } else {
      message = "Connector is not running.";
    }
    return {
      supported: true,
      running,
      pid: running ? this.child?.pid || null : null,
      startedAt: running ? this.startedAt : null,
      binary: this.options.binary,
      binAvailable: this.binAvailable !== false,
      lastExitCode: this.lastExitCode,
      lastExitAt: this.lastExitAt,
      message,
    };
  }

  recentLog(): string[] {
    return [...this.logs];
  }

  private pushLog(chunk: Buffer | string): void {
    const text = redact(String(chunk), [this.options.tunnelToken]).trimEnd();
    if (!text) return;
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      this.logs.push(`${new Date().toISOString()} ${line.slice(0, 500)}`);
    }
    if (this.logs.length > LOG_BUFFER_LINES) this.logs = this.logs.slice(-LOG_BUFFER_LINES);
  }

  async start(): Promise<ControlResult> {
    if (this.state().running) return { ok: true, message: "Connector is already running." };
    if (!this.options.tunnelToken) {
      return {
        ok: false,
        message:
          "Cannot start a tunnel: no tunnel token is configured. Save a tunnel token on the Service Settings page first.",
      };
    }
    if (this.starting) return { ok: false, message: "A start request is already in progress." };
    this.starting = true;

    try {
      const args = [
        "tunnel",
        "--no-autoupdate",
        "run",
        "--metrics",
        this.options.metricsAddr || "127.0.0.1:20241",
      ];
      if (this.options.originService) args.push("--url", this.options.originService);

      const child = spawn(this.options.binary, args, {
        env: { ...process.env, TUNNEL_TOKEN: this.options.tunnelToken, TUNNEL_ORIGIN_CERT: undefined as unknown as string },
        stdio: ["ignore", "pipe", "pipe"],
      });

      await new Promise<void>((resolve) => {
        const onError = (err: NodeJS.ErrnoException) => {
          child.off("spawn", onSpawn);
          this.binAvailable = err.code === "ENOENT" ? false : this.binAvailable !== false;
          this.lastExitCode = null;
          this.pushLog(`spawn failed: ${err.message}`);
          resolve();
        };
        const onSpawn = () => {
          child.off("error", onError);
          this.binAvailable = true;
          resolve();
        };
        child.once("error", onError);
        child.once("spawn", onSpawn);
      });

      if (!child.pid) {
        this.starting = false;
        return { ok: false, message: this.state().message };
      }

      this.child = child;
      this.startedAt = new Date().toISOString();
      this.lastExitCode = null;
      child.stdout?.on("data", (chunk) => this.pushLog(chunk));
      child.stderr?.on("data", (chunk) => this.pushLog(chunk));
      child.on("exit", (code) => {
        this.lastExitCode = code;
        this.lastExitAt = new Date().toISOString();
        this.startedAt = null;
        this.child = null;
      });

      this.starting = false;
      return { ok: true, message: `Connector started with PID ${child.pid}.` };
    } catch (err) {
      this.starting = false;
      return { ok: false, message: `Could not start the connector: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async stop(): Promise<ControlResult> {
    const child = this.child;
    if (!child) return { ok: true, message: "Connector is not running." };
    return await new Promise<ControlResult>((resolve) => {
      const timer = setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 5000);
      child.once("exit", (code) => {
        clearTimeout(timer);
        resolve({ ok: true, message: `Connector stopped (exit code ${code ?? 0}).` });
      });
      child.kill("SIGTERM");
    });
  }

  async restart(): Promise<ControlResult> {
    const stopped = await this.stop();
    if (!stopped.ok) return stopped;
    return this.start();
  }
}

/** Supervisor for runtimes that cannot spawn a local process (Cloudflare Workers). */
export class UnsupportedTunnelControl implements TunnelControl {
  state(): ControlState {
    return {
      supported: false,
      running: false,
      pid: null,
      startedAt: null,
      binary: "cloudflared",
      binAvailable: false,
      lastExitCode: null,
      lastExitAt: null,
      message: "This runtime cannot run a local cloudflared connector process.",
    };
  }
  recentLog(): string[] {
    return [];
  }
  async start(): Promise<ControlResult> {
    return {
      ok: false,
      message:
        "Starting a tunnel is not supported in this runtime. Run the connector on a host with the cloudflared CLI, or start it outside the app.",
    };
  }
  async stop(): Promise<ControlResult> {
    return { ok: false, message: "Stopping a tunnel is not supported in this runtime." };
  }
  async restart(): Promise<ControlResult> {
    return { ok: false, message: "Restarting a tunnel is not supported in this runtime." };
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface TunnelMetrics {
  requests: number | null;
  errors: number | null;
  bytesIn: number | null;
  bytesOut: number | null;
  haConnections: number | null;
}

/** Parses the Prometheus text exposed by cloudflared's --metrics endpoint. */
export function parseMetrics(text: string): TunnelMetrics {
  const values = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(-?[\d.eE+]+)/);
    if (!match) continue;
    const name = match[1];
    const value = Number(match[3]);
    if (!Number.isFinite(value)) continue;
    values.set(name, (values.get(name) || 0) + value);
  }

  const pick = (...names: string[]): number | null => {
    for (const name of names) {
      if (values.has(name)) return values.get(name) as number;
    }
    return null;
  };

  return {
    requests: pick("cloudflared_tunnel_total_requests", "cloudflared_tunnel_request_total"),
    errors: pick("cloudflared_tunnel_request_errors", "cloudflared_tunnel_errors_total"),
    bytesIn: pick("cloudflared_tunnel_rx_bytes", "cloudflared_tunnel_rx_bytes_total"),
    bytesOut: pick("cloudflared_tunnel_tx_bytes", "cloudflared_tunnel_tx_bytes_total"),
    haConnections: pick("cloudflared_tunnel_ha_connections"),
  };
}

/** Reads the local connector metrics endpoint. Returns null when unreachable. */
export async function scrapeMetrics(
  metricsAddr: string,
  fetcher: typeof fetch = fetch
): Promise<TunnelMetrics | null> {
  const address = (metricsAddr || "").trim();
  if (!address) return null;
  const host = address.startsWith("http://") || address.startsWith("https://") ? address : `http://${address}`;
  try {
    const response = await fetcher(`${host.replace(/\/+$/, "")}/metrics`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    return parseMetrics(await response.text());
  } catch {
    return null;
  }
}
