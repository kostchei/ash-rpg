import { RealmSelect } from "./RealmSelect";
import { LanDiscoveryPanel } from "./LanDiscoveryPanel";
import { useEffect, useMemo, useState } from "react";
import { Title } from "./ui/Common";
import type { Act } from "./ui/types";


import { abilityMod as mod } from "../shared/table-companion";
import { Apple, Compass, DoorOpen, Footprints, Map, RefreshCw, Search, Sparkles, Tent } from "lucide-react";
import type { CampaignState } from "../shared/types";

import { FrontierMap } from "./FrontierMap";
import { npcHexId } from "../shared/directory";
function CampAllowanceModal({
  state,
  act,
  onClose,
}: {
  state: CampaignState;
  act: Act;
  onClose: () => void;
}) {
  // Sort crawlers by Wisdom descending to assign the 2 highest wisdom crawlers to watch
  const sortedByWis = useMemo(() => {
    return [...state.characters].sort(
      (a, b) => (b.abilities?.wis ?? 10) - (a.abilities?.wis ?? 10),
    );
  }, [state.characters]);

  const watchSentries = useMemo(() => {
    return sortedByWis.slice(0, 2);
  }, [sortedByWis]);

  const watchSentryIds = useMemo(() => {
    return new Set(watchSentries.map((c) => c.id));
  }, [watchSentries]);

  const otherCrawlers = useMemo(() => {
    return state.characters.filter((c) => !watchSentryIds.has(c.id));
  }, [state.characters, watchSentryIds]);

  const [taskAssignments, setTaskAssignments] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    // Auto-assign 2 highest WIS to watch
    watchSentries.forEach((c) => {
      initial[c.id] = "watch";
    });
    // Default tasks for other crawlers
    otherCrawlers.forEach((c, idx) => {
      initial[c.id] = idx === 0 ? "cook" : idx === 1 ? "firewood" : idx === 2 ? "hunt" : "bed_down";
    });
    return initial;
  });

  const [isResolving, setIsResolving] = useState(false);

  const handleMakeCamp = () => {
    setIsResolving(true);
    const tasks = state.characters.map((c) => ({
      characterId: c.id,
      task: (taskAssignments[c.id] || (watchSentryIds.has(c.id) ? "watch" : "bed_down")) as any,
    }));
    act(
      "expedition:camp_night",
      { tasks },
      "Evening camp resolved with assigned tasks",
    );
    onClose();
  };

  const handleForceMarch = () => {
    setIsResolving(true);
    act(
      "expedition:force_march",
      {},
      "Party declared Forced March into Watch 4 darkness",
    );
    onClose();
  };

  const currentLoc = state.campaign.partyLocation ?? { q: 0, r: 0 };
  const currentHex = state.hexes.find(
    (h) => h.q === currentLoc.q && h.r === currentLoc.r,
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel camp-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px", width: "95%" }}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🌙</span>
            <div>
              <div className="eyebrow" style={{ color: "var(--ember)" }}>
                DAILY TRAVEL ALLOWANCE REACHED
              </div>
              <h2 style={{ margin: 0 }}>Night Falls: Make Camp or Force March</h2>
            </div>
          </div>
          <button className="icon-button close-btn" onClick={onClose} title="Dismiss for now">
            ✕
          </button>
        </div>

        <div className="camp-modal-body" style={{ margin: "14px 0" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "13px",
              color: "var(--muted)",
              lineHeight: "1.5",
            }}
          >
            The adventuring company has marched <b>{state.campaign.watchesTraveledToday ?? 3} watches</b> today.
            Dusk has faded into the freezing dark of <b>Watch 4 (Night)</b>. The wilderness around{" "}
            <b>Hex {currentHex?.id ?? "00"} ({currentHex?.name || "Wilderness"})</b> grows pitch-black and perilous.
          </p>

          <div
            className="camp-status-strip"
            style={{
              display: "flex",
              justifyContent: "space-around",
              padding: "8px 12px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            <span>📍 <b>Current Hex:</b> {currentHex?.id ?? "00"}</span>
            <span>🍞 <b>Party Supplies:</b> {state.campaign.rations ?? 12} Rations</span>
            <span>🌤️ <b>Weather:</b> {state.campaign.weather}</span>
          </div>

          <div
            className="camp-choice-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {/* Card 1: Make Camp */}
            <div
              className="camp-choice-card"
              style={{
                background: "rgba(34, 60, 40, 0.35)",
                border: "1px solid #4a9e5b",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "rgba(74, 158, 91, 0.25)", padding: "8px", borderRadius: "8px" }}>
                  <Tent size={26} color="#72d587" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#72d587" }}>Make Camp</h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>Rest safely until Dawn</span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4" }}>
                Pitch tents, build a fire, and assign night tasks. Clear fatigue and awaken refreshed at dawn.
              </p>

              {state.characters.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Designated Sentries (2 Highest WIS) */}
                  <div
                    className="watch-sentries-box"
                    style={{
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid rgba(114, 213, 135, 0.35)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="eyebrow" style={{ fontSize: "10px", color: "#72d587" }}>
                        Designated Night Sentries (2 Highest WIS)
                      </span>
                      <span style={{ fontSize: "10px", color: "#a8e6cf" }}>
                        {watchSentries.length >= 2 ? "Both shifts guarded (immune to surprise)" : "Single shift guarded"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                      {watchSentries.map((sentry, sIdx) => {
                        const wis = sentry.abilities?.wis ?? 10;
                        const mod = Math.floor((wis - 10) / 2);
                        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                        const shiftName = sIdx === 0 ? "First Watch Shift (Dusk)" : "Second Watch Shift (Late Night)";
                        return (
                          <div
                            key={sentry.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "rgba(255, 255, 255, 0.04)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            <div>
                              <b>🛡️ {sentry.name}</b>{" "}
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                (WIS {wis}, {modStr})
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#72d587", fontWeight: 500 }}>{shiftName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Other Crawlers: Prompt to Choose Task */}
                  {otherCrawlers.length > 0 ? (
                    <div className="other-crawlers-task-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span className="eyebrow" style={{ fontSize: "10px", color: "var(--ember)" }}>
                          Other Party Members: Choose Task
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                          Prompt crawlers to select camping duty (DC 12)
                        </span>
                      </div>
                      {otherCrawlers.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            background: "rgba(0, 0, 0, 0.2)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "110px" }}>
                            {c.name}:
                          </span>
                          <select
                            value={taskAssignments[c.id] || "cook"}
                            onChange={(e) =>
                              setTaskAssignments((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }))
                            }
                            style={{ fontSize: "11px", padding: "4px 8px", flex: 1, minWidth: "150px" }}
                          >
                            <option value="cook">🍲 Cook (INT/WIS) — +2 Temp HP (pg. 230)</option>
                            <option value="firewood">🪵 Firewood (STR/CON) — Free Campfire</option>
                            <option value="hunt">🏹 Hunt (STR/DEX) — Find 1d4 Rations</option>
                            <option value="bed_down">🛏️ Bed Down (Restful Sleep)</option>
                            <option value="entertain">🎭 Entertain (CHA) — Grant Luck</option>
                            <option value="craft">⚒️ Craft (DEX) — Ammo / Repair</option>
                            <option value="predict">🔮 Predict (INT/WIS) — Weather</option>
                            <option value="watch">🛡️ Additional Watch Guard</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic", background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
                      Small company: all available crawlers are deployed on night watch shifts.
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "3px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
                <span>✓ Clears 1 Fatigue level for all</span>
                <span>✓ Consumes 1 ration per crawler at dawn</span>
                <span>✓ Dawn arrives: Day {(state.campaign.day ?? 1) + 1}, Watch 1</span>
              </div>

              <button
                className="primary wide"
                style={{ marginTop: "auto", background: "#2e7d32", borderColor: "#4caf50", padding: "10px" }}
                onClick={handleMakeCamp}
                disabled={isResolving}
              >
                <Tent size={16} /> Make Camp & Resolve Evening
              </button>
            </div>

            {/* Card 2: Forced March */}
            <div
              className="camp-choice-card"
              style={{
                background: "rgba(90, 30, 30, 0.35)",
                border: "1px solid #d9534f",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "rgba(217, 83, 79, 0.25)", padding: "8px", borderRadius: "8px" }}>
                  <Footprints size={26} color="#ff7675" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#ff7675" }}>Forced March</h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>Push Into Watch 4</span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4" }}>
                Refuse to make camp. Drive the party onward through the freezing night watch despite aching limbs.
              </p>

              <div
                className="forced-march-perils"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  color: "#fab1a0",
                }}
              >
                <div>⚠️ <b>CON Save (DC 12 + fatigue):</b> Each crawler must test CON or suffer +1 Fatigue.</div>
                <div>⚠️ <b>Exhaustion:</b> Pushed crawlers cannot hunt or forage.</div>
                <div>⚠️ <b>Nocturnal Perils:</b> Navigation and encounter hazards are magnified in pitch darkness.</div>
              </div>

              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
                Crawlers currently fatigued:{" "}
                <b>{state.characters.filter((c) => (c.fatigue ?? 0) > 0).length} / {state.characters.length}</b>
              </div>

              <button
                className="danger wide"
                style={{ marginTop: "auto", background: "#c0392b", borderColor: "#e74c3c", color: "#fff", padding: "10px" }}
                onClick={handleForceMarch}
                disabled={isResolving}
              >
                <Footprints size={16} /> Force March Into Darkness
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
          <button className="subtle-btn" onClick={onClose}>
            Inspect Map First
          </button>
        </div>
      </div>
    </div>
  );
}

function CampSessionCard({ state, act }: { state: CampaignState; act: Act }) {
  const session = state.activeSession?.kind === "camp" ? state.activeSession : null;
  const isCaller = Boolean(state.me.isCaller || state.me.role === "host");
  const ownChar = state.characters.find((c) => c.id === state.me.characterId) ?? (state.me.role === "host" ? state.characters[0] : null);

  const [selectedCharId, setSelectedCharId] = useState<number>(ownChar?.id ?? state.characters[0]?.id ?? 0);
  const [duty, setDuty] = useState<"watch" | "cook" | "forage" | "rest">("watch");

  const submitDuty = async () => {
    if (!selectedCharId) return;
    await act(
      "camp:submit_duty",
      {
        characterId: selectedCharId,
        duty,
      },
      "Camp duty assigned",
    );
  };

  const resolveCamp = async () => {
    await act("camp:resolve", {}, "Camp duties resolved and night concluded!");
  };

  const openCamp = async () => {
    await act("camp:open", {}, "Night camp pitched!");
  };

  if (!session && !isCaller) return null;

  return (
    <article className="sub-panel camp-session-card full-width" style={{ border: "1px solid var(--ember)", marginBottom: "16px" }}>
      <div className="sub-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow">Night Camp Routine</div>
          <h3>Expedition Camp Routine</h3>
        </div>
        {(!session || session.status === "resolved") && isCaller && (
          <button className="primary small-btn" onClick={openCamp}>
            <Tent size={14} /> Pitch Night Camp
          </button>
        )}
      </div>

      {session && session.status === "open" && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="badge-tag" style={{ background: "var(--ember)", color: "#000", fontWeight: "bold" }}>
              CAMP PITCHED · ASSIGN DUTIES
            </span>
            {isCaller && (
              <button className="primary small-btn" onClick={resolveCamp}>
                Break Camp & Resolve Night
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", margin: "12px 0" }}>
            {state.characters.map((c) => {
              const choice = session.choices[String(c.id)];
              return (
                <div
                  key={c.id}
                  style={{
                    background: choice ? "rgba(217, 117, 56, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    border: choice ? "1px solid var(--ember)" : "1px dashed var(--line)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "13px" }}>{c.name}</div>
                  <div style={{ fontSize: "12px", color: choice ? "var(--ember)" : "var(--muted)", marginTop: "4px" }}>
                    {choice ? (
                      <span>
                        ✓ {choice.activity === "watch" ? "👁️ Sentry Watch" : choice.activity === "cook" ? "🍲 Camp Cook" : choice.activity === "forage" ? "🏹 Forager" : "🛌 Rest & Heal"}
                      </span>
                    ) : (
                      <span>Awaiting duty…</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: "6px", padding: "12px", marginTop: "12px" }}>
            <div className="eyebrow" style={{ marginBottom: "8px" }}>Select Your Night Camp Duty</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {state.me.role === "host" && (
                <select
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(Number(e.target.value))}
                  style={{ padding: "6px 8px", fontSize: "13px" }}
                >
                  {state.characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <select
                value={duty}
                onChange={(e) => setDuty(e.target.value as any)}
                style={{ padding: "6px 8px", fontSize: "13px" }}
              >
                <option value="watch">👁️ Night Watch Sentry (Guards vs Ambush)</option>
                <option value="cook">🍲 Camp Cook (Prepares rations)</option>
                <option value="forage">🏹 Wild Foraging (Conserves rations on DC 12)</option>
                <option value="rest">🛌 Bed Down & Rest (Heals 1d4 HP, recovers spells)</option>
              </select>

              <button className="primary small-btn" onClick={submitDuty}>
                Confirm Camp Duty
              </button>
            </div>
          </div>
        </div>
      )}

      {session && session.status === "resolved" && session.result?.logs && (
        <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--muted)" }}>
          <div className="eyebrow" style={{ marginBottom: "4px" }}>Last Night Camp Log:</div>
          <ul style={{ paddingLeft: "18px", margin: "0" }}>
            {session.result.logs.map((log: string, idx: number) => (
              <li key={idx}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export function MapView({ state, act, focus, onDirectory }: { state: CampaignState; act: Act; focus?: { id: string; revision: number }; onDirectory?: (hexId: string) => void }) {
  useEffect(() => { if (focus) setSelectedId(focus.id); }, [focus]);
  const [selectedId, setSelectedId] = useState("00"),
    [biome, setBiome] = useState("forest"),
    [genTheme, setGenTheme] = useState("temperate"),
    [travelMode, setTravelMode] = useState<"foot" | "cart" | "boat" | "climb">("foot");

  const isAllowanceReached =
    (state.campaign.watchesTraveledToday ?? 0) >= 3 || (state.campaign.watch ?? 1) === 4;
  const currentDayWatchKey = `${state.campaign.day ?? 1}:${state.campaign.watch ?? 1}:${state.campaign.watchesTraveledToday ?? 0}`;
  const [dismissedDayWatchKey, setDismissedDayWatchKey] = useState<string | null>(null);
  const [forcedCampModalOpen, setForcedCampModalOpen] = useState(false);

  const showCampPopup =
    forcedCampModalOpen || (isAllowanceReached && dismissedDayWatchKey !== currentDayWatchKey);

  const selected =
    state.hexes.find((hex) => hex.id === selectedId) ?? state.hexes[0];

  return (
    <div className="surface-grid map-layout">
      <section className="panel map-surface">
        <Title
          eyebrow="The campaign atlas"
          title="The charted frontier"
          aside={`${state.hexes.filter((h) => h.revealState !== "unexplored").length} / ${state.hexes.length} charted`}
        />

        <CampSessionCard state={state} act={act} />

        {isAllowanceReached && !showCampPopup && (
          <div
            className="travel-allowance-banner"
            style={{
              background: "rgba(217, 117, 56, 0.15)",
              border: "1px solid var(--ember)",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              <span>⚠️</span>
              <span>
                <b>Daily Travel Allowance Reached</b> — Dusk has fallen into Watch 4 (Night).
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="small-btn primary"
                onClick={() => setForcedCampModalOpen(true)}
                style={{ background: "#388e3c", borderColor: "#4caf50" }}
              >
                <Tent size={14} /> Make Camp
              </button>
              <button
                className="small-btn"
                onClick={() => setForcedCampModalOpen(true)}
                style={{ background: "#c0392b", borderColor: "#e74c3c", color: "#fff" }}
              >
                <Footprints size={14} /> Forced March
              </button>
            </div>
          </div>
        )}

        <FrontierMap
            directoryPins={state.hexes.filter(h => (state.facilities ?? []).some(f => f.locationId === h.id) || (state.worldNpcs ?? []).some(n => npcHexId(n, state) === h.id)).map(h => ({ hexId: h.id, label: `People & facilities in hex ${h.id}` }))}
            onDirectory={onDirectory}
          hexes={state.hexes}
          selectedId={selected.id}
          onSelect={setSelectedId}
          partyLocation={state.campaign.partyLocation ?? { q: 0, r: 0 }}
        />
      </section>

      <aside className="map-sidebar">
        <section className="panel inspector">
          <div className="eyebrow">
            Hex {selected.id} · {selected.revealState.replace("_", " ")}
          </div>
          <h2>
            {selected.revealState !== "unexplored"
              ? selected.name
              : selected.road
                ? `${selected.road} Reach`
                : selected.river
                  ? `${selected.river} Reach`
                  : "Uncharted Frontier"}
          </h2>

          <div className="hex-tag-row">
            {selected.primaryZone && (
              <span className="badge-tag zone-badge">
                📍 {selected.primaryZone.replace(/_/g, " ")}
              </span>
            )}
            {selected.secondaryZone && (
              <span className="badge-tag border-badge">
                ⚖️ Border: {selected.secondaryZone.replace(/_/g, " ")}
              </span>
            )}
            {selected.road && (
              <span className="badge-tag route-badge">
                🛣️ {selected.road}
              </span>
            )}
            {selected.river && (
              <span className="badge-tag river-badge">
                🌊 {selected.river}
              </span>
            )}
            {selected.exitDestination && (
              <span className="badge-tag exit-badge">
                {selected.exitDestination}
              </span>
            )}
          </div>

          {selected.horizonRumor && (
            <div className="horizon-rumor-callout">
              <div className="horizon-head">
                <Compass size={15} />
                <strong>Common Horizon Lore & Tavern Talk</strong>
              </div>
              <p>"{selected.horizonRumor}"</p>
              <small>
                Heard in taverns and from wandering scouts. Exact distance and
                perils remain uncertain until explored.
              </small>
            </div>
          )}

          {selected.revealState !== "unexplored" ? (
            <div className="hex-known-details">
              <div className="stat-row">
                <span>Biome</span>
                <b>{selected.biome}</b>
              </div>
              <div className="stat-row">
                <span>Threat</span>
                <b>Tier {selected.threatTier}</b>
              </div>
              <p className="hex-landmark-desc">
                <strong>Landmark:</strong> {selected.landmark}
              </p>
              {selected.sites && selected.sites.length > 0 && (
                <div className="sites-list" style={{ marginTop: "10px" }}>
                  <span className="eyebrow" style={{ fontSize: "11px" }}>Sites & Holdings</span>
                  <ul style={{ paddingLeft: "16px", margin: "4px 0 0" }}>
                    {selected.sites.map((s) => (
                      <li key={s.id}>
                        <b>{s.name}</b> ({s.kind})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.connections && selected.connections.length > 0 && (
                <div className="connections-list" style={{ marginTop: "8px" }}>
                  <span className="eyebrow" style={{ fontSize: "11px" }}>Travel Routes</span>
                  <ul style={{ paddingLeft: "16px", margin: "4px 0 0" }}>
                    {selected.connections.map((c) => (
                      <li key={c.id}>
                        {c.kind === "river" ? "🌊" : "🛣️"} {c.name} ➔ Hex {c.fromId === selected.id ? c.toId : c.fromId} ({c.costWatches} watch{c.costWatches > 1 ? "es" : ""}{c.crossingMethod ? `, ${c.crossingMethod}` : ""})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="fog-note">
              Specific landmarks, dungeon thresholds, and encounter tiers remain
              concealed under regional fog. Dispatch scouts or conduct a travel
              watch to explore this hex.
            </p>
          )}

          {/* Expedition & Movement Operations */}
          {(() => {
            const pLoc = state.campaign.partyLocation ?? { q: 0, r: 0 };
            const isPartyHere = selected.q === pLoc.q && selected.r === pLoc.r;
            const currentHex = state.hexes.find((h) => h.q === pLoc.q && h.r === pLoc.r);
            const axialDist =
              (Math.abs(pLoc.q - selected.q) +
                Math.abs(pLoc.q + pLoc.r - selected.q - selected.r) +
                Math.abs(pLoc.r - selected.r)) /
              2;
            const conn = selected.connections?.find(
              (c) =>
                (c.fromId === currentHex?.id && c.toId === selected.id) ||
                (c.toId === currentHex?.id && c.fromId === selected.id),
            );
            const canTravel = !isPartyHere && (axialDist === 1 || !!conn);

            return (
              <div
                className="hex-expedition-section"
                style={{
                  margin: "14px 0",
                  padding: "12px",
                  background: "#f4f5f0",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                }}
              >
                {isPartyHere ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--ember)",
                        fontWeight: "bold",
                        marginBottom: "8px",
                        fontSize: "13px",
                      }}
                    >
                      <span>⚔️ Adventuring Company is Camped Here</span>
                    </div>
                    <div className="eyebrow" style={{ fontSize: "11px", marginBottom: "6px" }}>
                      Local Hex Operations
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      <button
                        className="small-btn primary"
                        onClick={() => act("hex:search", {}, "Searched Hex " + selected.id)}
                      >
                        <Search size={14} /> Search (1 Watch)
                      </button>
                      <button
                        className="small-btn"
                        onClick={() => act("expedition:forage", {}, "Party foraged for provisions")}
                      >
                        <Apple size={14} /> Forage (1 Watch)
                      </button>
                      <button
                        className="small-btn full-span"
                        style={{ gridColumn: "1 / -1" }}
                        onClick={() => setForcedCampModalOpen(true)}
                      >
                        <Tent size={14} /> Make Camp / Rest
                      </button>
                    </div>

                    {selected.sites && selected.sites.length > 0 && (
                      <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
                        <div className="eyebrow" style={{ fontSize: "11px", marginBottom: "6px" }}>
                          Discovered Adventure Sites
                        </div>
                        {selected.sites.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "6px",
                            }}
                          >
                            <span style={{ fontSize: "12px" }}>
                              <b>{s.name}</b> ({s.kind})
                            </span>
                            <button
                              className="small-btn primary"
                              onClick={() => act("site:enter", { siteId: s.id }, `Entered ${s.name}`)}
                            >
                              <DoorOpen size={14} /> Enter Site
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="eyebrow" style={{ fontSize: "11px", marginBottom: "6px" }}>
                      Travel March to Hex {selected.id}
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ fontSize: "12px", color: "var(--muted)" }}>Mode:</label>
                      <select
                        value={travelMode}
                        onChange={(e) => setTravelMode(e.target.value as any)}
                        style={{ flex: 1, padding: "4px 8px", fontSize: "12px" }}
                      >
                        <option value="foot">On Foot</option>
                        <option value="cart">Cart & Mule</option>
                        <option value="boat">Riverboat / Canoe</option>
                        <option value="climb">Climbing Rig</option>
                      </select>
                    </div>
                    <button
                      className="primary wide"
                      disabled={!canTravel}
                      title={canTravel ? "" : "Must be adjacent (distance 1) or directly connected by a travel route"}
                      onClick={() => {
                        if (isAllowanceReached) {
                          setForcedCampModalOpen(true);
                          return;
                        }
                        act(
                          "travel:move",
                          { toHexId: selected.id, mode: travelMode },
                          `Traveled to Hex ${selected.id} on ${travelMode}`,
                        );
                      }}
                    >
                      <Footprints size={15} />{" "}
                      {canTravel
                        ? isAllowanceReached
                          ? `March to Hex ${selected.id} (Allowance Reached)`
                          : `March to Hex ${selected.id}`
                        : "Cannot Travel (Not Adjacent)"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {state.me.role === "host" && (
            <div className="hex-host-actions">
              {selected.revealState === "unexplored" && (
                <button
                  className="primary wide"
                  onClick={() =>
                    act(
                      "hex:reveal",
                      { id: selected.id, revealState: "scouted" },
                      `Hex ${selected.id} revealed to table`,
                    )
                  }
                >
                  <Sparkles size={16} /> Reveal to the Party (Scout)
                </button>
              )}
              {!["unexplored", "fully_mapped"].includes(
                selected.revealState,
              ) && (
                <button
                  className="wide"
                  onClick={() =>
                    act("hex:reveal", {
                      id: selected.id,
                      revealState: "fully_mapped",
                    })
                  }
                >
                  Mark Fully Mapped
                </button>
              )}

              <details className="regenerate-map-box">
                <summary>
                  <RefreshCw size={14} /> Regenerate Regional Frontier
                </summary>
                <div className="regenerate-body">
                  <p>
                    Procedurally re-seed the frontier with connected
                    waterways, radiating roads, and horizon rumors.
                  </p>
                  <div className="theme-select-row">
                    <RealmSelect
                      value={genTheme}
                      onChange={(e) => setGenTheme(e.target.value)}
                     />
                    <button
                      className="primary small-btn"
                      onClick={() =>
                        act(
                          "hex:regenerate",
                          { theme: genTheme },
                          "Regional frontier regenerated",
                        )
                      }
                    >
                      Re-seed
                    </button>
                  </div>
                </div>
              </details>
            </div>
          )}
        </section>
        {state.me.role === "host" && (
          <LanDiscoveryPanel state={state} />
        )}
        <section className="panel compact">
          <div className="eyebrow">Travel procedure</div>
          <h3>Run a wilderness watch</h3>
          <select value={biome} onChange={(e) => setBiome(e.target.value)}>
            <option value="forest">Forest</option>
            <option value="marsh">Marsh / fen</option>
            <option value="mountain">Mountain crags</option>
          </select>
          <button
            className="primary wide"
            onClick={() =>
              act("wilderness:watch", { biome }, "Travel watch resolved")
            }
          >
            <Compass size={17} /> Weather + encounter
          </button>
        </section>
        <section className="panel compact">
          <div className="eyebrow">Dungeon architect</div>
          <h3>
            {state.rooms.length
              ? `${state.rooms.length} chambers mapped`
              : "No chambers mapped"}
          </h3>
          {state.me.role === "host" && (
            <button
              className="wide"
              onClick={() =>
                act("dungeon:generate", {}, "A new chamber was revealed")
              }
            >
              <DoorOpen size={17} /> Generate next chamber
            </button>
          )}
        </section>
      </aside>
      {(state.rooms.length > 0 || state.campaign.activeSiteId) && (
        <section className="panel full-span room-strip">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <Title
              eyebrow={state.campaign.activeSiteId ? `Adventure Site: ${state.campaign.activeSiteId}` : "Current delve"}
              title={state.campaign.activeSiteId ? "Site Delve & Chambers" : "Revealed chambers"}
            />
            {state.campaign.activeSiteId && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {state.campaign.activeSiteId.includes("waterworks") && (
                  <button
                    className="primary small-btn"
                    onClick={() =>
                      act(
                        "site:resolve_deed",
                        {
                          siteId: state.campaign.activeSiteId!,
                          deed: "rescue_surveyor",
                          details: "Rescued surveyor Jonathan Vane and halted water contamination",
                        },
                        "Resolved deed: rescue_surveyor",
                      )
                    }
                  >
                    🏆 Resolve Deed: Rescue Surveyor Jonathan Vane
                  </button>
                )}
                <button
                  className="small-btn"
                  onClick={() => act("site:exit", {}, "Exited site back to surface")}
                  disabled={Boolean(state.activeDungeon?.siteStructure && state.activeDungeon.currentRoomId !== state.activeDungeon.entryRoomId)}
                >
                  <DoorOpen size={14} /> Exit Site to Overworld
                </button>
              </div>
            )}
          </div>
          <div className="room-list">
            {state.rooms.map((room) => (
              <article key={room.id}>
                <span>{String(room.sequence).padStart(2, "0")}</span>
                <h3>{room.geometry}</h3>
                <b>
                  {room.contents} · {room.exits} exit
                  {room.exits === 1 ? "" : "s"}
                </b>
                <p>
                  {room.trap
                    ? `${room.trap.name}: ${room.trap.effect} (DC ${room.trap.dc})`
                    : room.interaction}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
      {showCampPopup && (
        <CampAllowanceModal
          state={state}
          act={act}
          onClose={() => {
            setDismissedDayWatchKey(currentDayWatchKey);
            setForcedCampModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

