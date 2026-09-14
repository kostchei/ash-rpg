import { useMemo, useState } from "react";
import { CODEX_ENTRIES, type CodexEntry } from "../shared/codex-data";
import { CLASSES, ITEMS, SPELLS } from "../shared/content";
import { BESTIARY_ENTRIES } from "../shared/bestiary-data";
import type { CampaignState } from "../shared/types";
import { Modal } from "./ui/Modal";

export function CodexModal({ isOpen, onClose, state }: { isOpen: boolean; onClose: () => void; state: CampaignState }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();

  const isHost = state.me?.role === "host";

  const entries = useMemo<CodexEntry[]>(() => {
    // Map existing discovered monsters by key/name
    const discoveredMap = new Map<string, number>();
    for (const enc of state.encounters ?? []) {
      for (const m of enc.monsters ?? []) {
        if (m.loreTier > 0) {
          const current = discoveredMap.get(m.monsterKey) ?? 0;
          discoveredMap.set(m.monsterKey, Math.max(current, m.loreTier));
          const nameKey = m.name.toLowerCase();
          discoveredMap.set(nameKey, Math.max(discoveredMap.get(nameKey) ?? 0, m.loreTier));
        }
      }
    }

    const monsterEntries: CodexEntry[] = BESTIARY_ENTRIES.map((m) => {
      const tier = isHost ? 4 : (discoveredMap.get(m.id) ?? discoveredMap.get(m.name.toLowerCase()) ?? 0);
      const abilitiesStr = Object.entries(m.abilities).map(([k, v]) => `${k.toUpperCase()} ${v >= 0 ? `+${v}` : v}`).join(" · ");
      const attacksStr = m.attacks.length ? m.attacks.map(a => `• ${a}`).join("\n") : "• None";
      const traitsStr = m.traits.length ? m.traits.map(t => `• ${t}`).join("\n") : "• None";

      let summary: string;
      let details: string;

      if (tier >= 3) {
        summary = `Level ${m.level} ${m.family} · ${m.source.replace(/_/g, " ")} · AC ${m.ac} · HP ${m.hp} · MV ${m.move} · AL ${m.alignment}`;
        details = [
          `LEVEL ${m.level} | AC ${m.ac} | HP ${m.hp} | Morale ${m.morale} | Move ${m.move} | Alignment ${m.alignment}`,
          `Abilities: ${abilitiesStr}`,
          `\nAttacks:\n${attacksStr}`,
          `\nTraits:\n${traitsStr}`,
        ].join("\n");
      } else if (tier === 2) {
        summary = `Level ${m.level} ${m.family} · Studied Lore Tier 2 · Known AC ${m.ac}`;
        details = [
          `LEVEL ${m.level} | Known AC ${m.ac} | Move ${m.move} | Alignment ${m.alignment}`,
          `\nAttacks:\n${attacksStr}`,
          `\nTraits:\n${traitsStr}`,
        ].join("\n");
      } else if (tier === 1) {
        summary = `Level ${m.level} ${m.family} · Discovered Lore Tier 1 · Combat Behavior Known`;
        details = [
          `LEVEL ${m.level} | Move ${m.move}`,
          `\nAttacks:\n${attacksStr}`,
          `\nTraits:\n${traitsStr}`,
        ].join("\n");
      } else {
        summary = `${m.family} · details unrevealed`;
        details = [
          `[Combat stats, attacks, and traits remain unrevealed.]`,
          `Make a Monsternomicon lore check (INT) to learn more.`,
        ].join("\n");
      }

      return {
        id: `monster-${m.id}`,
        category: "monsters" as const,
        title: m.name,
        subtitle: isHost ? `LV ${m.level} · AC ${m.ac} · HP ${m.hp}` : `Tier ${tier}`,
        tags: ["monsters", "bestiary", m.source, m.family ?? "monster", m.name.toLowerCase()],
        summary,
        details,
      };
    });

    return [
      ...CODEX_ENTRIES.filter(e => e.category !== "gear" && e.category !== "spells"),
      ...ITEMS.map(item => ({ id: `item-${item.id}`, category: "gear" as const, title: item.name, tags: [item.kind, ...(item.properties ?? [])], summary: `${item.slots} slots · ${item.costGp} GP${item.damage ? ` · ${item.damage} damage` : ""}${item.baseAc ? ` · Base AC ${item.baseAc}` : ""}`, details: `${item.description ?? ""}\n${item.properties?.join(", ") ?? ""}${item.acBonus ? `\nAC bonus: +${item.acBonus}` : ""}${item.maxDexMod !== undefined ? `\nMaximum DEX modifier: ${item.maxDexMod}` : ""}` })),
      ...SPELLS.map(spell => ({ id: `spell-${spell.id}`, category: "spells" as const, title: spell.name, tags: [spell.sphere], dc: 10 + spell.tier, summary: `Tier ${spell.tier} ${spell.sphere} · ${spell.range} · ${spell.duration}`, details: spell.description })),
      ...CLASSES.flatMap(c => [...(c.level1Features ?? []).map(f => ({ id: `${c.id}-${f.name}`, category: "talents" as const, title: `${c.name}: ${f.name}`, summary: f.description, details: f.description, tags: [c.name] })), ...(c.talentTable ?? []).map(t => ({ id: `${c.id}-talent-${t.roll}`, category: "talents" as const, title: `${c.name} talent ${t.roll}`, summary: t.effect, details: t.effect, tags: [c.name] }))]),
      ...monsterEntries,
      ...state.encounters.flatMap(e => e.monsters.filter(m => m.loreTier > 0).map(m => ({ id: `known-${m.id}`, category: "discoveries" as const, title: m.name, summary: `Discovered lore ${m.loreTier}`, details: [...(m.lore ?? []), ...(m.traits ?? [])].join("\n"), tags: ["bestiary"] }))),
      ...(state.campaign.adventurePath?.activeSituation?.knownClues ?? []).map((clue, i) => ({ id: `clue-${i}`, category: "discoveries" as const, title: `Discovered clue ${i + 1}`, summary: clue, details: clue, tags: ["lore"] })),
    ];
  }, [state.encounters, state.campaign.adventurePath, isHost]);

  const filtered = useMemo(() => entries.filter(e => (category === "all" || e.category === category) && `${e.title} ${e.summary} ${e.details} ${e.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())), [entries, query, category]);
  const selected = filtered.find(e => e.id === selectedId) ?? filtered[0];

  if (!isOpen) return null;

  return (
    <Modal title="Table Codex" onClose={onClose}>
      <input autoFocus aria-label="Search Codex" placeholder="Search conditions, spells, monsters, gear, talents, procedures…" value={query} onChange={e => setQuery(e.target.value)}/>
      <div className="companion-actions">
        {["all", "monsters", "conditions", "procedures", "gear", "spells", "talents", "discoveries"].map(cat => (
          <button key={cat} aria-pressed={category === cat} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>
      <div className="reference-split">
        <nav aria-label="Codex results">
          {filtered.map(e => (
            <button key={e.id} aria-pressed={selected?.id === e.id} onClick={() => setSelectedId(e.id)}>
              {e.title}
            </button>
          ))}
          {!filtered.length && <p>No matching entries.</p>}
        </nav>
        <article aria-live="polite">
          {selected && (
            <>
              <h3>{selected.title}</h3>
              {selected.dc && <strong>DC {selected.dc}</strong>}
              <p>{selected.summary}</p>
              <p className="reference-text">{selected.details}</p>
              {selected.table && (
                <table>
                  <thead>
                    <tr><th>Roll</th><th>Outcome</th></tr>
                  </thead>
                  <tbody>
                    {selected.table.map(row => (
                      <tr key={row.roll}><td>{row.roll}</td><td>{row.outcome}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </article>
      </div>
    </Modal>
  );
}

