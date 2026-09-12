import { ABILITY_KEYS, SPELLS } from "../shared/content";
import { abilityMod, weaponReference } from "../shared/table-companion";
import type { CampaignState } from "../shared/types";
import type { Act } from "./ui/types";
const signed = (value: number) => value >= 0 ? `+${value}` : String(value);

export function PlayerDashboard({ state, act, onLedger }: { state: CampaignState; act: Act; onLedger: () => void }) {
  return <section className="panel player-dashboard" aria-label="Player stat dashboard">
    <div className="companion-heading"><h2>Player stats & ledger</h2><button onClick={onLedger}>Inventory & character ledger</button></div>
    <div className="dashboard-roster">{state.characters.filter(c => c.rosterStatus !== "reserve").map(c => {
      const canEdit = state.me.role === "host" || state.me.characterId === c.id;
      const combatant = state.activeCombat?.status === "active" ? state.activeCombat.combatants.find(actor => actor.kind === "pc" && actor.refId === c.id) : undefined;
      const hp = (delta: number) => combatant ? act("combat:update_hp", { combatantId: combatant.id, delta }) : act("character:hp", { characterId: c.id, hp: Math.max(0, Math.min(c.maxHp, c.hp + delta)) });
      return <article key={c.id} className="companion-card">
        <div className="companion-heading"><h3>{c.name} <small>{c.className} {c.level}</small></h3><strong>AC {c.ac} · HP {c.hp}/{c.maxHp}</strong></div>
        <div className="companion-actions"><button disabled={!canEdit} onClick={() => void hp(-1)} title="Damage −1 HP">Damage −1 HP</button><button disabled={!canEdit} onClick={() => void hp(1)} title="Healing +1 HP">Healing +1 HP</button><span>{c.conditions?.join(" · ") || "No conditions"}</span></div>
        <dl className="stat-references">{(c.inventory ?? []).filter(w => w.equipped && w.kind === "weapon").map(w => {
          const r = weaponReference(c, w); return <div key={w.instanceId}><dt>{w.name}</dt><dd>Attack {signed(r.attackBonus)} · Damage {r.damageDie}{r.damageBonus ? signed(r.damageBonus) : ""}</dd></div>;
        })}</dl>
        <div className="save-reference">Saves: {ABILITY_KEYS.map(key => <span key={key}>{key.toUpperCase()} <b>{signed(abilityMod(c.abilities[key]))}</b></span>)}</div>
        <p>Movement: Near · Initiative {signed(abilityMod(c.abilities.dex))}{c.className.toLowerCase() === "thief" ? " · Trap sense: inspect sensory tells" : ""}</p>
        {(c.spells ?? []).map(spell => <div className="spell-reference" key={spell.spellId}><span>{SPELLS.find(s => s.id === spell.spellId)?.name ?? spell.spellId} · T{spell.tier} · DC {10 + spell.tier} · {signed(abilityMod(c.abilities[c.className.toLowerCase() === "priest" ? "wis" : "int"]))}</span><label><input type="checkbox" checked={spell.available && !spell.penanceRequired} disabled={!canEdit} onChange={e => void act("character:spell_available", { characterId: c.id, spellId: spell.spellId, available: e.target.checked })}/>Available{spell.penanceRequired ? " (penance required)" : ""}</label></div>)}
        <small>Talents: {c.talents?.join(" · ") || "None recorded"} · {c.gold} GP · Slots {(c.inventory ?? []).reduce((sum, item) => sum + item.slots * (item.quantity ?? 1), 0)}/{c.gearSlots}</small>
      </article>;
    })}</div>
    <p>Party rations: {state.campaign.rations ?? 0} · Light: {state.activeDungeon ? `${state.activeDungeon.lightTurnsRemaining} exploration turns` : "No active site light"}</p>
  </section>;
}
