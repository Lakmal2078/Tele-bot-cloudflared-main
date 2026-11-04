/**
 * Minimal Cloudflare API client for tunnel health and connector state.
 * Only read operations are used: tunnel control happens through the local
 * cloudflared connector process, which is the only place a tunnel can
 * genuinely be started or stopped.
 */

import type { OpsConfig } from "./store";

const API_BASE = "https://api.cloudflare.com/client/v4";
const REQUEST_TIMEOUT_MS = 8000;

export interface ApiError {
  code: string;
  message: string;
  hint?: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export interface TunnelConnection {
  id: string;
  clientId: string;
  clientVersion: string;
  originIp: string;
  colo: string;
  openedAt: string;
}

export interface TunnelHealth {
  tunnelId: string;
  name: string;
  status: "up" | "degraded" | "down" | "unknown";
  connections: TunnelConnection[];
  detail: string;
}

type Fetcher = typeof fetch;

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function request<T>(path: string, token: string, fetcher: Fetcher): Promise<ApiResult<T>> {
  if (!token) {
    return {
      ok: false,
      error: {
        code: "api_token_missing",
        message: "No Cloudflare API token is configured.",
        hint: "Save an API token with Cloudflare Tunnel: Read access on the Service Settings page.",
      },
    };
  }

  let response: Response;
  try {
    response = await fetcher(`${API_BASE}${path}`, {
      method: "GET",
      headers: authHeaders(token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "api_unreachable",
        message: `Cloudflare API request failed: ${err instanceof Error ? err.message : String(err)}`,
        hint: "Check outbound network access from this runtime.",
      },
    };
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.success === false) {
    const firstError = Array.isArray(body?.errors) ? body.errors[0] : null;
    const message = firstError?.message || `Cloudflare API returned HTTP ${response.status}`;
    let hint = "Verify the API token scopes (Cloudflare Tunnel: Read) and the account ID.";
    if (response.status === 401 || response.status === 403) {
      hint = "The API token is invalid or lacks Cloudflare Tunnel: Read permission.";
    }
    return { ok: false, error: { code: `api_http_${response.status}`, message, hint } };
  }

  return { ok: true, data: body?.result as T };
}

/** Finds a tunnel by name, or validates a stored tunnel ID. */
export async function resolveTunnel(
  config: Pick<OpsConfig, "accountId" | "tunnelName" | "tunnelId" | "apiToken">,
  fetcher: Fetcher = fetch
): Promise<ApiResult<{ id: string; name: string; status: string }>> {
  if (!config.accountId) {
    return {
      ok: false,
      error: {
        code: "account_id_missing",
        message: "No Cloudflare account ID is configured.",
        hint: "Save your account ID on the Service Settings page.",
      },
    };
  }

  const query = config.tunnelId
    ? `/accounts/${encodeURIComponent(config.accountId)}/cfd_tunnel/${encodeURIComponent(config.tunnelId)}`
    : `/accounts/${encodeURIComponent(config.accountId)}/cfd_tunnel?is_deleted=false${config.tunnelName ? `&name=${encodeURIComponent(config.tunnelName)}` : ""}`;

  const result = await request<any>(query, config.apiToken, fetcher);
  if (!result.ok) return result;

  const item = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!item?.id) {
    return {
      ok: false,
      error: {
        code: "tunnel_not_found",
        message: config.tunnelName
          ? `No tunnel named "${config.tunnelName}" was found in this account.`
          : "No tunnel ID or tunnel name is configured.",
        hint: "Check the tunnel name, or create the tunnel with `cloudflared tunnel create`.",
      },
    };
  }

  return { ok: true, data: { id: item.id, name: item.name || config.tunnelName, status: item.status || "unknown" } };
}

export interface RawConnection {
  id?: string;
  client_id?: string;
  client_version?: string;
  origin_ip?: string;
  opened_at?: string;
  colo_name?: string;
}

export function mapConnections(raw: RawConnection[] | undefined): TunnelConnection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && (item.id || item.client_id))
    .map((item) => ({
      id: String(item.id || item.client_id || ""),
      clientId: String(item.client_id || item.id || ""),
      clientVersion: String(item.client_version || ""),
      originIp: String(item.origin_ip || ""),
      colo: String(item.colo_name || ""),
      openedAt: String(item.opened_at || ""),
    }));
}

/** Reads live connector connections for a tunnel. */
export async function fetchTunnelHealth(
  config: Pick<OpsConfig, "accountId" | "tunnelName" | "tunnelId" | "apiToken">,
  fetcher: Fetcher = fetch
): Promise<ApiResult<TunnelHealth>> {
  const tunnel = await resolveTunnel(config, fetcher);
  if (!tunnel.ok || !tunnel.data) {
    return { ok: false, error: tunnel.error };
  }

  const connections = await request<RawConnection[]>(
    `/accounts/${encodeURIComponent(config.accountId)}/cfd_tunnel/${encodeURIComponent(tunnel.data.id)}/connections`,
    config.apiToken,
    fetcher
  );
  if (!connections.ok) {
    return {
      ok: false,
      error: {
        ...(connections.error as ApiError),
        hint: "The connections endpoint requires Cloudflare Tunnel: Read on this account.",
      },
    };
  }

  const mapped = mapConnections(connections.data);
  const reported = tunnel.data.status;
  let status: TunnelHealth["status"] = "down";
  if (mapped.length > 0) status = reported === "degraded" ? "degraded" : "up";
  else if (reported === "degraded") status = "degraded";
  else if (reported === "inactive" || reported === "down") status = "down";

  return {
    ok: true,
    data: {
      tunnelId: tunnel.data.id,
      name: tunnel.data.name,
      status,
      connections: mapped,
      detail:
        mapped.length > 0
          ? `${mapped.length} connector connection${mapped.length === 1 ? "" : "s"} reported by Cloudflare`
          : `Cloudflare reports tunnel status "${reported}" with no active connections`,
    },
  };
}
