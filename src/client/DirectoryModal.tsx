import { reportedLeadDanger } from "../shared/tavern-leads";
import { useState } from "react";
import type { CampaignState } from "../shared/types";
import { npcHexId } from "../shared/directory";
import type { Act } from "./ui/types";
import { Modal } from "./ui/Modal";

export function DirectoryModal({ isOpen, onClose, state, act, onMap, hexId }: { isOpen: boolean; onClose: () => void; state: CampaignState; act: Act; onMap: (hexId: string) => void; hexId?: string }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("npcs");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const canEdit = state.me.role === "host" || Boolean(state.me.isCaller);
  const matches = (text: string) => text.toLowerCase().includes(query.toLowerCase());
  if (!isOpen) return null;
  return <Modal title={`Living world directory${hexId ? ` · Hex ${hexId}` : ""}`} onClose={onClose}>
    <input aria-label="Search directory" placeholder="Search people, facilities, rumors…" value={query} onChange={e => setQuery(e.target.value)}/>
    <div className="companion-actions">{["npcs", "facilities", "leads"].map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === "npcs" && canEdit && <details><summary>Record a person at the party’s current location</summary><form onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const values = new FormData(form); await act("npc:record", { name: values.get("name"), role: values.get("role"), ancestry: values.get("ancestry"), notes: values.get("notes") }); form.reset(); }}><label>Name<input name="name" required maxLength={80}/></label><label>Role<input name="role" required maxLength={80}/></label><label>Ancestry<input name="ancestry" required maxLength={80}/></label><label>Notes<textarea name="notes" maxLength={4000}/></label><button>Save dossier</button></form></details>}
    {tab === "npcs" && (state.worldNpcs ?? []).filter(n => (!hexId || npcHexId(n, state) === hexId) && matches(`${n.name} ${n.role} ${n.notes}`)).map(n => <article className="companion-card" key={n.id}>
      <h3>{n.name}</h3><p>{n.ancestry} · {n.role} · {n.locationName ?? n.locationId}</p>
      {npcHexId(n, state) && <button onClick={() => onMap(npcHexId(n, state)!)}>Show on map</button>}
      <label>Disposition<select disabled={!canEdit} value={n.disposition} onChange={e => void act("npc:update_disposition", { npcId: n.id, disposition: e.target.value })}>{["uncertain", "hostile", "neutral", "friendly"].map(d => <option key={d}>{d}</option>)}</select></label>
      <p>On approach, roll physical 2d6 + CHA: 2–3 hostile, 4–6 suspicious, 7–9 neutral, 10–11 friendly, 12+ allied. Record the table’s decision above.</p>
      <label>Session notes, favors & debts<textarea disabled={!canEdit} value={drafts[n.id] ?? n.notes} onChange={e => setDrafts({ ...drafts, [n.id]: e.target.value })}/></label><button disabled={!canEdit || drafts[n.id] === undefined} onClick={async () => { await act("npc:update_disposition", { npcId: n.id, disposition: n.disposition, notes: drafts[n.id] }); setDrafts(d => { const next = { ...d }; delete next[n.id]; return next; }); }}>Save notes</button>
    </article>)}
    {tab === "facilities" && (state.facilities ?? []).filter(f => (!hexId || f.locationId === hexId) && matches(`${f.name} ${f.description} ${f.keeperName}`)).map(f => <article className="companion-card" key={f.id}><h3>{f.name}</h3><p>Keeper: {f.keeperName}</p><p>{f.description}</p><ul>{f.services.map(service => <li key={service}>{service}</li>)}</ul><button onClick={() => onMap(f.locationId)}>Show on map · Hex {f.locationId}</button></article>)}
    {tab === "leads" && (state.tavernLeads ?? []).filter(l => matches(`${l.claim} ${l.sourceNpc}`)).map(l => <article className="companion-card" key={l.id}><h3>{l.title ?? l.claim}</h3><p>{l.claim}</p><p>Source: {l.sourceNpc ?? l.source}</p><p>Direction: {l.directionHint}</p><p>Reported danger: {reportedLeadDanger(l, state.hexes)}</p><p>Promised reward: {l.promisedReward}</p>{l.targetHexId && <button onClick={() => onMap(l.targetHexId!)}>Show rumored hex {l.targetHexId}</button>}</article>)}
  </Modal>;
}
