import { useEffect, useMemo, useState } from "react";
import type { EncounterMonster } from "../shared/types";
import { Modal } from "./ui/Modal";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

type LoreTiers = { common: string; field: string; obscure: string; arcane: string };

async function getJson(path: string) {
  const response = await fetch(path);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

async function patchJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

function linesToList(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

/**
 * Host-only GM tool for editing the shared bestiary: ability scores, traits,
 * vulnerabilities, and lore. Edits are persisted server-side (monster_overrides
 * table) so they survive restarts and re-ingestion of the baseline stat files.
 */
export function BestiaryManagerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [monsters, setMonsters] = useState<EncounterMonster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [abilities, setAbilities] = useState<Record<string, number>>({});
  const [traitsText, setTraitsText] = useState("");
  const [vulnText, setVulnText] = useState("");
  const [lore, setLore] = useState<LoreTiers>({ common: "", field: "", obscure: "", arcane: "" });

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    getJson("/api/monsters")
      .then((data) => setMonsters(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bestiary"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monsters;
    return monsters.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.family ?? "").toLowerCase().includes(q) ||
        (m.source ?? "").toLowerCase().includes(q),
    );
  }, [monsters, query]);

  const selected = filtered.find((m) => m.monsterKey === selectedKey) ?? filtered[0];

  useEffect(() => {
    if (!selected) return;
    setAbilities(selected.abilities ?? {});
    setTraitsText((selected.traits ?? []).join("\n"));
    setVulnText((selected.vulnerabilities ?? []).join("\n"));
    const loreArr = selected.lore ?? [];
    setLore({
      common: loreArr[0] ?? "",
      field: loreArr[1] ?? "",
      obscure: loreArr[2] ?? "",
      arcane: loreArr[3] ?? "",
    });
    setSavedFlash(false);
  }, [selected?.monsterKey]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await patchJson(`/api/monsters/${selected.monsterKey}`, {
        abilities,
        traits: linesToList(traitsText),
        vulnerabilities: linesToList(vulnText),
        lore,
      });
      setMonsters((prev) => prev.map((m) => (m.monsterKey === selected.monsterKey ? updated : m)));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save monster");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Bestiary Manager" onClose={onClose}>
      <input
        autoFocus
        aria-label="Search monsters"
        placeholder="Search monsters by name, family, or source…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p>Loading bestiary…</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="reference-split">
        <nav aria-label="Monster list" className="bestiary-list">
          <table className="bestiary-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Lv</th>
                <th>AC</th>
                <th>HP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.monsterKey}
                  aria-selected={selected?.monsterKey === m.monsterKey}
                  className={selected?.monsterKey === m.monsterKey ? "active" : ""}
                  onClick={() => setSelectedKey(m.monsterKey)}
                >
                  <td>{m.name}</td>
                  <td>{m.level}</td>
                  <td>{m.ac}</td>
                  <td>{m.maxHp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && !loading && <p>No matching monsters.</p>}
        </nav>
        <article aria-live="polite">
          {selected ? (
            <>
              <h3>{selected.name}</h3>
              <p className="reference-text">
                Level {selected.level} {selected.family} · {(selected.source ?? "").replace(/_/g, " ")} · AC{" "}
                {selected.ac} · HP {selected.maxHp} · Move {selected.move} · Alignment {selected.alignment}
              </p>

              <h4>Ability scores</h4>
              <div className="companion-actions">
                {ABILITY_KEYS.map((key) => (
                  <label key={key} className="bestiary-ability-field">
                    {key.toUpperCase()}
                    <input
                      type="number"
                      value={abilities[key] ?? 0}
                      onChange={(e) => setAbilities((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    />
                  </label>
                ))}
              </div>

              <h4>Traits &amp; special abilities</h4>
              <textarea
                rows={5}
                value={traitsText}
                onChange={(e) => setTraitsText(e.target.value)}
                placeholder="One trait per line, e.g. Fire Breath. DC 15 DEX or 4d6 damage."
              />

              <h4>Vulnerabilities</h4>
              <textarea
                rows={3}
                value={vulnText}
                onChange={(e) => setVulnText(e.target.value)}
                placeholder="One vulnerability per line, e.g. Takes double damage from fire."
              />

              <h4>Lore tiers</h4>
              <label>
                Common
                <textarea rows={2} value={lore.common} onChange={(e) => setLore((prev) => ({ ...prev, common: e.target.value }))} />
              </label>
              <label>
                Field
                <textarea rows={2} value={lore.field} onChange={(e) => setLore((prev) => ({ ...prev, field: e.target.value }))} />
              </label>
              <label>
                Obscure
                <textarea rows={2} value={lore.obscure} onChange={(e) => setLore((prev) => ({ ...prev, obscure: e.target.value }))} />
              </label>
              <label>
                Arcane
                <textarea rows={2} value={lore.arcane} onChange={(e) => setLore((prev) => ({ ...prev, arcane: e.target.value }))} />
              </label>

              <div className="companion-actions">
                <button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {savedFlash && <span className="bestiary-saved-flash">Saved.</span>}
              </div>
            </>
          ) : (
            <p>Select a monster to view and edit its entry.</p>
          )}
        </article>
      </div>
    </Modal>
  );
}
