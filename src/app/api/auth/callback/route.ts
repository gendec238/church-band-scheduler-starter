import { NextRequest, NextResponse } from "next/server";
import { cookieOptions, equal, origin, requireAdmin, seal, unseal } from "@/lib/security";
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  try {
    const flow = unseal<{ state: string; verifier: string; expires: number }>(request.cookies.get("pco_flow")?.value);
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!flow || !state || !equal(state, flow.state) || !code) throw new Error("Invalid flow");
    const tokenResponse = await fetch("https://api.planningcenteronline.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": process.env.PCO_USER_AGENT! }, body: JSON.stringify({ grant_type: "authorization_code", code, code_verifier: flow.verifier, client_id: process.env.PCO_CLIENT_ID, client_secret: process.env.PCO_CLIENT_SECRET, redirect_uri: `${origin()}/api/auth/callback` }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!tokenResponse.ok) throw new Error("Token exchange failed");
    const token = await tokenResponse.json();
    if (typeof token.access_token !== "string" || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new Error("Invalid token");
    const identityResponse = await fetch("https://api.planningcenteronline.com/oauth/userinfo", { headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": process.env.PCO_USER_AGENT! }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!identityResponse.ok) throw new Error("Identity verification failed");
    const identity = await identityResponse.json();
    if (!process.env.PCO_ORGANIZATION_ID || String(identity.organization_id) !== process.env.PCO_ORGANIZATION_ID) throw new Error("Wrong organization");
    const maxAge = Math.max(1, Math.min(token.expires_in - 60, 3600));
    const session = seal({ token: token.access_token, organizationId: String(identity.organization_id), expires: Date.now() + maxAge * 1000 });
    if (session.length > 3500) throw new Error("Token exceeds cookie capacity");
    const response = NextResponse.redirect(new URL("/", origin()));
    response.cookies.set("pco_session", session, { ...cookieOptions(), maxAge });
    response.cookies.set("pco_flow", "", { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch {
    const response = NextResponse.json({ error: "Connection failed. Check credentials, redirect URI, expected church and consent, then reconnect." }, { status: 400 });
    response.cookies.delete("pco_flow");
    return response;
  }
}
