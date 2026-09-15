import type { Env, D1Database } from "./types";
import { constantTimeEqual, isConfiguredAdminId } from "./config";
import { securityHeaders } from "./security";
import { getStats, getOperationsDashboard, getSupportTickets, updateSupportTicket, createScheduledChannelPost } from "./db";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { getObject } from "./storage";

export function adminAuthorized(request: Request, env: Env): boolean {
  const secret = (env.ADMIN_API_SECRET || "").trim();
  if (!secret) return false;

  const authHeader = request.headers.get("Authorization");
  const directHeader = request.headers.get("x-admin-secret");

  let candidate = "";
  if (directHeader) {
    candidate = directHeader.trim();
  } else if (authHeader?.toLowerCase().startsWith("bearer ")) {
    candidate = authHeader.slice(7).trim();
  }

  if (!candidate || !constantTimeEqual(candidate, secret)) {
    return false;
  }

  // If client identifies as a specific admin via X-Admin-Id, verify against ADMIN_IDS
  const adminIdHeader = request.headers.get("x-admin-id");
  if (adminIdHeader) {
    const adminId = parseInt(adminIdHeader, 10);
    if (!Number.isInteger(adminId) || !isConfiguredAdminId(adminId, env)) {
      return false;
    }
  }

  return true;
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...securityHeaders(),
      ...extraHeaders,
    },
  });
}

export function unauthorizedResponse(): Response {
  return json({ ok: false, error: "Unauthorized" }, 401);
}

export async function handleApiRequest(
  request: Request,
  env: Env,
  options?: { runtime?: "cf-worker" | "node"; isPolling?: boolean }
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Health check
  if ((path === "/health" || path === "/api/health") && (method === "GET" || method === "HEAD")) {
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    return json({
      status: "ok",
      service: "telegram-bot",
      runtime: options?.runtime || "cf-worker",
      timestamp: new Date().toISOString(),
    });
  }

  // Cleanup logs status
  if (path === "/api/cleanup/logs/status" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    const last = getLastCleanupResult();
    return json({
      status: "ok",
      retentionPolicyDays: 30,
      schedule: "Daily at 02:00 UTC",
      lastCleanup: last,
    });
  }

  // Cleanup logs run
  if (path === "/api/cleanup/logs" && method === "POST") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    let days = 30;
    try {
      const body = (await request.json()) as { retentionDays?: number };
      if (body?.retentionDays && body.retentionDays > 0 && body.retentionDays <= 3650) {
        days = Math.floor(body.retentionDays);
      }
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    try {
      const summary = await cleanupOldR2Logs(env, days);
      return json({ ok: true, summary });
    } catch (err) {
      console.error("[Cleanup API Error]:", err);
      return json({ ok: false, error: "Cleanup failed" }, 500);
    }
  }

  // Admin status
  if (path === "/api/admin/status" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    const stats = await getStats(env.DB);
    return json({
      status: "ok",
      runtime: options?.runtime || "cf-worker",
      mode: options?.isPolling ? "polling" : "webhook",
      stats,
    });
  }

  // Admin dashboard
  if (path === "/api/admin/dashboard" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    try {
      const dashboard = await getOperationsDashboard(env.DB);
      return json({ ok: true, ...dashboard });
    } catch (error) {
      console.error("[Admin Dashboard] query failed", error);
      return json({ ok: false, error: "Dashboard data unavailable" }, 503);
    }
  }

  // Admin tickets
  if (path === "/api/admin/tickets") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();

    if (method === "GET") {
      const statusParam = url.searchParams.get("status") as "OPEN" | "PENDING" | "CLOSED" | null;
      const tickets = await getSupportTickets(env.DB, statusParam || undefined);
      return json({ ok: true, tickets });
    }

    if (method === "PATCH") {
      try {
        const body = (await request.json()) as {
          id?: number;
          status?: "OPEN" | "PENDING" | "CLOSED";
          reply?: string;
          adminId?: number;
        };

        if (!body.id || !body.status || !body.adminId) {
          return json({ ok: false, error: "id, status and adminId are required" }, 400);
        }

        // P1 #5: Validate adminId against server-side ADMIN_IDS
        if (!isConfiguredAdminId(body.adminId, env)) {
          return json(
            { ok: false, error: "Forbidden: adminId must be a registered ID in ADMIN_IDS" },
            403
          );
        }

        const updated = await updateSupportTicket(
          env.DB,
          body.id,
          body.status,
          body.reply || null,
          body.adminId
        );
        return json({ ok: updated }, updated ? 200 : 404);
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }
    }

    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  // Admin schedule
  if (path === "/api/admin/schedule") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();

    if (method !== "POST") {
      return json({ ok: false, error: "Method Not Allowed" }, 405);
    }

    try {
      const body = (await request.json()) as {
        title?: string;
        body?: string;
        mediaUrl?: string;
        ctaText?: string;
        ctaUrl?: string;
        language?: "si" | "en" | "ta";
        scheduledFor?: string;
        createdBy?: number;
      };

      if (!body.title || !body.body || !body.scheduledFor || !body.createdBy) {
        return json(
          { ok: false, error: "title, body, scheduledFor and createdBy are required" },
          400
        );
      }

      // P1 #5: Validate createdBy against server-side ADMIN_IDS
      if (!isConfiguredAdminId(body.createdBy, env)) {
        return json(
          { ok: false, error: "Forbidden: createdBy must be a registered ID in ADMIN_IDS" },
          403
        );
      }

      const id = await createScheduledChannelPost(env.DB, {
        title: body.title,
        body: body.body,
        mediaUrl: body.mediaUrl,
        ctaText: body.ctaText,
        ctaUrl: body.ctaUrl,
        language: body.language,
        scheduledFor: body.scheduledFor,
        createdBy: body.createdBy,
      });

      return json({ ok: true, id }, 201);
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
  }

  // Admin receipts (P0 #2: Authenticated receipt viewing)
  if ((path === "/api/admin/receipts" || path === "/api/receipts/get") && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();

    const key = url.searchParams.get("key");
    if (!key || !key.startsWith("receipts/") || key.includes("..")) {
      return json({ ok: false, error: "Invalid or unsafe storage key parameter" }, 400);
    }

    const obj = await getObject(env, key);
    if (!obj) {
      return json({ ok: false, error: "Receipt not found in storage" }, 404);
    }

    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          "Content-Type": obj.contentType,
          "Content-Security-Policy": "default-src 'none'",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return new Response(obj.body, {
      status: 200,
      headers: {
        "Content-Type": obj.contentType,
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // Not handled by API dispatcher
  return null;
}
