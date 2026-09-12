import { useState } from "react";
import type { CampaignState } from "../shared/types";
import { activeSeat, combatSeats, MONSTER_SEAT } from "../shared/table-companion";
import type { Act } from "./ui/types";

export function CombatView({ state, act }: { state: CampaignState; act: Act }) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [physicalRolls, setPhysicalRolls] = useState<Record<string, number>>({});
  const combat = state.activeCombat;
  const canManage = state.me.role === "host" || Boolean(state.me.isCaller);
  if (!combat || combat.status !== "active") return <section className="panel"><h2>Encounter & initiative</h2><p>No active combat. Engage a discovered encounter from the map or site.</p></section>;
  const seats = combatSeats(combat);
  const spotlight = activeSeat(combat);
  const label = (id: string) => id === MONSTER_SEAT ? "Monsters / GM" : combat.combatants.find(c => c.id === id)?.name ?? id;
  const moveSeat = (index: number, delta: number) => {
    const order = [...seats];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    void act("combat:set_seating", { seatingOrder: order });
  };
  return <section className="panel combat-main">
    <div className="companion-heading"><div><small>Round {combat.round} · Clockwise</small><h2>{combat.winnerCombatantId ? `Spotlight: ${label(spotlight!)}` : "Select the initiative winner"}</h2></div>
      <button className="btn-hig btn-hig-ember" disabled={!canManage || !combat.winnerCombatantId} onClick={() => void act("combat:next_turn", {})}>Next turn →</button>
    </div>
    <p>Roll DEX checks at the table. Monsters roll once using their highest DEX modifier. Select the winner; turns then follow the seating below.</p>
    <ol className="seating-track" aria-label="Clockwise table seating">
      {seats.map((id, index) => <li key={id} className={spotlight === id && combat.winnerCombatantId ? "spotlight" : ""}>
        <button className="btn-hig" disabled={!canManage} aria-pressed={combat.winnerCombatantId === id} onClick={() => void act("combat:set_winner", { seatId: id })}>{label(id)} {combat.winnerCombatantId === id ? "★" : ""}</button>
        <div><button disabled={!canManage || index === 0} aria-label={`Move ${label(id)} counterclockwise`} onClick={() => moveSeat(index, -1)}>←</button><button disabled={!canManage || index === seats.length - 1} aria-label={`Move ${label(id)} clockwise`} onClick={() => moveSeat(index, 1)}>→</button></div>
      </li>)}
    </ol>
    <div className="combat-cards">
      {combat.combatants.map(c => {
        const pc = c.kind === "pc";
        const hpVisible = pc || ["bloodied", "near_death", "defeated"].includes(c.hpStatus ?? "");
        const editable = canManage || (pc && c.refId === state.me.characterId);
        return <article className="companion-card" key={c.id}>
          <div className="companion-heading"><h3>{c.name}</h3><strong>AC {pc || c.acRevealed ? c.ac : "?"}</strong></div>
          {!pc && !c.acRevealed && <p>{c.acHint}<br/><button disabled={!canManage} onClick={() => void act("combat:reveal_ac", { combatantId: c.id })}>Attack tested: reveal AC</button></p>}
          <strong className={!pc && hpVisible ? "bloodied" : ""}>{!pc && `${(c.hpStatus ?? "unharmed").replaceAll("_", " ")} · `}{hpVisible ? `${c.currentHp} / ${c.maxHp} HP` : "HP unknown"}</strong>
          <div className="companion-actions">
            {[-1, -5, 1].map(delta => <button key={delta} disabled={!editable} onClick={() => void act("combat:update_hp", { combatantId: c.id, delta })}>{delta > 0 ? "+" : ""}{delta} HP</button>)}
            <label>Amount<input aria-label={`HP adjustment for ${c.name}`} type="number" min="1" value={amounts[c.id] ?? 1} onChange={e => setAmounts({ ...amounts, [c.id]: Math.max(1, Number(e.target.value)) })}/></label>
            <button disabled={!editable} onClick={() => void act("combat:update_hp", { combatantId: c.id, delta: -(amounts[c.id] ?? 1) })}>Damage</button>
            <button disabled={!editable} onClick={() => void act("combat:update_hp", { combatantId: c.id, delta: amounts[c.id] ?? 1 })}>Heal</button>
          </div>
          <div className="companion-actions">{["poisoned", "blinded", "paralyzed", "deafened", "exhausted"].map(condition => <button key={condition} disabled={!editable} aria-pressed={c.conditions.includes(condition)} onClick={() => void act("combat:toggle_condition", { combatantId: c.id, condition })}>{condition}</button>)}</div>
          {pc && c.currentHp === 0 && <div><p>Death strikes: {c.deathStrikes ?? 0} / 3 · {c.stabilized ? "Stable" : "DC 10 CON death save"}</p>
            {!c.stabilized && !c.conditions.includes("dead") && <div className="companion-actions"><label>Physical d20<input type="number" min="1" max="20" value={physicalRolls[c.id] ?? 10} onChange={e => setPhysicalRolls({ ...physicalRolls, [c.id]: Number(e.target.value) })}/></label><button disabled={!editable} onClick={() => void act("combat:death_save", { combatantId: c.id, diceMode: "physical", physicalRoll: physicalRolls[c.id] ?? 10 })}>Record death save</button></div>}
          </div>}
        </article>;
      })}
    </div>
    <details><summary>Morale reference</summary><p>When the leader falls or half the group is defeated, make the physical morale check and adjudicate surrender, flight, or continued fighting at the table.</p></details>
    <div className="companion-actions"><button disabled={!canManage} onClick={() => void act("combat:end", { victor: "party" })}>Party victory</button><button disabled={!canManage} onClick={() => void act("combat:end", { victor: "fled" })}>Party fled</button></div>
  </section>;
}
