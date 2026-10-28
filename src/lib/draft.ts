export type Assignment = { planId: string; positionId: string; personId: string; source: "monthly" | "substitute" };
export function makeDraft(planIds: string[], positionIds: string[], monthly: Record<string, string>, substitutes: Record<string, string>): Assignment[] {
  return planIds.flatMap(planId => positionIds.flatMap(positionId => {
    const override = substitutes[`${planId}:${positionId}`];
    const personId = override === "__empty__" ? "" : override || monthly[positionId];
    return personId ? [{ planId, positionId, personId, source: override ? "substitute" as const : "monthly" as const }] : [];
  }));
}
export function duplicatePeople(assignments: Assignment[]) {
  const seen = new Set<string>();
  return assignments.filter(a => { const key = `${a.planId}:${a.personId}`; if (seen.has(key)) return true; seen.add(key); return false; });
}
