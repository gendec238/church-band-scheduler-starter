import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function equal(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function authorized(header: string | null, env: Record<string, string | undefined> = process.env) {
  if (!env.APP_USERNAME || !env.APP_PASSWORD || env.APP_PASSWORD.length < 32) return false;
  if (!header?.startsWith("Basic ")) return false;
  const value = Buffer.from(header.slice(6), "base64").toString("utf8");
  return equal(value, `${env.APP_USERNAME}:${env.APP_PASSWORD}`);
}

export function requireAdmin(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response("Authentication required. Configure APP_USERNAME and a password of at least 32 characters.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Church scheduler", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }
  return null;
}

function key() {
  const value = process.env.SESSION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Configure SESSION_KEY with 32 random bytes in hex.");
  return Buffer.from(value, "hex");
}

export function seal(value: object) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString("base64url");
}

export function unseal<T extends { expires: number }>(value?: string): T | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    cipher.setAuthTag(raw.subarray(-16));
    const parsed = JSON.parse(Buffer.concat([cipher.update(raw.subarray(12, -16)), cipher.final()]).toString()) as T;
    return Number.isFinite(parsed.expires) && parsed.expires > Date.now() ? parsed : null;
  } catch { return null; }
}

export function origin() {
  const value = process.env.APP_ORIGIN || "";
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password) throw new Error("APP_ORIGIN must be an exact origin without a trailing slash.");
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("HTTPS is required outside local development.");
  }
  return value;
}

export const cookieOptions = () => ({ httpOnly: true, secure: origin().startsWith("https:"), sameSite: "lax" as const, path: "/" });
export function id(value: string | null) {
  if (!value || !/^\d{1,20}$/.test(value)) throw new Error("Choose a valid Planning Center ID.");
  return value;
}
