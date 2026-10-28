import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOptions, origin, requireAdmin, seal } from "@/lib/security";
export async function GET(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  try {
    if (!process.env.PCO_CLIENT_ID || !process.env.PCO_CLIENT_SECRET || !/^\d+$/.test(process.env.PCO_ORGANIZATION_ID || "") || !process.env.PCO_USER_AGENT) throw new Error("Configure OAuth client, organization ID and contact User-Agent first.");
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://api.planningcenteronline.com/oauth/authorize");
    url.search = new URLSearchParams({ client_id: process.env.PCO_CLIENT_ID, redirect_uri: `${origin()}/api/auth/callback`, response_type: "code", scope: "services openid", prompt: "select_account", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set("pco_flow", seal({ state, verifier, expires: Date.now() + 600000 }), { ...cookieOptions(), maxAge: 600 });
    return response;
  } catch { return NextResponse.json({ error: "OAuth setup incomplete. Check README and server configuration." }, { status: 503 }); }
}
