import { requireAdmin } from "@/lib/security";
export async function POST(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  return Response.json({ success: false, error: "Publishing is not implemented in this starter. Review and schedule manually in Planning Center." }, { status: 403 });
}
