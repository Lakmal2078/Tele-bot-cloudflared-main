/**
 * Admin dashboard session cookies.
 *
 * The admin secret must never travel in a URL query string (access logs,
 * browser history, caches). Browser navigation cannot set custom headers, so
 * the login form POSTs the secret once and receives a short-lived, HMAC-signed
 * HttpOnly cookie instead. The secret itself is never stored in the cookie.
 */

import type { Env } from "./types";
import { constantTimeEqual } from "./config";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function encoder(): TextEncoder {
  return new TextEncoder();
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Builds a signed session token of the form `<expiresAt>.<hmac>`. */
export async function createAdminSessionToken(
  secret: string,
  now = Date.now(),
  ttlMs = ADMIN_SESSION_TTL_MS
): Promise<string> {
  const expiresAt = now + ttlMs;
  const payload = String(expiresAt);
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifyAdminSessionToken(
  token: string,
  secret: string,
  now = Date.now()
): Promise<boolean> {
  if (!token || !secret) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  return constantTimeEqual(signature, await sign(payload, secret));
}

export function readCookie(request: Request, name: string): string {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("=")).trim();
  }
  return "";
}

/** True when the request carries a valid, unexpired admin session cookie. */
export async function hasValidAdminSession(
  request: Request,
  env: Partial<Env>,
  now = Date.now()
): Promise<boolean> {
  const secret = (env.ADMIN_API_SECRET || "").trim();
  if (!secret) return false;
  return verifyAdminSessionToken(readCookie(request, ADMIN_SESSION_COOKIE), secret, now);
}

function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return true;
  }
}

export function adminSessionCookieHeader(request: Request, token: string): string {
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`,
  ];
  if (isSecureRequest(request)) attributes.push("Secure");
  return attributes.join("; ");
}

export function clearedAdminSessionCookieHeader(request: Request): string {
  const attributes = [`${ADMIN_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (isSecureRequest(request)) attributes.push("Secure");
  return attributes.join("; ");
}
