export type Resource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
};
type Collection = { data: Resource[]; included?: Resource[]; links?: { next?: string | null } };
const BASE = "https://api.planningcenteronline.com";

export async function readCollection(path: string, token: string, transport: typeof fetch = fetch): Promise<Collection> {
  let url: string | null = BASE + path;
  const data: Resource[] = [];
  const included = new Map<string, Resource>();
  const visited = new Set<string>();
  while (url) {
    const parsed = new URL(url);
    if (parsed.origin !== BASE || !parsed.pathname.startsWith("/services/v2/")) throw new Error("Invalid API pagination URL.");
    if (visited.has(url) || visited.size >= 50) throw new Error("Too many pages; narrow your selection. No partial data returned.");
    visited.add(url);
    const response = await transport(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, "User-Agent": process.env.PCO_USER_AGENT || "ChurchScheduler", Accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Planning Center read failed (${response.status}). Reconnect or check your Services permissions.`);
    const page = await response.json() as Collection;
    if (!Array.isArray(page.data)) throw new Error("Unexpected Planning Center response.");
    data.push(...page.data);
    for (const item of page.included || []) included.set(`${item.type}:${item.id}`, item);
    url = page.links?.next || null;
  }
  return { data, included: [...included.values()] };
}
