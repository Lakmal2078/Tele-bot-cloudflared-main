import type {
  AccessRule,
  AlertDelivery,
  AlertRule,
  DeviceRecord,
  OpsConfig,
  OpsEvent,
  TrafficSample,
  TrafficTotals,
  TunnelRecord,
  UptimeSummary,
} from "../cloudflared/store";
import type { HealthSnapshot } from "../cloudflared/runtime";
import type { ControlState } from "../cloudflared/supervisor";

export interface OpsPageData {
  config: OpsConfig;
  snapshot: HealthSnapshot;
  control: ControlState;
  logs: string[];
  uptime24h: UptimeSummary;
  uptime7d: UptimeSummary;
  tunnels: TunnelRecord[];
  events: OpsEvent[];
  eventActions: string[];
  devices: DeviceRecord[];
  traffic: TrafficSample[];
  traffic24h: TrafficTotals;
  traffic7d: TrafficTotals;
  accessRules: AccessRule[];
  alertRules: AlertRule[];
  deliveries: AlertDelivery[];
}

export interface OpsRenderOptions {
  nonce: string;
  isAdmin: boolean;
  flash?: { kind: "success" | "error" | "info"; message: string } | null;
  filters?: { level: string; action: string; query: string; limit: number };
  windowHours?: number;
  monitorMessage?: string | null;
}

export const OPS_PAGE_PATHS = [
  "/dashboard",
  "/settings",
  "/activity-logs",
  "/tunnel-manager",
  "/connected-devices",
  "/traffic-stats",
  "/access-controls",
  "/notifications",
] as const;

export type OpsPagePath = (typeof OPS_PAGE_PATHS)[number];
