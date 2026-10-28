import { NextRequest } from "next/server";
import { id, requireAdmin, unseal } from "@/lib/security";
import { readCollection } from "@/lib/pco";
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request); if (denied) return denied;
  const session = unseal<{ token: string; organizationId: string; expires: number }>(request.cookies.get("pco_session")?.value);
  if (!session || !process.env.PCO_ORGANIZATION_ID || session.organizationId !== process.env.PCO_ORGANIZATION_ID) return Response.json({ error: "Connect your church account, or reconnect if the session expired." }, { status: 401 });
  try {
    const q = request.nextUrl.searchParams;
    let path: string;
    switch (q.get("kind")) {
      case "services": path = "/services/v2/service_types?per_page=100"; break;
      case "teams": path = `/services/v2/service_types/${id(q.get("service"))}/teams?per_page=100`; break;
      case "plans": path = `/services/v2/service_types/${id(q.get("service"))}/plans?filter=future&order=sort_date&per_page=100`; break;
      case "positions": path = `/services/v2/service_types/${id(q.get("service"))}/teams/${id(q.get("team"))}/team_positions?include=person_team_position_assignments.person&per_page=100`; break;
      default: return Response.json({ error: "Invalid request kind." }, { status: 400 });
    }
    return Response.json(await readCollection(path, session.token), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Unable to load selection. Check IDs, permissions and connection; no partial results were returned." }, { status: 502 }); }
}
