import { useEffect, useRef, useState } from "react";
import { Title } from "./ui/Common";
import type { Act } from "./ui/types";



import { DoorOpen, Flame, Footprints, Map, Plus, Search, Unlock } from "lucide-react";
import type { CampaignState } from "../shared/types";

import { MapViewport } from "./MapViewport";
import { nextRetreatRoom } from "../shared/dungeon-route";
export function DungeonView({ state, act }: { state: CampaignState; act: Act }) {
  const dungeonMapRef = useRef<HTMLDivElement | null>(null);
  const dungeon = state.activeDungeon;
  const isCaller = Boolean(state.me.isCaller || state.me.role === "host");
  const [outcome, setOutcome] = useState("searched");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [treasureFound, setTreasureFound] = useState(false);
  const [treasureAccessible, setTreasureAccessible] = useState(false);
  const [objectiveCompleted, setObjectiveCompleted] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<number>(
    dungeon?.currentRoomId ?? 1,
  );

  useEffect(() => {
    if (dungeon?.currentRoomId) {
      setSelectedRoomId(dungeon.currentRoomId);
      setOutcomeNotes("");
      setTreasureFound(false);
      setTreasureAccessible(false);
      setObjectiveCompleted(false);
    }
  }, [dungeon?.currentRoomId]);

  if (!dungeon) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
        <DoorOpen size={48} style={{ color: "var(--muted)", margin: "0 auto 16px" }} />
        <h2>No Active Dungeon Delve</h2>
        <p style={{ color: "var(--muted)" }}>
          Select a discovered dungeon or ruin from the frontier map to delve into the depths.
        </p>
      </div>
    );
  }

  const currentRoom = dungeon.nodes.find((n) => n.id === dungeon.currentRoomId) ?? dungeon.nodes[0];
  const inspectedRoom = dungeon.nodes.find((n) => n.id === selectedRoomId) ?? currentRoom;

  const currentEdges = dungeon.edges.filter(
    (e) => e.fromRoomId === dungeon.currentRoomId || e.toRoomId === dungeon.currentRoomId,
  );

  const lightLit = dungeon.lightTurnsRemaining > 0;
  const section = dungeon.siteStructure?.sections.find(s => s.roomIds.includes(currentRoom.id));
  const retreatRoom = nextRetreatRoom(dungeon);
  const canExit = !dungeon.siteStructure || dungeon.currentRoomId === dungeon.entryRoomId;
  const atTransition = currentEdges.some(e => e.transition);

  const moveRoom = async (toRoomId: number) => {
    await act("dungeon:move_room", { toRoomId }, `Party advanced to Room ${toRoomId}`);
  };

  const interactDoor = async (
    fromRoomId: number,
    toRoomId: number,
    action: "open" | "close" | "pick" | "force" | "search_secret",
  ) => {
    await act(
      "dungeon:interact_door",
      { fromRoomId, toRoomId, action },
      `Door action: ${action}`,
    );
  };

  const disarmTrap = async (roomId: number) => {
    const thief = state.characters.find((c) => c.className.toLowerCase().includes("thief")) ?? state.characters[0];
    await act(
      "dungeon:disarm_trap",
      { roomId, characterId: thief.id },
      "Thief attempted to disarm trap",
    );
  };

  const claimTreasure = async (roomId: number) => {
    await act("dungeon:claim_treasure", { roomId }, "Treasure chamber claimed!");
  };

  const lightTorch = async () => {
    await act("dungeon:light_torch", {}, "New torch ignited (+6 light turns)");
  };

  const retreatSurface = async () => {
    await act("site:exit", {}, "Party retreated to surface frontier");
  };


  return (
    <div className="surface-grid" style={{ gridTemplateColumns: "1fr", gap: "20px" }}>
      <section className="panel">
        <Title
          eyebrow={`Site Delve · ${dungeon.siteId}`}
          title={`Room ${currentRoom.id}: ${currentRoom.title}`}
          aside={`Turn ${dungeon.explorationTurns}`}
        />

        <div className="dungeon-status-bar">
          <div className="torch-meter">
            <Flame size={20} className={lightLit ? "flame-lit" : "flame-out"} />
            <div>
              <b>Torch Light:</b> {dungeon.lightTurnsRemaining} / 6 turns
              {!lightLit && (
                <span className="danger-tag" style={{ marginLeft: "8px" }}>
                  ⚠️ Pitch Darkness!
                </span>
              )}
            </div>
            <button className="small-btn primary" onClick={lightTorch}>
              <Flame size={14} /> Light Torch
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {dungeon.explorationTurns} Turns Elapsed
            </span>
            {dungeon.siteStructure && !canExit && <button className="small-btn"
              disabled={!isCaller || retreatRoom === undefined}
              onClick={() => retreatRoom !== undefined && moveRoom(retreatRoom)}>
              Backtrack toward entrance
            </button>}
            <button className="small-btn" disabled={!isCaller || !canExit} onClick={retreatSurface}>
              Surface Exit
            </button>
            <span className="muted">Backtrack and exit to camp here, or travel home to recover.</span>
          </div>
        </div>

        {/* Interactive SVG Dungeon Map */}
        {(() => {
          // Bounds follow the actual rooms, so a site larger than the old fixed frame is panned to
          // rather than cropped. Site maps stay legible at one scale, so they pan without zooming.
          const pad = 70;
          const xs = dungeon.nodes.map((n) => n.x);
          const ys = dungeon.nodes.map((n) => n.y);
          const minX = Math.min(...xs) - pad;
          const minY = Math.min(...ys) - pad;
          const mapWidth = Math.max(...xs) + pad - minX;
          const mapHeight = Math.max(...ys) + pad - minY;
          return (
        <MapViewport
          viewportRef={dungeonMapRef}
          className="dungeon-map-container"
          ariaLabel="Site map. Drag to pan, arrow keys to scroll."
        >
          <svg
            viewBox={`${minX} ${minY} ${mapWidth} ${mapHeight}`}
            className="dungeon-svg-map"
            style={{ minWidth: `${mapWidth}px`, height: `${mapHeight}px` }}
          >
            {/* Edges */}
            {dungeon.edges.map((edge, idx) => {
              const from = dungeon.nodes.find((n) => n.id === edge.fromRoomId);
              const to = dungeon.nodes.find((n) => n.id === edge.toRoomId);
              if (!from || !to) return null;
              const isLocked = edge.state === "locked" || edge.state === "barred";
              const isSecret = edge.doorType === "secret";
              const isOpen = edge.state === "open";
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              return (
                <g key={idx}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isSecret ? "#9d4edd" : isLocked ? "var(--danger)" : "var(--line)"}
                    strokeWidth={isSecret ? 3 : 4}
                    strokeDasharray={!isOpen ? "6,4" : undefined}
                  />
                  <circle
                    cx={midX}
                    cy={midY}
                    r={8}
                    fill={isOpen ? "#388e3c" : isLocked ? "var(--danger)" : "#e5a93b"}
                    stroke="#000"
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {dungeon.nodes.map((node) => {
              const isCurrent = node.id === dungeon.currentRoomId;
              const isInspected = node.id === inspectedRoom.id;
              return (
                <g
                  key={node.id}
                  className="room-node"
                  onClick={() => setSelectedRoomId(node.id)}
                  style={{ cursor: "pointer" }}
                >
                  {isCurrent && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={34}
                      fill="none"
                      stroke="var(--ember)"
                      strokeWidth={3}
                      className="party-ring-pulse"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={26}
                    fill={isCurrent ? "rgba(217, 117, 56, 0.4)" : node.explored ? "#262b28" : "#141715"}
                    stroke={isInspected ? "#fff" : isCurrent ? "var(--ember)" : node.explored ? "var(--line)" : "#333"}
                    strokeWidth={isInspected ? 3 : isCurrent ? 2.5 : 1.5}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                  >
                    {node.id}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 42}
                    textAnchor="middle"
                    fill={isCurrent ? "var(--ember)" : "var(--muted)"}
                    fontSize={11}
                    fontWeight={isCurrent ? "bold" : "normal"}
                  >
                    {node.title.length > 15 ? node.title.slice(0, 13) + "…" : node.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </MapViewport>
          );
        })()}

        {/* Current & Inspected Room Details */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          <div className="sub-panel" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", padding: "16px" }}>
            <div className="eyebrow">
              {inspectedRoom.id === dungeon.currentRoomId ? "Current Chamber Exploration" : `Inspecting Room ${inspectedRoom.id}`}
            </div>
            <h3>{inspectedRoom.title}</h3>
            <p style={{ margin: "8px 0", color: "var(--ink)", fontSize: "14px" }}>
              <b>Geometry:</b> {inspectedRoom.geometry}
            </p>
            <p style={{ margin: "8px 0", color: "var(--ink)", fontSize: "14px" }}>
              <b>Contents:</b> {inspectedRoom.contents}
            </p>
            <p style={{ margin: "8px 0", color: "var(--muted)", fontSize: "13px" }}>
              <b>Feature:</b> {inspectedRoom.interaction}
            </p>

            {/* Sensory Tell / Unspotted Danger */}
            {inspectedRoom.sensoryTell && (!inspectedRoom.trap || !inspectedRoom.trap.spotted) && (
              <div
                style={{
                  background: "var(--color-bg-subtle, rgba(255, 255, 255, 0.05))",
                  borderLeft: "4px solid var(--color-ember, #B8430F)",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  margin: "12px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--color-ember, #B8430F)", letterSpacing: "0.05em" }}>
                    👁️ Sensory Tell
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--color-text-primary, #1C1917)", fontStyle: "italic", marginTop: "2px" }}>
                    "{inspectedRoom.sensoryTell}"
                  </div>
                </div>
                {isCaller && inspectedRoom.id === dungeon.currentRoomId && (
                  <button
                    className="btn-hig btn-hig-ember"
                    style={{ minHeight: "36px", padding: "4px 12px", fontSize: "12px" }}
                    onClick={() => act("dungeon:spot_trap", { roomId: inspectedRoom.id }, "Searched chamber and detected trap mechanism")}
                    title="Investigate the sensory tell to reveal hidden traps"
                  >
                    🔍 Investigate & Spot Trap
                  </button>
                )}
              </div>
            )}

            {/* Trap in Current Room */}
            {inspectedRoom.trap && inspectedRoom.trap.spotted && (
              <div
                style={{
                  background: inspectedRoom.trap.disarmed ? "rgba(56, 142, 60, 0.15)" : "rgba(192, 57, 43, 0.15)",
                  border: `1px solid ${inspectedRoom.trap.disarmed ? "#388e3c" : "#c0392b"}`,
                  borderRadius: "6px",
                  padding: "10px",
                  margin: "12px 0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold", fontSize: "13px" }}>
                    ⚠️ Trap: {inspectedRoom.trap.name}
                  </span>
                  {inspectedRoom.trap.disarmed ? (
                    <span className="badge-tag" style={{ background: "#388e3c", color: "#fff" }}>✓ DISARMED</span>
                  ) : (
                    <button
                      className="small-btn danger-btn"
                      onClick={() => disarmTrap(inspectedRoom.id)}
                    >
                      Disarm Trap (DC {inspectedRoom.trap.dc})
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: "var(--muted)" }}>
                  Trigger: {inspectedRoom.trap.trigger} · Effect: {inspectedRoom.trap.effect}
                </div>
              </div>
            )}

            {/* Encounter in Current Room */}
            {inspectedRoom.encounter && (
              <div
                style={{
                  background: inspectedRoom.encounter.defeated ? "rgba(255, 255, 255, 0.04)" : "rgba(217, 117, 56, 0.15)",
                  border: "1px solid var(--ember)",
                  borderRadius: "6px",
                  padding: "10px",
                  margin: "12px 0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b>Creatures:</b> {inspectedRoom.encounter.count}x {inspectedRoom.encounter.name}
                  </div>
                  {inspectedRoom.encounter.defeated ? (
                    <span className="badge-tag">DEFEATED</span>
                  ) : (
                    <button
                      className="small-btn primary"
                      disabled={!isCaller || inspectedRoom.id !== dungeon.currentRoomId || Boolean(inspectedRoom.resolution)}
                      onClick={() => act("combat:start", { roomId: inspectedRoom.id })}
                    >
                      Engage in Combat
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Treasure in Current Room */}
            {inspectedRoom.treasure && (
              <div
                style={{
                  background: inspectedRoom.treasure.claimed ? "rgba(255, 255, 255, 0.04)" : "rgba(229, 169, 59, 0.15)",
                  border: "1px solid #e5a93b",
                  borderRadius: "6px",
                  padding: "10px",
                  margin: "12px 0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b>💰 Chamber Spoils:</b> {inspectedRoom.treasure.coins} GP
                    {inspectedRoom.treasure.items?.length > 0 && ` · Items: ${inspectedRoom.treasure.items.join(", ")}`}
                  </div>
                  {inspectedRoom.treasure.claimed ? (
                    <span className="badge-tag">SECURED</span>
                  ) : (
                    <button
                      className="small-btn primary"
                      disabled={!isCaller || inspectedRoom.id !== dungeon.currentRoomId || !inspectedRoom.treasure.access}
                      title="Record discovery and access before claiming treasure"
                      onClick={() => claimTreasure(inspectedRoom.id)}
                    >
                      Claim & Loot
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {inspectedRoom.id === dungeon.currentRoomId && (
            <section className="sub-panel">
              <h3>Resolve this area at the table</h3>
              {inspectedRoom.feature && <p>Room feature: {inspectedRoom.feature.replaceAll("_", " ")}</p>}
              {inspectedRoom.objective && <p><b>Objective:</b> {inspectedRoom.objective.title}
                {inspectedRoom.objective.completed ? " — completed" : ""}</p>}
              {inspectedRoom.objective?.generated && <div>
                <p>{inspectedRoom.objective.generated.procedure}</p>
                <p><b>Completion:</b> {inspectedRoom.objective.generated.completion}</p>
                <p><b>Approaches:</b> {inspectedRoom.objective.generated.approaches.join(", ")}</p>
                {inspectedRoom.objective.generated.rescuedNpc && (
                  <p>
                    <b>Captive:</b> {inspectedRoom.objective.generated.rescuedNpc.className}
                    {" · "}
                    {inspectedRoom.objective.generated.rescuedNpc.generationMethod === "iron_man"
                      ? "Iron Man"
                      : "Unearthed Arcana"}
                    {" · "}
                    {(["str", "dex", "con", "int", "wis", "cha"] as const)
                      .map((key) => `${key.toUpperCase()} ${inspectedRoom.objective!.generated!.rescuedNpc!.abilities[key]}`)
                      .join(" ")}
                    {" · no gear"}
                  </p>
                )}
                {inspectedRoom.objective.completed &&
                  inspectedRoom.objective.generated.rescuedNpc &&
                  !inspectedRoom.objective.generated.rescuedNpc.recruited && (
                    <button
                      className="primary"
                      onClick={async () => {
                        await act(
                          "dungeon:recruit_rescued",
                          { roomId: inspectedRoom.id },
                          `${inspectedRoom.objective!.generated!.rescuedNpc!.name} joined the company (Reserve, no gear)`,
                        );
                      }}
                    >
                      <Plus size={15} /> Take {inspectedRoom.objective.generated.rescuedNpc.name} into the roster
                    </button>
                  )}
                {inspectedRoom.objective.generated.rescuedNpc?.recruited && (
                  <p>
                    <b>{inspectedRoom.objective.generated.rescuedNpc.name}</b> travels with the
                    company — equip them from party stores.
                  </p>
                )}
                {inspectedRoom.objective.completed && <p><b>Follow-up:</b> {inspectedRoom.objective.generated.nextAction}</p>}
              </div>}
              {inspectedRoom.clues?.map(clue => <p key={clue.id}><b>Evidence:</b> {clue.text}</p>)}
              {inspectedRoom.resolution && <p>Recorded: {inspectedRoom.resolution.outcome} — {inspectedRoom.resolution.notes}</p>}
              <p>Record what happened, including how guards, traps, locks, or hazards were dealt with or bypassed. Entering or winning a fight does not automatically secure treasure.</p>
              {isCaller && <form onSubmit={async (event) => {
                event.preventDefault();
                await act("dungeon:record_outcome", { roomId: inspectedRoom.id, outcome,
                  notes: outcomeNotes, treasureFound, treasureAccessible, objectiveCompleted }, "Room outcome recorded");
                setOutcomeNotes("");
                setTreasureFound(false);
                setTreasureAccessible(false);
                setObjectiveCompleted(false);
              }}>
                <label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                  <option value="searched">Searched</option><option value="defeated">Defeated</option>
                  <option value="negotiated">Negotiated</option><option value="avoided">Avoided / bypassed</option>
                  <option value="disarmed">Disarmed</option><option value="overcame">Overcame hazard</option>
                </select></label>
                <label>What happened?<textarea required minLength={5} maxLength={1000} value={outcomeNotes}
                  onChange={(event) => setOutcomeNotes(event.target.value)} /></label>
                {!inspectedRoom.treasure && <label><input type="checkbox" checked={treasureFound}
                  onChange={(event) => setTreasureFound(event.target.checked)} />The table found treasure here; generate its contents</label>}
                {!inspectedRoom.treasure?.claimed && <label><input type="checkbox" checked={treasureAccessible}
                  onChange={(event) => setTreasureAccessible(event.target.checked)} />Treasure was discovered and made accessible by this approach</label>}
                {inspectedRoom.objective && !inspectedRoom.objective.completed && <label><input type="checkbox"
                  checked={objectiveCompleted} onChange={(event) => setObjectiveCompleted(event.target.checked)} />The site objective was accomplished</label>}
                <button type="submit" disabled={outcomeNotes.trim().length < 5}>Record table outcome</button>
              </form>}
            </section>
          )}

          {/* Connected Doors & Passages */}
          <div className="sub-panel" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", padding: "16px" }}>
            <div className="eyebrow">Passages & Portals from Room {dungeon.currentRoomId}</div>
            <h3>Connecting Thresholds{section ? ` · Section ${section.id}` : ""}</h3>
            {atTransition && <p>You have reached a link between sections. Continue when ready, or backtrack to the entrance and camp before returning. Explored rooms and claimed treasure remain saved.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              {currentEdges.map((edge, idx) => {
                const targetRoomId = edge.fromRoomId === dungeon.currentRoomId ? edge.toRoomId : edge.fromRoomId;
                const targetNode = dungeon.nodes.find((n) => n.id === targetRoomId);
                const isOpen = edge.state === "open";
                const isLocked = edge.state === "locked" || edge.state === "barred";
                const isSecret = edge.doorType === "secret";

                return (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(0, 0, 0, 0.2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <b>{edge.transition === "stairs" ? "Stairs" : edge.transition === "nearby_path" ? "Path to nearby place" : "Door"} to Room {targetRoomId}:</b> {targetNode?.title ?? `Room ${targetRoomId}`}
                        <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
                          Type: {edge.doorType} · State: {edge.state}
                        </div>
                      </div>
                      <span
                        className="badge-tag"
                        style={{
                          background: isOpen ? "#388e3c" : isLocked ? "var(--danger)" : "#e5a93b",
                          color: "#fff",
                        }}
                      >
                        {edge.state.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {isOpen ? (
                        <button
                          className="primary small-btn"
                          disabled={!isCaller}
                          title={isCaller ? "" : "Only the designated Caller or Host can move the party"}
                          onClick={() => moveRoom(targetRoomId)}
                        >
                          <Footprints size={14} /> {edge.transition
                            ? `${targetRoomId > dungeon.currentRoomId ? "Continue" : "Return"} ${edge.transition === "stairs" ? (targetRoomId > dungeon.currentRoomId ? "down a level" : "up a level") : "along the path"}`
                            : `Move Party into Room ${targetRoomId}`}
                        </button>
                      ) : (
                        <>
                          {edge.state === "closed" && (
                            <button
                              className="small-btn primary"
                              onClick={() => interactDoor(edge.fromRoomId, edge.toRoomId, "open")}
                            >
                              <DoorOpen size={14} /> Open Door
                            </button>
                          )}
                          {isLocked && (
                            <>
                              <button
                                className="small-btn"
                                onClick={() => interactDoor(edge.fromRoomId, edge.toRoomId, "pick")}
                              >
                                <Unlock size={14} /> Pick Lock (Thief DEX)
                              </button>
                              <button
                                className="small-btn"
                                onClick={() => interactDoor(edge.fromRoomId, edge.toRoomId, "force")}
                              >
                                Force Door (STR)
                              </button>
                            </>
                          )}
                          {isSecret && (
                            <button
                              className="small-btn"
                              onClick={() => interactDoor(edge.fromRoomId, edge.toRoomId, "search_secret")}
                            >
                              <Search size={14} /> Search Secret Passage (INT)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

