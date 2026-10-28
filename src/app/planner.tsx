"use client";
import { useState } from "react";
import type { Resource } from "@/lib/pco";
import { duplicatePeople, makeDraft } from "@/lib/draft";
type Collection = { data: Resource[]; included?: Resource[] };
const name = (r?: Resource) => String(r?.attributes.name || r?.attributes.title || r?.attributes.dates || r?.id || "");
async function load(kind: string, service = "", team = ""): Promise<Collection> {
  const response = await fetch(`/api/planning-center?${new URLSearchParams({ kind, service, team })}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load data.");
  return data;
}
export default function Planner({ churchName }: { churchName: string }) {
  const [services, setServices] = useState<Resource[]>([]);
  const [teams, setTeams] = useState<Resource[]>([]);
  const [plans, setPlans] = useState<Resource[]>([]);
  const [positions, setPositions] = useState<Resource[]>([]);
  const [included, setIncluded] = useState<Resource[]>([]);
  const [service, setService] = useState("");
  const [team, setTeam] = useState("");
  const [month, setMonth] = useState("");
  const [enabled, setEnabled] = useState<string[]>([]);
  const [monthly, setMonthly] = useState<Record<string, string>>({});
  const [substitutes, setSubstitutes] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function clearDraft() { setMonthly({}); setSubstitutes({}); setReview(false); }
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); } finally { setBusy(false); } }
  const months = [...new Set(plans.map(p => String(p.attributes.sort_date || "").slice(0, 7)).filter(Boolean))];
  const monthPlans = plans.filter(p => String(p.attributes.sort_date || "").startsWith(month) && month);
  const selectedPositions = positions.filter(p => enabled.includes(p.id));
  function musicians(positionId: string) {
    const ids = new Set(included.filter(r => r.type === "PersonTeamPositionAssignment" && r.relationships?.team_position?.data?.id === positionId).map(r => r.relationships?.person?.data?.id));
    return included.filter(r => r.type === "Person" && ids.has(r.id)).sort((a,b) => name(a).localeCompare(name(b)));
  }
  const draft = makeDraft(monthPlans.map(p => p.id), enabled, monthly, substitutes);
  const duplicates = duplicatePeople(draft);
  function exportDraft() {
    const assignments = draft.map(a => ({ ...a, personName: name(included.find(p => p.type === "Person" && p.id === a.personId)), positionName: name(positions.find(p => p.id === a.positionId)), planLabel: name(plans.find(p => p.id === a.planId)) }));
    const url = URL.createObjectURL(new Blob([JSON.stringify({ churchName, serviceTypeId: service, teamId: team, month, availability: "NOT CHECKED - verify blockouts and all assignments in Planning Center", assignments }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `draft-${month}.json`; link.click(); URL.revokeObjectURL(url);
  }
  return <main>
    <header><p className="eyebrow">PRIVATE BAND PLANNER</p><h1>{churchName}</h1><p>Build a monthly roster, choose substitutes, and review your draft.</p></header>
    <section className="notice"><strong>Drafts only — live publishing is locked.</strong><p>This starter does not check blockouts, overlapping services, existing assignments or all musician eligibility. Verify those in Planning Center before scheduling. Drafts are held in this tab and disappear on reload.</p></section>
    <nav><a className="button" href="/api/auth/connect">Connect / reconnect Planning Center</a><form action="/api/auth/disconnect" method="post"><button>Clear connection</button></form><a href="https://services.planningcenteronline.com" target="_blank" rel="noreferrer">Open Planning Center</a></nav>
    <p className="small">Connection expires within one hour. Clearing it removes this browser session; revoke the app in Planning Center to revoke consent. Close your browser to end cached app-password access.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <fieldset disabled={busy}>
      <legend>1. Choose your church’s service and band team</legend>
      <button onClick={() => run(async () => { setServices((await load("services")).data); })}>{busy ? "Loading…" : "Load my service types"}</button>
      <label>Service type<select value={service} onChange={e => { const value = e.target.value; setService(value); setTeam(""); setTeams([]); setPlans([]); setPositions([]); setIncluded([]); setEnabled([]); clearDraft(); if (value) void run(async () => { const [t,p] = await Promise.all([load("teams",value),load("plans",value)]); setTeams(t.data); setPlans(p.data); setMonth(String(p.data[0]?.attributes.sort_date || "").slice(0,7)); }); }}><option value="">Choose a service</option>{services.map(s => <option key={s.id} value={s.id}>{name(s)}</option>)}</select></label>
      <label>Band team<select value={team} onChange={e => { const value = e.target.value; setTeam(value); setPositions([]); setIncluded([]); setEnabled([]); clearDraft(); if (value) void run(async () => { const result = await load("positions",service,value); setPositions(result.data); setIncluded(result.included || []); }); }}><option value="">Choose a team</option>{teams.map(t => <option key={t.id} value={t.id}>{name(t)}</option>)}</select></label>
      <p>Select only the instrumental positions your band uses:</p>
      <div className="positions">{positions.map(p => <label key={p.id}><input type="checkbox" checked={enabled.includes(p.id)} onChange={e => { setEnabled(e.target.checked ? [...enabled,p.id] : enabled.filter(id => id !== p.id)); setReview(false); }} />{name(p)}</label>)}</div>
      {team && !busy && !positions.length && <p>No positions loaded for this team.</p>}
    </fieldset>
    <fieldset disabled={busy}><legend>2. Set monthly musicians and substitutes</legend>
      <label>Month<select value={month} onChange={e => { setMonth(e.target.value); clearDraft(); }}><option value="">Choose a month</option>{months.map(m => <option key={m}>{m}</option>)}</select></label>
      <p>Changing the service, team or month clears the draft. Only future plans are loaded.</p>
      {selectedPositions.map(position => <label key={position.id}>{name(position)} — monthly musician<select value={monthly[position.id] || ""} onChange={e => { setMonthly({...monthly,[position.id]: e.target.value}); setSubstitutes(Object.fromEntries(Object.entries(substitutes).filter(([key]) => !key.endsWith(`:${position.id}`)))); setReview(false); }}><option value="">Unassigned</option>{musicians(position.id).map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}</select></label>)}
      {!!selectedPositions.length && <div className="scroll"><table><caption>Date-specific substitutes (optional)</caption><thead><tr><th>Plan</th>{selectedPositions.map(p => <th key={p.id}>{name(p)}</th>)}</tr></thead><tbody>{monthPlans.map(plan => <tr key={plan.id}><th>{String(plan.attributes.dates || name(plan))}</th>{selectedPositions.map(position => <td key={position.id}><select aria-label={`${name(plan)} ${name(position)} substitute`} value={substitutes[`${plan.id}:${position.id}`] || ""} onChange={e => { setSubstitutes({...substitutes,[`${plan.id}:${position.id}`]:e.target.value}); setReview(false); }}><option value="">Use monthly musician</option><option value="__empty__">Leave unassigned</option>{musicians(position.id).map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}</select></td>)}</tr>)}</tbody></table></div>}
      <button disabled={!draft.length} onClick={() => setReview(true)}>Review {draft.length} draft assignments</button><button onClick={clearDraft}>Clear draft</button>
    </fieldset>
    {review && <section><h2>3. Review draft</h2><p>Every entry still requires a manual availability check. Nothing has been sent to Planning Center.</p>{duplicates.length > 0 && <p role="alert" className="error">A musician has multiple positions in the same plan. Resolve those duplicate assignments before scheduling.</p>}<ul>{draft.map(a => <li key={`${a.planId}:${a.positionId}`}>{String(plans.find(p => p.id === a.planId)?.attributes.dates || a.planId)} · {name(positions.find(p => p.id === a.positionId))} · {name(included.find(p => p.type === "Person" && p.id === a.personId))} ({a.source})</li>)}</ul><button onClick={exportDraft}>Download private draft JSON</button><p className="small">The download contains musician names. Keep it private. Schedule manually in Planning Center after reviewing conflicts and notifications.</p></section>}
  </main>;
}
