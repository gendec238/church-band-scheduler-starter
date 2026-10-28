import { NextResponse } from "next/server";
import { origin, requireAdmin } from "@/lib/security";
export async function POST(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  if (request.headers.get("origin") !== origin()) return new Response("Invalid origin", { status: 403 });
  const response = NextResponse.redirect(new URL("/", origin()), 303);
  response.cookies.delete("pco_session");
  response.cookies.delete("pco_flow");
  return response;
}
