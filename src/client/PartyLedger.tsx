import { useState, type FormEvent } from "react";
import { randomCharacterName } from "../shared/character-names";
import { Title, Field } from "./ui/Common";
import type { Act } from "./ui/types";
import { ABILITY_KEYS, ANCESTRIES, CLASSES, MAX_DEPARTING_PARTY, MIN_DEPARTING_PARTY, SPELLS } from "../shared/content";

import { abilityMod as mod, weaponReference } from "../shared/table-companion";
import { ArrowUpCircle, CheckCircle2, Dices, Heart, Plus, RefreshCw, ScrollText, Shield, Sparkles } from "lucide-react";
import type { CampaignState, Character, ZoneSummary } from "../shared/types";

const labels = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" } as const;
export function PartyView({
  state,
  act,
  onRollAbility,
  onRollSave,
  onQuickAttack,
  onQuickDamage,
  onQuickCast,
  onTurnUndead,
  onBackstab,
  onThievery,
}: {
  state: CampaignState;
  act: Act;
  onRollAbility?: (charId: number, ability: string) => void;
  onRollSave?: (charId: number, ability: string) => void;
  onQuickAttack?: (charId: number) => void;
  onQuickDamage?: (charId: number, damageDice?: string) => void;
  onQuickCast?: (charId: number, spellId: string) => void;
  onTurnUndead?: (charId: number) => void;
  onBackstab?: (charId: number) => void;
  onThievery?: (charId: number) => void;
}) {
  const myToken = state.me.token;
  const ownedCharacters = state.characters.filter(
    (c) => (myToken && c.ownerToken === myToken) || c.id === state.me.characterId,
  );
  // Iron Man heroes are unlimited; the single Unearthed Arcana hero is once per campaign.
  const uaUsed = ownedCharacters.some((c) => c.generationMethod === "unearthed_arcana");
  const [creating, setCreating] = useState(state.me.role === "player" && ownedCharacters.length === 0);

  return (
    <div className="party-page">
      <Title
        eyebrow="Campaign roster"
        title="The adventuring company"
        aside={`${state.characters.length} sworn member${state.characters.length === 1 ? "" : "s"}`}
      />

      {/* Fast Character Switcher Bar for Players with Multiple Characters */}
      {ownedCharacters.length > 1 && (
        <div className="character-switcher-bar">
          {ownedCharacters.map((c) => {
            const isActive = c.rosterStatus === "active";
            return (
              <button
                key={c.id}
                type="button"
                className={`character-switcher-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (!isActive) {
                    act(
                      "roster:select_active",
                      { characterId: c.id },
                      `Swapped active adventurer to ${c.name}`,
                    );
                  }
                }}
                title={isActive ? "Active adventurer" : "Tap to switch active adventurer"}
              >
                <span>{isActive ? "⭐ Active:" : "💤 Reserve:"}</span>
                <b>{c.name}</b>
                <small>({c.className} L{c.level} · {c.hp}/{c.maxHp} HP)</small>
              </button>
            );
          })}
        </div>
      )}

      <PartyMuster act={act} state={state} />

      {creating && (
        <CharacterCreator
          act={act}
          done={() => setCreating(false)}
          activeZoneId={state.campaign.activeZoneId}
          availableZones={state.availableZones}
          isReserve={ownedCharacters.length >= 1}
          uaUsed={uaUsed}
        />
      )}
      {!creating && (
        <button className="add-card" onClick={() => setCreating(true)}>
          <Plus /> {ownedCharacters.length === 0 ? "Add a character" : "Add another character (Reserve)"}
        </button>
      )}
      <div className="character-grid">
        {state.characters.map((character) => {
          const isOwner = Boolean(
            (myToken && character.ownerToken === myToken) || state.me.characterId === character.id,
          );
          const canEdit = state.me.role === "host" || isOwner;
          const canSwap =
            isOwner &&
            character.rosterStatus === "reserve" &&
            (state.campaign.phase === "sanctuary" ||
              state.activeSession?.kind === "camp");

          return (
            <CharacterCard
              key={character.id}
              character={character}
              canEdit={canEdit}
              act={act}
              own={isOwner}
              canSwap={canSwap}
              onSwap={() =>
                act(
                  "roster:select_active",
                  { characterId: character.id },
                  `Swapped active adventurer to ${character.name}`,
                )
              }
              onRollAbility={(ability) => onRollAbility?.(character.id, ability)}
              onRollSave={(ability) => onRollSave?.(character.id, ability)}
              onQuickAttack={() => onQuickAttack?.(character.id)}
              onQuickDamage={(damageDice) => onQuickDamage?.(character.id, damageDice)}
              onQuickCast={(spellId) => onQuickCast?.(character.id, spellId)}
              onTurnUndead={() => onTurnUndead?.(character.id)}
              onBackstab={() => onBackstab?.(character.id)}
              onThievery={() => onThievery?.(character.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Party adjustment stage: name who marches before setting off. Retainers and rescued
 * companions count towards the cap of MAX_DEPARTING_PARTY like anyone else.
 */
function PartyMuster({ act, state }: { act: Act; state: CampaignState }) {
  const canAdjust =
    state.campaign.phase === "sanctuary" || state.activeSession?.kind === "camp";
  const [picked, setPicked] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);

  const marching =
    picked ??
    state.characters.filter((c) => c.rosterStatus !== "reserve").map((c) => c.id);
  const full = marching.length >= MAX_DEPARTING_PARTY;

  if (!canAdjust || state.characters.length === 0) return null;

  const toggle = (id: number) =>
    setPicked(
      marching.includes(id) ? marching.filter((c) => c !== id) : [...marching, id],
    );

  return (
    <div className="panel party-muster">
      <div className="eyebrow">Before setting off</div>
      <h3>
        Marching party · {marching.length}/{MAX_DEPARTING_PARTY}
      </h3>
      <p style={{ margin: "4px 0 10px", fontSize: "12px", color: "var(--muted)" }}>
        Everyone who leaves the haven counts, retainers included: no fewer than{" "}
        {MIN_DEPARTING_PARTY}, no more than {MAX_DEPARTING_PARTY}. Companions rescued
        underground join beyond the cap — they have to, to get back out.
      </p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {state.characters.map((character) => {
          const going = marching.includes(character.id);
          return (
            <button
              key={character.id}
              type="button"
              className={going ? "primary" : ""}
              disabled={busy || (!going && full)}
              onClick={() => toggle(character.id)}
            >
              {going ? "⭐" : "💤"} {character.name}
              <small>
                {" "}
                ({character.className} L{character.level})
              </small>
            </button>
          );
        })}
      </div>
      <button
        className="primary"
        style={{ marginTop: "10px" }}
        disabled={busy || marching.length < MIN_DEPARTING_PARTY}
        onClick={async () => {
          setBusy(true);
          try {
            await act(
              "party:muster",
              { characterIds: marching },
              `Marching party set (${marching.length}/${MAX_DEPARTING_PARTY})`,
            );
            setPicked(null);
          } finally {
            setBusy(false);
          }
        }}
      >
        {marching.length < MIN_DEPARTING_PARTY
          ? `Pick at least ${MIN_DEPARTING_PARTY} to march`
          : "Confirm marching party"}
      </button>
    </div>
  );
}

function CharacterCreator({
  act,
  done,
  activeZoneId,
  availableZones,
  isReserve,
  uaUsed,
}: {
  act: Act;
  done: () => void;
  activeZoneId?: string;
  availableZones?: ZoneSummary[];
  isReserve?: boolean;
  uaUsed?: boolean;
}) {
  const [method, setMethod] = useState<"unearthed_arcana" | "iron_man">(
    uaUsed ? "iron_man" : "unearthed_arcana",
  );
  const [form, setForm] = useState(() => ({
    name: randomCharacterName(ANCESTRIES[0]),
    ancestry: ANCESTRIES[0] as string,
    className: CLASSES[0].name as string,
    originZoneId: activeZoneId || "the_gloaming",
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    anchors: { homeland: "", landmark: "", nemesis: "" },
  }));
  const [diceResults, setDiceResults] = useState<Record<string, number[]> | undefined>(undefined);
  const [eligibleClasses, setEligibleClasses] = useState<string[]>([]);
  const [hasRolled, setHasRolled] = useState(false);
  const [busy, setBusy] = useState(false);

  const rollUA = async (classChoice: string) => {
    setBusy(true);
    try {
      const result = await act<{
        scores: Record<string, number>;
        dice: Record<string, number[]>;
        statOrder: string[];
      }>("character:roll-ua", { className: classChoice });
      setForm((prev) => ({
        ...prev,
        className: classChoice,
        abilities: result.scores as typeof prev.abilities,
      }));
      setDiceResults(result.dice);
      setHasRolled(true);
    } finally {
      setBusy(false);
    }
  };

  const rollIronMan = async () => {
    setBusy(true);
    try {
      const result = await act<{
        scores: Record<string, number>;
        dice: Record<string, number[]>;
        eligibleClasses: string[];
      }>("character:roll-ironman", {});
      setForm((prev) => {
        const nextClass =
          result.eligibleClasses.length > 0
            ? result.eligibleClasses.includes(prev.className)
              ? prev.className
              : result.eligibleClasses[0]
            : prev.className;
        return {
          ...prev,
          abilities: result.scores as typeof prev.abilities,
          className: nextClass,
        };
      });
      setDiceResults(result.dice);
      setEligibleClasses(result.eligibleClasses);
      setHasRolled(true);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await act(
        "character:create",
        {
          name: form.name,
          ancestry: form.ancestry,
          className: form.className,
          abilities: form.abilities,
          anchors: form.anchors,
          originZoneId: form.originZoneId,
          generationMethod: method,
          generationDice: diceResults,
        },
        `${form.name} joined the company${isReserve ? " (Reserve)" : ""}`,
      );
      done();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel creator" onSubmit={submit}>
      <div className="creator-heading">
        <div>
          <div className="eyebrow">
            Authoritative Character Flow · {isReserve ? "Reserve Roster" : "Active Roster"}
          </div>
          <h2>Call a new adventurer forward.</h2>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="small-btn" onClick={done}>
            Cancel
          </button>
        </div>
      </div>

      {/* Generation Method Selector */}
      <div style={{ marginBottom: "1rem", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "6px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Select Generation Method
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={uaUsed}
            title={
              uaUsed
                ? "You have already generated your one Unearthed Arcana character for this campaign"
                : undefined
            }
            className={method === "unearthed_arcana" ? "primary" : ""}
            onClick={() => {
              setMethod("unearthed_arcana");
              setHasRolled(false);
              setDiceResults(undefined);
            }}
          >
            ✨ Unearthed Arcana (Method I)
          </button>
          <button
            type="button"
            className={method === "iron_man" ? "primary" : ""}
            onClick={() => {
              setMethod("iron_man");
              setHasRolled(false);
              setDiceResults(undefined);
              setEligibleClasses([]);
            }}
          >
            ⚔️ Iron Man (3d6 In Order)
          </button>
        </div>
        {uaUsed && (
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Your one Unearthed Arcana hero is already sworn. Further characters roll Iron
            Man — or you rescue them from a dungeon.
          </p>
        )}
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--muted)" }}>
          {method === "unearthed_arcana"
            ? "Choose class first. Dice pools of 8d6/7d6/6d6/5d6/4d6/3d6 keep best 3, in your class's ability order; after two scores of 16+ the remaining pools drop to 4d6. Needs a total of 72+ and at most one score under 6 — failing sets are rerolled silently."
            : "Strict old-school challenge: 3d6 rolled in exact order (STR, DEX, CON, INT, WIS, CHA). Needs one score of 16+, a second of 12+, a total of 64+, and at most one score under 6 — failing sets are rerolled silently. Class choices are restricted to classes where you meet the Prime Requisite (≥ 9)."}
        </p>
      </div>

      <div className="creator-grid">
        <div>
          <Field
            label="Character name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <button
            type="button"
            style={{ marginTop: 8 }}
            title="50% ancestry name list, 50% combined name parts. Unlisted ancestries use the full name table."
            onClick={() => setForm((current) => ({
              ...current,
              name: randomCharacterName(current.ancestry),
            }))}
          >
            <Dices size={16} aria-hidden="true" /> Random name
          </button>
        </div>
        <label>
          Ancestry
          <select
            value={form.ancestry}
            onChange={(e) => setForm({ ...form, ancestry: e.target.value })}
          >
            {ANCESTRIES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Class
          {method === "iron_man" ? (
            <select
              value={form.className}
              disabled={!hasRolled || eligibleClasses.length === 0}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
            >
              {!hasRolled ? (
                <option>Roll 3d6 in order first...</option>
              ) : (
                eligibleClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          ) : (
            <select
              value={form.className}
              onChange={(e) => {
                const next = e.target.value;
                setForm({ ...form, className: next });
                if (hasRolled) {
                  rollUA(next);
                }
              }}
            >
              {CLASSES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          Origin Zone
          <select
            value={form.originZoneId}
            onChange={(e) => setForm({ ...form, originZoneId: e.target.value })}
          >
            {availableZones && availableZones.length > 0 ? (
              availableZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.id})
                </option>
              ))
            ) : (
              <>
                <option value="the_gloaming">The Gloaming (Sanctuary Haven)</option>
                <option value="sunken_citadel">The Sunken Citadel</option>
                <option value="deep_ways">The Deep Ways</option>
              </>
            )}
          </select>
        </label>
      </div>

      <div style={{ margin: "1rem 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          {method === "unearthed_arcana" ? (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => rollUA(form.className)}
            >
              <Dices size={16} /> Roll Unearthed Arcana for {form.className}
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={rollIronMan}
            >
              <Dices size={16} /> Roll 3d6 Strictly In Order
            </button>
          )}
        </div>
        {hasRolled && diceResults && (
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            Server-verified rolls accepted.
            {method === "iron_man" && eligibleClasses.length > 0 && (
              <span style={{ marginLeft: "8px", color: "var(--ink)" }}>
                Eligible: <b>{eligibleClasses.join(", ")}</b>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="ability-editor">
        {ABILITY_KEYS.map((key) => (
          <label key={key}>
            {labels[key]}
            <input
              type="number"
              min="3"
              max="20"
              readOnly={hasRolled}
              value={form.abilities[key]}
              onChange={(e) =>
                setForm({
                  ...form,
                  abilities: {
                    ...form.abilities,
                    [key]: Number(e.target.value),
                  },
                })
              }
            />
            <span>
              {mod(form.abilities[key]) >= 0 ? "+" : ""}
              {mod(form.abilities[key])}
            </span>
            {diceResults && diceResults[key] && (
              <small style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>
                [{diceResults[key].join(",")}]
              </small>
            )}
          </label>
        ))}
      </div>

      <div className="anchor-grid">
        <Field
          label="Homeland truth"
          value={form.anchors.homeland}
          onChange={(homeland) =>
            setForm({ ...form, anchors: { ...form.anchors, homeland } })
          }
          placeholder="A custom, taboo, or truth…"
        />
        <Field
          label="Local landmark"
          value={form.anchors.landmark}
          onChange={(landmark) =>
            setForm({ ...form, anchors: { ...form.anchors, landmark } })
          }
          placeholder="A ruin, barrow, or sacred place…"
        />
        <Field
          label="Lingering debt / nemesis"
          value={form.anchors.nemesis}
          onChange={(nemesis) =>
            setForm({ ...form, anchors: { ...form.anchors, nemesis } })
          }
          placeholder="Who or what follows you?"
        />
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          className="primary"
          disabled={busy || !form.name || (method === "iron_man" && !hasRolled)}
        >
          {busy
            ? "Recording…"
            : isReserve
              ? `Enlist ${form.name || "Adventurer"} (Reserve)`
              : `Enter Campaign as ${form.name || "Adventurer"} (Active)`}
        </button>
      </div>
    </form>
  );
}

function CharacterCard({
  character,
  canEdit,
  act,
  own,
  onRollAbility,
  onRollSave,
  onQuickAttack,
  onQuickDamage,
  onQuickCast,
  onTurnUndead,
  onBackstab,
  onThievery,
  canSwap,
  onSwap,
}: {
  character: Character;
  canEdit: boolean;
  act: Act;
  own: boolean;
  onRollAbility?: (ability: string) => void;
  onRollSave?: (ability: string) => void;
  onQuickAttack?: () => void;
  onQuickDamage?: (damageDice?: string) => void;
  onQuickCast?: (spellId: string) => void;
  onTurnUndead?: () => void;
  onBackstab?: () => void;
  onThievery?: () => void;
  canSwap?: boolean;
  onSwap?: () => void;
}) {
  const nextLevelXp = character.level * 10;
  const currentXp = character.xp ?? 0;
  const canLevelUp = currentXp >= nextLevelXp && character.level < 36;
  const xpPercent = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

  const carriedSlots = (character.inventory ?? []).reduce(
    (sum, it) => sum + (it.slots ?? 1) * (it.quantity ?? 1),
    0,
  );
  const isEncumbered = carriedSlots > character.gearSlots;

  return (
    <article className={`panel character-card${own ? " own" : ""}`}>
      <div className="portrait-mark">{character.name[0]}</div>
      <div className="character-head">
        <div className="eyebrow" style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <span>Level {character.level} · {character.ancestry}</span>
          <span
            className="badge-tag"
            style={{
              background: character.rosterStatus === "reserve" ? "var(--muted)" : "var(--ember)",
              color: "#000",
              fontWeight: 700,
              fontSize: "10px",
            }}
          >
            {character.rosterStatus === "reserve" ? "RESERVE" : "ACTIVE"}
          </span>
          {character.generationMethod && (
            <span className="badge-tag" style={{ fontSize: "10px" }}>
              {character.generationMethod === "unearthed_arcana" ? "UA Method I" : character.generationMethod === "iron_man" ? "Iron Man" : "Standard"}
            </span>
          )}
        </div>
        <h2>{character.name}</h2>
        <p>
          {character.className}
          {own ? " · your character" : ""}
          {character.originZoneId ? ` · ${character.originZoneId.replace(/_/g, " ")}` : ""}
        </p>
        {character.conditions && character.conditions.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
            {character.conditions.map((cond) => (
              <span
                key={cond}
                className="badge-tag"
                style={{
                  fontSize: "10px",
                  background: cond === "dead" ? "var(--danger)" : cond === "dying" ? "#d9534f" : "#8a6d3b",
                  color: "#fff",
                }}
              >
                {cond}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="vital-grid">
        <div>
          <Shield />
          <span>AC</span>
          <b>{character.ac}</b>
        </div>
        <div>
          <Heart />
          <span>HP</span>
          <b>
            {character.hp}/{character.maxHp}
          </b>
        </div>
        <div>
          <ScrollText />
          <span>GP</span>
          <b>{character.gold}</b>
        </div>
      </div>
      {canSwap && onSwap && (
        <div style={{ margin: "8px 0" }}>
          <button
            type="button"
            className="primary small-btn"
            style={{ width: "100%", padding: "6px 12px", background: "var(--ember)" }}
            onClick={onSwap}
          >
            🔄 Swap to Active Roster
          </button>
        </div>
      )}
      {canEdit && (
        <div className="hp-controls">
          <button
            onClick={() =>
              act("character:hp", {
                characterId: character.id,
                hp: character.hp - 1,
              })
            }
          >
            −
          </button>
          <span>Adjust HP</span>
          <button
            onClick={() =>
              act("character:hp", {
                characterId: character.id,
                hp: character.hp + 1,
              })
            }
          >
            +
          </button>
        </div>
      )}

      {/* XP & Level Advancement */}
      <div className="xp-card-section">
        <div className="xp-info-row">
          <span>
            XP: <b>{currentXp}</b> / {nextLevelXp}
          </span>
          {character.level >= 36 ? (
            <span className="badge-tag max-lvl">MAX LEVEL 36</span>
          ) : canLevelUp ? (
            <span className="badge-tag ready-lvl">ADVANCE READY</span>
          ) : null}
        </div>
        <div className="xp-meter">
          <div className="xp-meter-fill" style={{ width: `${xpPercent}%` }} />
        </div>
        {canEdit && (
          <div className="xp-actions-row">
            {canLevelUp && (
              <button
                className="primary level-up-btn"
                onClick={() =>
                  act(
                    "character:level_up",
                    { characterId: character.id },
                    `${character.name} advanced to Level ${character.level + 1}!`,
                  )
                }
              >
                <ArrowUpCircle size={15} /> Level Up to {character.level + 1}
              </button>
            )}
            <div className="grant-xp-group">
              <span>+XP:</span>
              <button
                className="small-btn"
                onClick={() =>
                  act(
                    "character:xp",
                    { characterId: character.id, amount: 5 },
                    "+5 XP awarded",
                  )
                }
              >
                +5
              </button>
              <button
                className="small-btn"
                onClick={() =>
                  act(
                    "character:xp",
                    { characterId: character.id, amount: 10 },
                    "+10 XP awarded",
                  )
                }
              >
                +10
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ability-row">
        {ABILITY_KEYS.map((key) => (
          <div
            key={key}
            className="ability-clickable"
            title={`${labels[key]} check / save modifier for physical dice`}
          >
            <span>{labels[key]}</span>
            <b>{character.abilities[key]}</b>
            <small>
              {mod(character.abilities[key]) >= 0 ? "+" : ""}
              {mod(character.abilities[key])}
            </small>
          </div>
        ))}
      </div>

      {/* Saving Throws Reference Row */}
      <div className="saving-throws-row" style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "8px 0 12px" }}>
        <span style={{ fontSize: "11px", color: "var(--muted)", alignSelf: "center", marginRight: "4px", fontWeight: 700 }}>SAVES:</span>
        {ABILITY_KEYS.map((key) => {
          const m = mod(character.abilities[key]);
          return (
            <span
              key={key}
              className="stat-target-pill"
              style={{
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              {labels[key]} <b>{m >= 0 ? `+${m}` : m}</b>
            </span>
          );
        })}
      </div>

      {/* Target Numbers & Modifiers Reference for Physical Dice */}
      {(() => {
        const equippedWeapons = (character.inventory ?? []).filter(
          (it) => it.equipped && (it.kind === "weapon" || it.damage),
        );
        const readySpells = (character.spells ?? []).filter(
          (s) => s.available && !s.penanceRequired,
        );
        const isThief = character.className.toLowerCase().includes("thief");
        const isPriest = character.className.toLowerCase().includes("priest");
        const isFighter = character.className.toLowerCase().includes("fighter");

        if (equippedWeapons.length === 0 && readySpells.length === 0 && !isThief && !isPriest && !isFighter) return null;

        return (
          <div className="quick-actions-panel" style={{ margin: "6px 0 14px", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "6px", border: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ fontSize: "10px", marginBottom: "6px", color: "var(--muted)", letterSpacing: "0.05em", fontWeight: 700 }}>
              PHYSICAL DICE TARGET REFERENCES
            </div>
            <div className="action-grid">
              {equippedWeapons.map((w) => {
                const strMod = mod(character.abilities.str);
                const dexMod = mod(character.abilities.dex);
                const isRanged = w.itemId.includes("bow") || w.itemId.includes("sling");
                const isFinesse = isRanged || w.itemId.includes("dagger");
                const reference = weaponReference(character, w);
                const atkMod = reference.attackBonus;
                return (
                  <div key={w.instanceId} className="action-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>⚔️ {w.name}</b>
                      <small style={{ color: "var(--muted)" }}>{w.damage || "1d6"}</small>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                      <span style={{ padding: "2px 6px", background: "rgba(217, 117, 56, 0.15)", border: "1px solid var(--ember)", borderRadius: "4px", color: "var(--ember)", fontWeight: 700 }}>
                        Atk: {atkMod >= 0 ? `+${atkMod}` : atkMod}
                      </span>
                      <span style={{ padding: "2px 6px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--line)", borderRadius: "4px", color: "var(--ink)" }}>
                        Dmg: {reference.damageDie}{reference.damageBonus ? `${reference.damageBonus > 0 ? "+" : ""}${reference.damageBonus}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
              {readySpells.map((s, idx) => {
                const spellDef = SPELLS.find((sp) => sp.id === s.spellId);
                const spellName = spellDef?.name ?? s.spellId;
                const intMod = mod(character.abilities.int);
                const wisMod = mod(character.abilities.wis);
                const isPriestClass = character.className.toLowerCase().includes("priest");
                const checkMod = isPriestClass ? wisMod : intMod;
                return (
                  <div key={idx} className="action-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>✨ {spellName}</b>
                      <small style={{ color: "var(--muted)" }}>T{s.tier}</small>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                      <span style={{ padding: "2px 6px", background: "rgba(37, 99, 235, 0.15)", border: "1px solid #2563EB", borderRadius: "4px", color: "#93C5FD", fontWeight: 700 }}>
                        DC {10 + s.tier} · Check: {checkMod >= 0 ? `+${checkMod}` : checkMod}
                      </span>
                    </div>
                  </div>
                );
              })}
              {isThief && (
                <>
                  <div className="action-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>🗡️ Backstab</b>
                      <small style={{ color: "var(--muted)" }}>DEX+2 (Adv)</small>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                      <span style={{ padding: "2px 6px", background: "rgba(217, 117, 56, 0.15)", border: "1px solid var(--ember)", borderRadius: "4px", color: "var(--ember)", fontWeight: 700 }}>
                        Atk: +{mod(character.abilities.dex)} (ADV) · +1d6 Dmg
                      </span>
                    </div>
                  </div>
                  <div className="action-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>🗝️ Thievery</b>
                      <small style={{ color: "var(--muted)" }}>DEX (Adv)</small>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                      <span style={{ padding: "2px 6px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--line)", borderRadius: "4px", color: "var(--ink)" }}>
                        Check: +{mod(character.abilities.dex)} (ADV)
                      </span>
                    </div>
                  </div>
                </>
              )}
              {isPriest && (
                <div className="action-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>✝️ Turn Undead</b>
                    <small style={{ color: "var(--muted)" }}>WIS Check</small>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                    <span style={{ padding: "2px 6px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--line)", borderRadius: "4px", color: "var(--ink)", fontWeight: 700 }}>
                      Check: {mod(character.abilities.wis) >= 0 ? `+${mod(character.abilities.wis)}` : mod(character.abilities.wis)} vs Monster LV
                    </span>
                  </div>
                </div>
              )}
              {isFighter && (
                <div className="action-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>🛡️ Fighter Mastery</b>
                    <small style={{ color: "var(--muted)" }}>Passive</small>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", padding: "2px 0" }}>
                    Weapon Mastery (+1 atk/dmg) & Hauler (+CON slots)
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Equipment & Gear Drawer */}
      <details className="card-drawer inventory-drawer">
        <summary>
          <Shield size={14} /> Equipment & Gear ({character.inventory?.length ?? 0})
        </summary>
        <div className="drawer-body">
          {character.inventory && character.inventory.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {character.inventory.map((item) => (
                <div
                  key={item.instanceId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(0, 0, 0, 0.15)",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <b>{item.name}{item.itemId === "torches" ? ` (${((item.quantity ?? 1) - 1) * 3 + (item.remainingTorches ?? 3)} torches left)` : ""}</b>
                    {item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ""}
                    <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                      [{item.slots} slot{item.slots > 1 ? "s" : ""}] {item.damage ? `· Dmg: ${item.damage}` : ""} {item.baseAc ? `· AC ${item.baseAc}` : ""}
                    </span>
                    {item.equipped && (
                      <span className="badge-tag" style={{ marginLeft: "6px", fontSize: "10px" }}>EQUIPPED</span>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      {item.equipped ? (
                        <button
                          className="small-btn"
                          onClick={() =>
                            act(
                              "inventory:unequip",
                              { characterId: character.id, instanceId: item.instanceId },
                              `Unequipped ${item.name}`,
                            )
                          }
                        >
                          Unequip
                        </button>
                      ) : (
                        ["weapon", "armor", "shield"].includes(item.kind) && (
                          <button
                            className="small-btn primary"
                            onClick={() =>
                              act(
                                "inventory:equip",
                                { characterId: character.id, instanceId: item.instanceId },
                                `Equipped ${item.name}`,
                              )
                            }
                          >
                            Equip
                          </button>
                        )
                      )}
                      <button
                        className="small-btn"
                        onClick={() =>
                          act(
                            "inventory:drop",
                            { characterId: character.id, instanceId: item.instanceId },
                            `Dropped ${item.name}`,
                          )
                        }
                      >
                        Drop
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="drawer-empty">No gear carried.</p>
          )}
        </div>
      </details>

      {/* Spells Drawer */}
      {character.spells && character.spells.length > 0 && (
        <details className="card-drawer spells-drawer">
          <summary>
            <Sparkles size={14} /> Prepared Spells ({character.spells.length})
          </summary>
          <div className="drawer-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {character.spells.map((s, idx) => {
                const spellDef = SPELLS.find((sp) => sp.id === s.spellId);
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(0, 0, 0, 0.15)",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <b>{spellDef?.name ?? s.spellId}</b>
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                        Tier {s.tier} · {spellDef?.sphere ?? "arcane"}
                      </span>
                      {s.penanceRequired ? (
                        <span className="danger-tag" style={{ marginLeft: "6px" }}>PENANCE REQUIRED</span>
                      ) : s.available ? (
                        <span className="badge-tag" style={{ marginLeft: "6px" }}>READY</span>
                      ) : (
                        <span className="badge-tag" style={{ marginLeft: "6px", background: "var(--muted)" }}>EXPENDED</span>
                      )}
                    </div>
                    {canEdit && s.available && !s.penanceRequired && (
                      <button
                        type="button"
                        className="small-btn primary"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        onClick={() => onQuickCast?.(s.spellId)}
                      >
                        Cast
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {canEdit && (
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button
                  className="small-btn primary"
                  onClick={() =>
                    act(
                      "spells:restore",
                      { characterId: character.id },
                      "Prepared spells refreshed through rest",
                    )
                  }
                >
                  <RefreshCw size={12} /> Refresh Spells
                </button>
                {character.spells.some((s) => s.penanceRequired) && (
                  <button
                    className="small-btn danger-btn"
                    onClick={() =>
                      act(
                        "priest:penance",
                        { characterId: character.id },
                        "Holy penance fulfilled",
                      )
                    }
                  >
                    Perform Divine Penance
                  </button>
                )}
              </div>
            )}
          </div>
        </details>
      )}

      {/* Class Talents Drawer */}
      <details className="card-drawer talents-drawer">
        <summary>
          <Sparkles size={14} /> Class Talents & Deeds (
          {character.talents?.length ?? 0})
        </summary>
        <div className="drawer-body">
          {character.talents && character.talents.length > 0 ? (
            <ul className="talents-list">
              {character.talents.map((t, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={14} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="drawer-empty">No talents recorded yet.</p>
          )}
          {canEdit && (
            <button
              className="small-btn roll-talent-action"
              onClick={() =>
                act(
                  "character:talent_roll",
                  { characterId: character.id },
                  "Class talent rolled",
                )
              }
            >
              <Dices size={14} /> Roll Class Talent (2d6)
            </button>
          )}
        </div>
      </details>

      <div className="gear-slot-chip" style={{ color: isEncumbered ? "var(--danger)" : undefined }}>
        <Shield size={14} />
        <span>
          Gear Capacity: <b>{carriedSlots} / {character.gearSlots} slots</b> (10 + STR mod)
          {isEncumbered && " ⚠️ ENCUMBERED"}
        </span>
      </div>

      <details className="card-drawer">
        <summary>Cultural anchors & Origins</summary>
        <div className="drawer-body">
          {character.originZoneId && (
            <p>
              <b>Origin Zone:</b> {character.originZoneId.replace(/_/g, " ")}
            </p>
          )}
          <p>
            <b>Homeland:</b> {character.anchors.homeland || "Unwritten"}
          </p>
          <p>
            <b>Landmark:</b> {character.anchors.landmark || "Unwritten"}
          </p>
          <p>
            <b>Nemesis:</b> {character.anchors.nemesis || "Unwritten"}
          </p>
          {character.generationDice && Object.keys(character.generationDice).length > 0 && (
            <div style={{ marginTop: "6px" }}>
              <b>Generation Dice:</b>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                {Object.entries(character.generationDice).map(([stat, dice]) => (
                  <span key={stat} style={{ marginRight: "8px", display: "inline-block" }}>
                    {stat.toUpperCase()}: [{dice.join(", ")}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </article>
  );
}

