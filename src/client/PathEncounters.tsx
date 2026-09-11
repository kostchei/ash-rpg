import { useEffect, useRef, useState } from "react";
import type { CampaignState } from "../shared/types";
import type { OuterPathId, PublicEncounterPack } from "../shared/path-encounters";
type Act = <T>(event: string, payload?: unknown, success?: string) => Promise<T>;
type Result = { pack: PublicEncounterPack | null; catalogue?: { id: OuterPathId; title: string }[] };

export function PathEncounters({ state, act }: { state: CampaignState; act: Act }) {
  const [data, setData] = useState<Result>({ pack: null });
  const [selection, setSelection] = useState<OuterPathId>("cthulhu");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actRef = useRef(act); actRef.current = act;
  useEffect(() => {
    let cancelled = false;
    actRef.current<Result>("path_encounters:read").then(result => {
      if (!cancelled) { setData(result); setError(""); }
    }).catch(e => { if (!cancelled) setError(String(e.message ?? e)); });
    return () => { cancelled = true; };
  }, [state.campaign.revision]);
  const canAct = state.me.role === "host" || state.me.isCaller;
  async function commit(event: string, payload: object) {
    setBusy(true); setError("");
    try { const result = await act<Result>(event, payload); setData(current => ({ ...current, ...result })); setNotes(""); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  const pack = data.pack;
  return <section className="panel" aria-label="Adventure encounters" style={{ marginBottom: 20 }}>
    <h2>Adventure encounters</h2>
    {error && <p role="alert">{error}</p>}
    {!pack ? <>
      <p>Connected sites, witnesses and evidence for a table-run incursion. The host chooses a pack once; discoveries and outcomes are saved.</p>
      {state.me.role === "host" ? <>
        <label>Encounter pack <select value={selection} onChange={e => setSelection(e.target.value as OuterPathId)}>
          {(data.catalogue ?? []).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select></label>
        <button disabled={busy || !data.catalogue?.length} onClick={() => commit("path_encounters:start", { pathId: selection })}>Begin encounter pack</button>
      </> : <p>The host has not chosen an encounter pack.</p>}
    </> : <>
      <h3>{pack.title}{pack.won ? " — incursion resolved" : ""}</h3>
      <p>Use the existing map and travel rules to reach sites. Record arrival here afterward. Resolve combat and checks at the table; this panel records their outcomes.</p>
      <p><strong>Encounter materials:</strong> {Object.entries(pack.assets).map(([key, n]) => `${n} ${key}`).join(" · ")}. Recorded site work: {pack.minutes} minutes. Account for this time and any character-sheet effects using the normal table controls.</p>
      {canAct && <label>Travel, roll, or ruling notes
        <textarea value={notes} maxLength={500} onChange={e => setNotes(e.target.value)} placeholder="Record the route travelled, roll result, negotiated terms, or completed physical operation." />
      </label>}
      <details><summary>Known destinations</summary>
        {pack.knownSites.map(site => <article key={site.id}>
          <strong>{site.name}</strong><p>{site.directions}</p>
          {canAct && site.id !== pack.currentSite.id && <button disabled={busy || !notes.trim()}
            onClick={() => commit("path_encounters:arrive", { siteId: site.id, notes })}>Record arrival</button>}
        </article>)}
      </details>
      <h3>{pack.currentSite.name}</h3><p>{pack.currentSite.arrival}</p><p><strong>Warning:</strong> {pack.currentSite.warning}</p>
      {pack.currentSite.npcs.map(npc => <article className="sub-panel" key={npc.id}>
        <h4>{npc.name}</h4><p>{npc.role}. {npc.wants}</p><p>Offers: {npc.offers}</p><p>Refuses: {npc.refuses}</p>
      </article>)}
      {pack.currentSite.monsters.map(m => <details key={m.id}><summary>{m.count} × {m.name}</summary>
        <p>AC {m.ac} · HP {m.hpEach} each · Attack {m.attack} · Morale {m.morale}</p>
        <p><strong>Objective:</strong> {m.objective}</p><p>{m.tactic}</p><p>{m.defeat}</p>
      </details>)}
      {pack.actions.map(a => <article className="sub-panel" key={a.id}>
        <h4>{a.label}</h4><p>{a.procedure}</p>{a.check && <p>{a.check}</p>}
        <p>{a.minutes} minutes{Object.entries(a.costs).map(([k, n]) => ` · Costs ${n} ${k}`).join("")}</p>
        {a.check && <p><strong>If unsuccessful:</strong> {a.failure}</p>}
        {a.reason && <p>{a.reason}</p>}
        {canAct && <>
          <button disabled={busy || !a.available || (!!a.check && notes.trim().length < 3)} onClick={() => commit("path_encounters:interact", { interactionId: a.id, outcome: "success", notes })}>
            {a.check ? "Record completed outcome" : "Perform action"}</button>
          {a.check && <button disabled={busy || !a.available || notes.trim().length < 3} onClick={() => commit("path_encounters:interact", { interactionId: a.id, outcome: "failure", notes })}>Record unsuccessful attempt</button>}
        </>}
      </article>)}
      <details><summary>Quests and evidence</summary>
        {pack.quests.map(q => <article key={q.title}><strong>{q.completed ? "✓ " : ""}{q.title}</strong><p>{q.request}</p><p>Reward: {q.reward}</p></article>)}
        {pack.clues.map(c => <article key={c.id}><p>{c.text}</p><small>Source: {c.source}</small></article>)}
      </details>
      <details><summary>Consequences and journal</summary>
        {pack.toll.map(t => <p key={t}>{t}</p>)}
        {pack.journal.slice(-30).map(entry => <p key={entry.sequence}>{entry.text}</p>)}
      </details>
    </>}
  </section>;
}
