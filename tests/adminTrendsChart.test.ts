import { describe, expect, it } from "vitest";
import { renderTrendsChartSvg } from "../src/adminChart";
import { renderAdminPage } from "../src/adminPage";
import { handleApiRequest } from "../src/apiRoutes";
import type { DailyTrendItem, Env, SystemStats } from "../src/types";

function createMockD1(): any {
  const createStmt = () => {
    const stmt: any = {
      bind: (..._args: any[]) => stmt,
      first: async <T = unknown>(): Promise<T | null> => ({ c: 0 } as any),
      all: async <T = unknown>(): Promise<{ results: T[] }> => ({ results: [] }),
      run: async () => ({ success: true, meta: { changes: 1 } }),
    };
    return stmt;
  };

  return {
    prepare: (_sql: string) => createStmt(),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
  };
}

const mockEnv: Env = {
  DB: createMockD1(),
  BOT_TOKEN: "mock_token",
  ADMIN_IDS: "123456789",
  WEBHOOK_SECRET: "mock_secret",
  ADMIN_API_SECRET: "admin_secret_token_123",
  CHANNEL_USERNAME: "xbet_test",
  CHANNEL_URL: "https://t.me/xbet_test",
  XBET_LINK: "https://example.com",
  XBET_PROMO_CODE: "TEST",
  MIN_TRANSACTION_LKR: "100",
  MAX_TRANSACTION_LKR: "100000",
  DEPOSIT_INSTRUCTIONS: "Instructions",
};

const mockStats: SystemStats = {
  totalUsers: 150,
  todayUsers: 12,
  pendingDeposits: 3,
  approvedDepositsCount: 85,
  approvedDepositsVolume: 425000,
  rejectedDepositsCount: 4,
  pendingWithdrawals: 1,
  approvedWithdrawalsCount: 40,
  approvedWithdrawalsVolume: 210000,
  rejectedWithdrawalsCount: 2,
  todayDepositsVolume: 45000,
  todayWithdrawalsVolume: 20000,
};

const mockTrends: DailyTrendItem[] = [
  {
    date: "2026-09-10",
    label: "Sep 10",
    depositCount: 5,
    depositVolume: 25000,
    approvedDepositCount: 5,
    approvedDepositVolume: 25000,
    withdrawalCount: 2,
    withdrawalVolume: 10000,
    approvedWithdrawalCount: 2,
    approvedWithdrawalVolume: 10000,
    netVolume: 15000,
    totalTransactions: 7,
  },
  {
    date: "2026-09-11",
    label: "Sep 11",
    depositCount: 8,
    depositVolume: 40000,
    approvedDepositCount: 8,
    approvedDepositVolume: 40000,
    withdrawalCount: 4,
    withdrawalVolume: 18000,
    approvedWithdrawalCount: 4,
    approvedWithdrawalVolume: 18000,
    netVolume: 22000,
    totalTransactions: 12,
  },
];

describe("D3 Trends Chart Generation", () => {
  it("renders a valid SVG with D3 paths, axes, and gradients", () => {
    const svg = renderTrendsChartSvg(mockTrends, { metric: "volume" });
    expect(svg).toContain("<svg");
    expect(svg).toContain('id="d3-trends-svg"');
    expect(svg).toContain("d3-dep-grad");
    expect(svg).toContain("d3-wd-grad");
    expect(svg).toContain("#10b981"); // Deposit green
    expect(svg).toContain("#f59e0b"); // Withdrawal orange
    expect(svg).toContain("Daily Financial Volume (LKR)");
    expect(svg).toContain("Sep 10");
    expect(svg).toContain("Sep 11");
  });

  it("supports transaction count metric", () => {
    const svg = renderTrendsChartSvg(mockTrends, { metric: "count" });
    expect(svg).toContain("Daily Transaction Volume (Count)");
    expect(svg).toContain('id="d3-trends-svg"');
  });

  it("handles empty trend data gracefully without throwing", () => {
    const svg = renderTrendsChartSvg([], { metric: "volume" });
    expect(svg).toContain("<svg");
    expect(svg).toContain('id="d3-trends-svg"');
    expect(svg).toContain("Today");
  });
});

describe("Admin Page Renderer", () => {
  it("renders complete HTML with D3 chart and KPI summary", () => {
    const req = new Request("http://localhost/admin");
    const html = renderAdminPage(
      mockEnv,
      req,
      {
        stats: mockStats,
        trends: mockTrends,
        days: 7,
        metric: "volume",
        isAuthorized: true,
      },
      "testnonce123"
    );

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Fast xBet Cash — Admin Panel");
    expect(html).toContain('nonce="testnonce123"');
    expect(html).toContain("d3-trends-svg");
    expect(html).toContain("425,000"); // Approved deposit volume
    expect(html).toContain("210,000"); // Approved withdrawal volume
    expect(html).toContain("toggle-metric-vol");
    expect(html).toContain("toggle-metric-count");
    expect(html).toContain("toggle-window-7d");
    expect(html).toContain("toggle-window-14d");
    expect(html).toContain("toggle-window-30d");
  });

  it("includes responsive CSS media queries for single-column mobile layout", () => {
    const req = new Request("http://localhost/admin");
    const html = renderAdminPage(
      mockEnv,
      req,
      {
        stats: mockStats,
        trends: mockTrends,
        days: 7,
        metric: "volume",
        isAuthorized: true,
      }
    );

    // Responsive breakpoints & media queries
    expect(html).toContain("@media (max-width: 768px)");
    expect(html).toContain("@media (max-width: 480px)");

    // Single-column layout shifts on mobile
    expect(html).toContain(".kpi-grid");
    expect(html).toContain("grid-template-columns: 1fr");
    expect(html).toContain(".botfather-grid");
    expect(html).toContain(".payment-methods-grid");
    expect(html).toContain(".operational-grid");
  });
});

describe("Admin Trends & Panel Routes", () => {
  it("does NOT leak dashboard data to unauthenticated /admin requests", async () => {
    const req = new Request("http://localhost/admin");
    const res = await handleApiRequest(req, mockEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    const text = await res?.text();
    // No stats, chart, or trend data should be present pre-auth.
    expect(text).toContain("Admin Login");
    expect(text).not.toContain("d3-trends-svg");
    expect(text).not.toContain("425,000");
    expect(text).not.toContain("210,000");
  });

  it("serves the full /admin dashboard with D3 chart once authenticated", async () => {
    const req = new Request("http://localhost/admin", {
      headers: { "x-admin-secret": "admin_secret_token_123" },
    });
    const res = await handleApiRequest(req, mockEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    const text = await res?.text();
    expect(text).toContain("Admin Panel");
    expect(text).toContain("d3-trends-svg");
  });

  it("protects /api/admin/trends from unauthorized calls", async () => {
    const req = new Request("http://localhost/api/admin/trends");
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(401);
  });

  it("returns daily trends JSON on /api/admin/trends when authorized", async () => {
    const req = new Request("http://localhost/api/admin/trends?days=7", {
      headers: { Authorization: `Bearer ${mockEnv.ADMIN_API_SECRET}` },
    });
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(200);
    const data = (await res?.json()) as any;
    expect(data.ok).toBe(true);
    expect(data.days).toBe(7);
    expect(Array.isArray(data.trends)).toBe(true);
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.totalDepositVolume).toBe("number");
  });

  it("rejects /api/admin/trends when the secret is passed in the query string", async () => {
    const req = new Request(`http://localhost/api/admin/trends?secret=${mockEnv.ADMIN_API_SECRET}`);
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(401);
  });
});
