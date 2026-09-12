import { useMemo, useState } from "react";
import { CODEX_ENTRIES, type CodexEntry } from "../shared/codex-data";
import { CLASSES, ITEMS, SPELLS } from "../shared/content";
import type { CampaignState } from "../shared/types";
import { Modal } from "./ui/Modal";

export function CodexModal({ isOpen, onClose, state }: { isOpen: boolean; onClose: () => void; state: CampaignState }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const entries = useMemo<CodexEntry[]>(() => [
    ...CODEX_ENTRIES.filter(e => e.category !== "gear" && e.category !== "spells"),
    ...ITEMS.map(item => ({ id: `item-${item.id}`, category: "gear" as const, title: item.name, tags: [item.kind, ...(item.properties ?? [])], summary: `${item.slots} slots · ${item.costGp} GP${item.damage ? ` · ${item.damage} damage` : ""}${item.baseAc ? ` · Base AC ${item.baseAc}` : ""}`, details: `${item.description ?? ""}\n${item.properties?.join(", ") ?? ""}${item.acBonus ? `\nAC bonus: +${item.acBonus}` : ""}${item.maxDexMod !== undefined ? `\nMaximum DEX modifier: ${item.maxDexMod}` : ""}` })),
    ...SPELLS.map(spell => ({ id: `spell-${spell.id}`, category: "spells" as const, title: spell.name, tags: [spell.sphere], dc: 10 + spell.tier, summary: `Tier ${spell.tier} ${spell.sphere} · ${spell.range} · ${spell.duration}`, details: spell.description })),
    ...CLASSES.flatMap(c => [...(c.level1Features ?? []).map(f => ({ id: `${c.id}-${f.name}`, category: "talents" as const, title: `${c.name}: ${f.name}`, summary: f.description, details: f.description, tags: [c.name] })), ...(c.talentTable ?? []).map(t => ({ id: `${c.id}-talent-${t.roll}`, category: "talents" as const, title: `${c.name} talent ${t.roll}`, summary: t.effect, details: t.effect, tags: [c.name] }))]),
    ...state.encounters.flatMap(e => e.monsters.filter(m => m.loreTier > 0).map(m => ({ id: `known-${m.id}`, category: "discoveries" as const, title: m.name, summary: `Discovered lore ${m.loreTier}`, details: [...(m.lore ?? []), ...(m.traits ?? [])].join("\n"), tags: ["bestiary"] }))),
    ...(state.campaign.adventurePath?.activeSituation?.knownClues ?? []).map((clue, i) => ({ id: `clue-${i}`, category: "discoveries" as const, title: `Discovered clue ${i + 1}`, summary: clue, details: clue, tags: ["lore"] })),
  ], [state.encounters, state.campaign.adventurePath]);
  const filtered = useMemo(() => entries.filter(e => (category === "all" || e.category === category) && `${e.title} ${e.summary} ${e.details} ${e.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())), [entries, query, category]);
  const selected = filtered.find(e => e.id === selectedId) ?? filtered[0];
  if (!isOpen) return null;
  return <Modal title="Table Codex" onClose={onClose}>
    <input autoFocus aria-label="Search Codex" placeholder="Search conditions, spells, gear, talents, procedures…" value={query} onChange={e => setQuery(e.target.value)}/>
    <div className="companion-actions">{["all", "conditions", "procedures", "gear", "spells", "talents", "discoveries"].map(cat => <button key={cat} aria-pressed={category === cat} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
    <div className="reference-split"><nav aria-label="Codex results">{filtered.map(e => <button key={e.id} aria-pressed={selected?.id === e.id} onClick={() => setSelectedId(e.id)}>{e.title}</button>)}{!filtered.length && <p>No matching entries.</p>}</nav><article aria-live="polite">{selected && <><h3>{selected.title}</h3>{selected.dc && <strong>DC {selected.dc}</strong>}<p>{selected.summary}</p><p className="reference-text">{selected.details}</p>{selected.table && <table><thead><tr><th>Roll</th><th>Outcome</th></tr></thead><tbody>{selected.table.map(row => <tr key={row.roll}><td>{row.roll}</td><td>{row.outcome}</td></tr>)}</tbody></table>}</>}</article></div>
  </Modal>;
}
