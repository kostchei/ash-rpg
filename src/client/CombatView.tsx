import { useState } from "react";
import type { CampaignState, EncounterMonster } from "../shared/types";
import { activeSeat, combatSeats, MONSTER_SEAT, abilityMod } from "../shared/table-companion";
import { EVENTS } from "../shared/protocol";
import type { Act } from "./ui/types";

/** What the table currently knows about a monster, gated by the lore tier already revealed server-side. */
function MonsterKnowledge({ monster }: { monster: EncounterMonster }) {
  const known = (monster.lore?.length ?? 0) > 0 || (monster.attacks?.length ?? 0) > 0 || (monster.traits?.length ?? 0) > 0;
  if (!known) {
    return <p className="monster-knowledge unknown">No lore revealed yet — the table doesn't recognize this creature. Test an attack or investigate to learn more.</p>;
  }
  return <div className="monster-knowledge">
    {monster.family && <p><b>Kind:</b> {monster.family}{monster.move ? ` · ${monster.move}` : ""}</p>}
    {monster.lore && monster.lore.length > 0 && <ul className="monster-lore">{monster.lore.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    {monster.attacks && monster.attacks.length > 0 && <div><b>Attacks:</b><ul className="monster-attacks">{monster.attacks.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}
    {monster.traits && monster.traits.length > 0 && <div><b>Traits:</b><ul className="monster-traits">{monster.traits.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
  </div>;
}

export function CombatView({ state, act }: { state: CampaignState; act: Act }) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [physicalRolls, setPhysicalRolls] = useState<Record<string, number>>({});
  const combat = state.activeCombat;
  const canManage = state.me.role === "host" || Boolean(state.me.isCaller);

  if (!combat || combat.status !== "active") {
    const pending = (state.encounters ?? []).find((e) => e.status === "active");
    if (!pending) {
      return <section className="panel"><h2>Encounter & initiative</h2><p>No active combat. Engage a discovered encounter from the map or site.</p></section>;
    }

    const lastReaction = [...state.rolls]
      .filter((r) => r.kind === "reaction" && r.createdAt >= pending.createdAt)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const avgChaMod = Math.round(
      state.characters.reduce((acc, c) => acc + abilityMod(c.abilities?.cha ?? 10), 0) /
        Math.max(1, state.characters.length),
    );

    return <section className="panel combat-main">
      <div className="companion-heading"><h2>⚠️ Encounter: {pending.name}</h2></div>
      <p>The party has run into something on the road. Here's what the table can see before anyone commits to a fight:</p>
      <div className="combat-cards">
        {pending.monsters.map((m) => <article className="companion-card" key={m.id}>
          <div className="companion-heading"><h3>{m.name}</h3><strong>AC {m.ac != null ? m.ac : "?"}</strong></div>
          <MonsterKnowledge monster={m} />
        </article>)}
      </div>
      {lastReaction ? (
        <p><b>Reaction:</b> {lastReaction.detail} ({lastReaction.total})</p>
      ) : (
        <button disabled={!canManage} onClick={() => void act(EVENTS.ORACLE_REACTION, { chaModifier: avgChaMod })}>Check reaction (2d6{avgChaMod >= 0 ? "+" : ""}{avgChaMod})</button>
      )}
      <div className="companion-actions">
        <button className="btn-hig btn-hig-ember" disabled={!canManage} onClick={() => void act(EVENTS.COMBAT_START, { encounterId: pending.id })}>Fight</button>
        <button disabled={!canManage} onClick={() => void act(EVENTS.ENCOUNTER_FLEE, {})}>Flee</button>
      </div>
    </section>;
  }

  const seats = combatSeats(combat);
  const spotlight = activeSeat(combat);
  const label = (id: string) => id === MONSTER_SEAT ? "Monsters / GM" : combat.combatants.find(c => c.id === id)?.name ?? id;
  const moveSeat = (index: number, delta: number) => {
    const order = [...seats];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    void act(EVENTS.COMBAT_SET_SEATING, { seatingOrder: order });
  };
  return <section className="panel combat-main">
    <div className="companion-heading"><div><small>Round {combat.round} · Clockwise</small><h2>{combat.winnerCombatantId ? `Spotlight: ${label(spotlight!)}` : "Select the initiative winner"}</h2></div>
      <button className="btn-hig btn-hig-ember" disabled={!canManage || !combat.winnerCombatantId} onClick={() => void act(EVENTS.COMBAT_NEXT_TURN, {})}>Next turn →</button>
    </div>
    <p>Roll DEX checks at the table. Monsters roll once using their highest DEX modifier. Select the winner; turns then follow the seating below.</p>
    <ol className="seating-track" aria-label="Clockwise table seating">
      {seats.map((id, index) => <li key={id} className={spotlight === id && combat.winnerCombatantId ? "spotlight" : ""}>
        <button className="btn-hig" disabled={!canManage} aria-pressed={combat.winnerCombatantId === id} onClick={() => void act(EVENTS.COMBAT_SET_WINNER, { seatId: id })}>{label(id)} {combat.winnerCombatantId === id ? "★" : ""}</button>
        <div><button disabled={!canManage || index === 0} aria-label={`Move ${label(id)} counterclockwise`} onClick={() => moveSeat(index, -1)}>←</button><button disabled={!canManage || index === seats.length - 1} aria-label={`Move ${label(id)} clockwise`} onClick={() => moveSeat(index, 1)}>→</button></div>
      </li>)}
    </ol>
    <div className="combat-cards">
      {combat.combatants.map(c => {
        const pc = c.kind === "pc";
        const hpVisible = pc || ["bloodied", "near_death", "defeated"].includes(c.hpStatus ?? "");
        const editable = canManage || (pc && c.refId === state.me.characterId);
        const liveEncounter = state.encounters?.find(e => e.id === combat.encounterId);
        const monsterInfo = !pc ? liveEncounter?.monsters.find(m => m.id === c.refId) : undefined;
        return <article className="companion-card" key={c.id}>
          <div className="companion-heading"><h3>{c.name}</h3><strong>AC {pc || c.acRevealed ? c.ac : "?"}</strong></div>
          {!pc && !c.acRevealed && <p>{c.acHint}<br/><button disabled={!canManage} onClick={() => void act(EVENTS.COMBAT_REVEAL_AC, { combatantId: c.id })}>Attack tested: reveal AC</button></p>}
          {monsterInfo && <MonsterKnowledge monster={monsterInfo} />}
          <strong className={!pc && hpVisible ? "bloodied" : ""}>{!pc && `${(c.hpStatus ?? "unharmed").replaceAll("_", " ")} · `}{hpVisible ? `${c.currentHp} / ${c.maxHp} HP` : "HP unknown"}</strong>
          <div className="companion-actions">
            {[-1, -5, 1].map(delta => <button key={delta} disabled={!editable} onClick={() => void act(EVENTS.COMBAT_UPDATE_HP, { combatantId: c.id, delta })}>{delta > 0 ? "+" : ""}{delta} HP</button>)}
            <label>Amount<input aria-label={`HP adjustment for ${c.name}`} type="number" min="1" value={amounts[c.id] ?? 1} onChange={e => setAmounts({ ...amounts, [c.id]: Math.max(1, Number(e.target.value)) })}/></label>
            <button disabled={!editable} onClick={() => void act(EVENTS.COMBAT_UPDATE_HP, { combatantId: c.id, delta: -(amounts[c.id] ?? 1) })}>Damage</button>
            <button disabled={!editable} onClick={() => void act(EVENTS.COMBAT_UPDATE_HP, { combatantId: c.id, delta: amounts[c.id] ?? 1 })}>Heal</button>
          </div>
          <div className="companion-actions">{["poisoned", "blinded", "paralyzed", "deafened", "exhausted"].map(condition => <button key={condition} disabled={!editable} aria-pressed={c.conditions.includes(condition)} onClick={() => void act(EVENTS.COMBAT_TOGGLE_CONDITION, { combatantId: c.id, condition })}>{condition}</button>)}</div>
          {pc && c.currentHp === 0 && <div><p>Death strikes: {c.deathStrikes ?? 0} / 3 · {c.stabilized ? "Stable" : "DC 10 CON death save"}</p>
            {!c.stabilized && !c.conditions.includes("dead") && <div className="companion-actions"><label>Physical d20<input type="number" min="1" max="20" value={physicalRolls[c.id] ?? 10} onChange={e => setPhysicalRolls({ ...physicalRolls, [c.id]: Number(e.target.value) })}/></label><button disabled={!editable} onClick={() => void act(EVENTS.COMBAT_DEATH_SAVE, { combatantId: c.id, diceMode: "physical", physicalRoll: physicalRolls[c.id] ?? 10 })}>Record death save</button></div>}
          </div>}
        </article>;
      })}
    </div>
    <details><summary>Morale reference</summary><p>When the leader falls or half the group is defeated, make the physical morale check and adjudicate surrender, flight, or continued fighting at the table.</p></details>
    <div className="companion-actions"><button disabled={!canManage} onClick={() => void act(EVENTS.COMBAT_END, { victor: "party" })}>Party victory</button><button disabled={!canManage} onClick={() => void act(EVENTS.COMBAT_END, { victor: "fled" })}>Party fled</button></div>
  </section>;
}
