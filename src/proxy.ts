import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "./lib/security";
export function proxy(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
// Gate every page and API, including OAuth routes; routes also check independently.
export const config = { matcher: ["/:path*"] };
