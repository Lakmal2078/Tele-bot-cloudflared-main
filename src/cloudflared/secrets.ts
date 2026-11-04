/**
 * Encryption for cloudflared credentials saved from the settings page.
 *
 * Tunnel tokens and Cloudflare API tokens must never be readable from the
 * database, an API response or a log line. Values are sealed with AES-GCM
 * using a key derived (HKDF-SHA-256) from the deployment's existing
 * SECURITY_CODE_PEPPER secret, so no new key needs to be provisioned.
 *
 * Stored form: `v1:<iv-base64>:<ciphertext-base64>`.
 * Rotating the pepper invalidates stored values; they must be re-entered.
 */

const STORED_PREFIX = "v1";
const KEY_INFO = "base44/cloudflared/settings-v1";

export class OpsSettingsKeyError extends Error {
  readonly code = "settings_key_missing";
  constructor() {
    super(
      "Credential storage is locked: SECURITY_CODE_PEPPER (16+ characters) is not configured for this deployment."
    );
    this.name = "OpsSettingsKeyError";
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(keyMaterial: string): Promise<CryptoKey> {
  const material = (keyMaterial || "").trim();
  if (material.length < 16) throw new OpsSettingsKeyError();
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(material),
    "HKDF",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("base44-cloudflared-settings"),
      info: new TextEncoder().encode(KEY_INFO),
    },
    base,
    256
  );
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Seals a credential. Returns the opaque string stored in the database. */
export async function sealSecret(plaintext: string, keyMaterial: string): Promise<string> {
  const key = await deriveKey(keyMaterial);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${STORED_PREFIX}:${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`;
}

/** Opens a sealed credential. Throws if the value or key is unusable. */
export async function openSecret(stored: string, keyMaterial: string): Promise<string> {
  if (!stored) return "";
  const [version, ivPart, cipherPart] = stored.split(":");
  if (version !== STORED_PREFIX || !ivPart || !cipherPart) {
    throw new Error("Stored credential is not in a supported format");
  }
  const key = await deriveKey(keyMaterial);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(cipherPart)
  );
  return new TextDecoder().decode(plaintext);
}

/** True when a value looks like a sealed credential rather than plaintext. */
export function isSealedSecret(value: string): boolean {
  return typeof value === "string" && value.startsWith(`${STORED_PREFIX}:`) && value.split(":").length === 3;
}

/**
 * Human-readable hint for a stored credential. Never returns the value or a
 * prefix of it: only its length, so the operator can confirm it was saved.
 */
export function secretHint(stored: string): string {
  if (!stored) return "";
  return `stored (${stored.length} chars, encrypted)`;
}
