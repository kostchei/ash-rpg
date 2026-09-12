import { LanDiscoveryPanel } from "./LanDiscoveryPanel";
import { MapView } from "./MapRegion";
import { PartyView } from "./PartyLedger";
import { DungeonView } from "./DungeonView";
import { Title, Brand, Field } from "./ui/Common";
import { CombatView } from "./CombatView";
import { PlayerDashboard } from "./PlayerDashboard";
import { TableCompanionLayout } from "./ui/TableCompanionLayout";
import { Modal } from "./ui/Modal";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { RECEIPTED_ACTIONS } from "../shared/mutations";
import { createActionId, fetchOlderNotes, fetchOlderRolls, sendMutation } from "./mutations";

import { CodexModal } from "./CodexModal";
import { DirectoryModal } from "./DirectoryModal";
import { AlertTriangle, BookOpen, Castle, ChevronRight, CircleDot, Compass, Copy, Dices, DoorOpen, Flame, Heart, LogOut, Map, Menu, Plus, ScrollText, Sparkles, Users, X } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { buildStateFromSlices, patchStateWithSlices, type SlicesUpdate } from "../shared/slices";
import { ABILITY_KEYS, ITEMS } from "../shared/content";
import { getBorderPairing, ZONE_PROFILES } from "../shared/zone-profiles";
import type { CampaignState, Character, CursedZoneId, NpcResult, RegionGenerationConfig, RewardRecord, RollRecord, SessionIdentity, SettlementResult, WikiNote } from "../shared/types";

type Tab = "sanctuary" | "map" | "dungeon" | "party" | "oracle" | "chronicle";
type Act = <T>(
  event: string,
  payload?: unknown,
  success?: string,
) => Promise<T>;
const SESSION_KEY = "ash-table-session";
const labels = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
} as const;
const mod = (score: number) =>
  score <= 3
    ? -4
    : score <= 5
      ? -3
      : score <= 8
        ? -2
        : score <= 11
          ? 0
          : score <= 13
            ? 1
            : score <= 15
              ? 2
              : score <= 17
                ? 3
                : 4;
const getSession = () => {
  try {
    return JSON.parse(
      localStorage.getItem(SESSION_KEY) ?? "null",
    ) as SessionIdentity | null;
  } catch {
    return null;
  }
};
async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

export function App() {
  const [session, setSession] = useState<SessionIdentity | null>(getSession);
  const [state, setState] = useState<CampaignState | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connection, setConnection] = useState<
    "connecting" | "online" | "offline"
  >("connecting");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session) return;
    const next = io({ auth: session });
    setSocket(next);
    next.on("connect", () => {
      setConnection("online");
      setError("");
    });
    next.on("disconnect", () => setConnection("offline"));
    next.on("connect_error", (reason) => {
      setConnection("offline");
      setError(reason.message);
    });
    next.on("state", (incoming: SlicesUpdate) => {
      if (!incoming || !incoming.slices) {
        throw new Error("Server sent a state event without slices");
      }
      setState((current) =>
        current === null
          ? buildStateFromSlices(incoming)
          : patchStateWithSlices(current, incoming),
      );
    });
    next.on("roll:appended", (roll: RollRecord) => {
      setState((current) => {
        if (!current) return current;
        if (current.rolls.some((r) => r.id === roll.id)) return current;
        return { ...current, rolls: [roll, ...current.rolls] };
      });
    });
    next.on("note:appended", (note: WikiNote) => {
      setState((current) => {
        if (!current) return current;
        if (current.notes.some((n) => n.id === note.id)) return current;
        return { ...current, notes: [note, ...current.notes] };
      });
    });
    return () => {
      next.disconnect();
      setSocket(null);
    };
  }, [session]);
  const establish = (identity: SessionIdentity) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
    setSession(identity);
    history.replaceState(
      {},
      "",
      `/${identity.role === "host" ? "host" : "play"}?code=${identity.code}`,
    );
  };
  const leave = () => {
    localStorage.removeItem(SESSION_KEY);
    socket?.disconnect();
    setSession(null);
    setState(null);
    history.replaceState({}, "", "/");
  };
  if (!session) return <Welcome onSession={establish} />;
  if (!state)
    return (
      <main className="loading">
        <Flame size={42} />
        <div className="eyebrow">
          {connection === "offline"
            ? "Connection lost"
            : "Opening the campaign record"}
        </div>
        <h2>{error || "Listening for the table…"}</h2>
        {error && <button onClick={leave}>Return to entry</button>}
      </main>
    );
  return (
    <Campaign
      state={state}
      socket={socket!}
      connection={connection}
      leave={leave}
    />
  );
}

function Welcome({
  onSession,
}: {
  onSession: (session: SessionIdentity) => void;
}) {
  const queryCode =
    new URLSearchParams(location.search).get("code")?.toUpperCase() ?? "";
  const [mode, setMode] = useState<"create" | "join" | "host">(
    location.pathname.startsWith("/play")
      ? "join"
      : location.pathname.startsWith("/host")
        ? "host"
        : "create",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "The Torchbearer Company",
    regionName: "The Western Reaches",
    pin: "",
    code: queryCode,
  });
  const [settingMode, setSettingMode] = useState<"single" | "border">("single");
  const [selectedZone, setSelectedZone] = useState<CursedZoneId>("the_gloaming");
  const [borderZoneA, setBorderZoneA] = useState<CursedZoneId>("the_gloaming");
  const [borderZoneB, setBorderZoneB] = useState<CursedZoneId>("red_sands");
  const [borderConnection, setBorderConnection] = useState<string>("surface");
  const [seed, setSeed] = useState("");
  const [season, setSeason] = useState<"spring" | "summer" | "autumn" | "winter">("autumn");
  const [pathMode, setPathMode] = useState<"explicit" | "secret">("explicit");
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const pairing = getBorderPairing(borderZoneA, borderZoneB);

  useEffect(() => {
    if (pairing) {
      setBorderConnection(pairing.recommendedConnection);
    }
  }, [borderZoneA, borderZoneB]);

  const buildGenerationConfig = (): RegionGenerationConfig => {
    if (settingMode === "single") {
      return {
        selection: { mode: "single", zoneId: selectedZone },
        seed: seed.trim() || undefined,
        season,
        initialRadius: 2,
        structuralRadius: 6,
        regionalHexMiles: 6,
      };
    }
    return {
      selection: {
        mode: "border",
        zoneIds: [borderZoneA, borderZoneB],
        connection: (borderConnection as any) || "surface",
        borderProfileId: pairing?.id,
      },
      seed: seed.trim() || undefined,
      season,
      initialRadius: 2,
      structuralRadius: 6,
      regionalHexMiles: 6,
    };
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const cfg = buildGenerationConfig();
      const res = await post("/api/regions/preview", cfg);
      setPreview(res);
    } catch (err: any) {
      setPreviewError(err.message || "Failed to preview map");
    } finally {
      setPreviewLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "create"
          ? await post("/api/campaigns", {
              name: form.name,
              regionName: form.regionName,
              pin: form.pin,
              generationConfig: buildGenerationConfig(),
              pathSelection: { mode: pathMode },
            })
          : mode === "join"
            ? await post("/api/campaigns/join", { code: form.code })
            : await post("/api/campaigns/host", {
                code: form.code,
                pin: form.pin,
              });
      onSession({ code: result.code, role: result.role, token: result.token });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="welcome">
      <section className="welcome-story">
        <Brand large />
        <div>
          <div className="eyebrow">GM-less play · one shared world</div>
          <h1>Let the frontier answer back.</h1>
          <p>
            Characters, procedural rulings, shared fog, and a living campaign
            record—served from your table to every player’s phone.
          </p>
        </div>
        <div className="feature-strip">
          <span>
            <Dices /> Impartial oracles
          </span>
          <span>
            <Map /> Shared discovery
          </span>
          <span>
            <ScrollText /> Persistent chronicle
          </span>
        </div>
      </section>
      <section className="welcome-form">
        <div className="mode-tabs">
          <button
            className={mode === "create" ? "active" : ""}
            onClick={() => setMode("create")}
          >
            New campaign
          </button>
          <button
            className={mode === "join" ? "active" : ""}
            onClick={() => setMode("join")}
          >
            Join table
          </button>
          <button
            className={mode === "host" ? "active" : ""}
            onClick={() => setMode("host")}
          >
            Host login
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="eyebrow">
            {mode === "create"
              ? "Begin a new record"
              : mode === "join"
                ? "Enter the expedition"
                : "Return to your table"}
          </div>
          <h2>
            {mode === "create"
              ? "Name the company."
              : mode === "join"
                ? "Your companions await."
                : "Open the host console."}
          </h2>
          {mode === "create" && (
            <>
              <Field
                label="Campaign name"
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
              />
              <Field
                label="Starting region"
                value={form.regionName}
                onChange={(regionName) => setForm({ ...form, regionName })}
              />

              <div className="field-group">
                <label className="field-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Frontier Setting Strategy
                </label>
                <div className="mode-tabs mini-tabs" style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className={settingMode === "single" ? "active" : ""}
                    onClick={() => { setSettingMode("single"); setPreview(null); }}
                  >
                    Single Setting
                  </button>
                  <button
                    type="button"
                    className={settingMode === "border" ? "active" : ""}
                    onClick={() => { setSettingMode("border"); setPreview(null); }}
                  >
                    Border Crossing
                  </button>
                </div>

                {settingMode === "single" ? (
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Setting / Realm</label>
                    <select
                      value={selectedZone}
                      onChange={(e) => { setSelectedZone(e.target.value as CursedZoneId); setPreview(null); }}
                    >
                      <option value="the_gloaming">The Gloaming (Gothic Wildwood - CS1)</option>
                      <option value="red_sands">The Red Sands (Djurum Desert - CS2)</option>
                      <option value="midnight_sun">The Isles of Andrik (Glacial Fjords - CS3)</option>
                      <option value="river_of_night">The Black River (Primeval Jungle - CS4)</option>
                      <option value="dwellers_in_the_deep">Morzomotha (Karst Deeps - CS5)</option>
                      <option value="city_of_masks">The City of Masks (Meridia Canals - CS6)</option>
                    </select>
                    <small style={{ display: "block", marginTop: 4, opacity: 0.75 }}>
                      {ZONE_PROFILES[selectedZone]?.theme}
                    </small>
                  </div>
                ) : (
                  <div className="border-selection-fields" style={{ marginBottom: 10 }}>
                    <div className="field" style={{ marginBottom: 8 }}>
                      <label>First Realm (Zone A)</label>
                      <select
                        value={borderZoneA}
                        onChange={(e) => { setBorderZoneA(e.target.value as CursedZoneId); setPreview(null); }}
                      >
                        <option value="the_gloaming">The Gloaming (CS1)</option>
                        <option value="red_sands">The Red Sands (CS2)</option>
                        <option value="midnight_sun">The Isles of Andrik (CS3)</option>
                        <option value="river_of_night">The Black River (CS4)</option>
                        <option value="dwellers_in_the_deep">Morzomotha (CS5)</option>
                        <option value="city_of_masks">The City of Masks (CS6)</option>
                      </select>
                    </div>
                    <div className="field" style={{ marginBottom: 8 }}>
                      <label>Second Realm (Zone B)</label>
                      <select
                        value={borderZoneB}
                        onChange={(e) => { setBorderZoneB(e.target.value as CursedZoneId); setPreview(null); }}
                      >
                        <option value="red_sands">The Red Sands (CS2)</option>
                        <option value="the_gloaming">The Gloaming (CS1)</option>
                        <option value="midnight_sun">The Isles of Andrik (CS3)</option>
                        <option value="river_of_night">The Black River (CS4)</option>
                        <option value="dwellers_in_the_deep">Morzomotha (CS5)</option>
                        <option value="city_of_masks">The City of Masks (CS6)</option>
                      </select>
                    </div>

                    {pairing ? (
                      <div className="field" style={{ marginBottom: 8 }}>
                        <label>Border Connection Mode</label>
                        <select
                          value={borderConnection}
                          onChange={(e) => { setBorderConnection(e.target.value); setPreview(null); }}
                        >
                          {pairing.supportedConnections.map((c) => (
                            <option key={c} value={c}>
                              {c.toUpperCase()} {c === pairing.recommendedConnection ? "(Recommended)" : ""}
                            </option>
                          ))}
                        </select>
                        <small style={{ display: "block", marginTop: 4, opacity: 0.75 }}>
                          {pairing.transitionMechanism}
                        </small>
                      </div>
                    ) : (
                      <div className="form-error" style={{ marginBottom: 8 }}>
                        {borderZoneA === borderZoneB
                          ? "Please select two distinct realms for border crossing."
                          : "This realm pairing does not have a supported border connection."}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <Field
                    label="Seed (Optional)"
                    value={seed}
                    onChange={(s) => { setSeed(s); setPreview(null); }}
                    placeholder="e.g. review_0"
                  />
                  <div className="field">
                    <label>Season</label>
                    <select
                      value={season}
                      onChange={(e) => setSeason(e.target.value as any)}
                    >
                      <option value="spring">Spring</option>
                      <option value="summer">Summer</option>
                      <option value="autumn">Autumn</option>
                      <option value="winter">Winter</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={handlePreview}
                    disabled={previewLoading || (settingMode === "border" && !pairing)}
                    style={{ width: "100%" }}
                  >
                    {previewLoading ? "Generating Map Preview…" : "Preview Map Coherence"}
                  </button>
                  {previewError && <div className="form-error" style={{ marginTop: 6 }}>{previewError}</div>}
                  {preview && (
                    <div className="preview-card" style={{ marginTop: 8, padding: 10, borderRadius: 6, background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-border, #665)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: "var(--gold-light, #d8b870)" }}>Map Preview Ready</span>
                        <span style={{ fontSize: "0.8em", opacity: 0.8 }}>{preview.hexes?.length || 19} Hexes</span>
                      </div>
                      <div style={{ fontSize: "0.85em", lineHeight: 1.4 }}>
                        <div><strong>Haven:</strong> {preview.initial19PublicHexes?.find((h: any) => h.id === "00")?.landmark || "Sanctuary"}</div>
                        <div><strong>Sites:</strong> {preview.sites?.length || 0} locations · <strong>Routes:</strong> {preview.connections?.length || 0}</div>
                        {preview.validationReport?.zoneCounts && (
                          <div style={{ opacity: 0.8, marginTop: 4 }}>
                            Zones: {Object.entries(preview.validationReport.zoneCounts).map(([z, c]) => `${z.replace(/_/g, " ")}: ${c}`).join(", ")}
                          </div>
                        )}
                        <div style={{ color: preview.validationReport?.valid ? "#4caf50" : "#f44336", marginTop: 4, fontWeight: 500 }}>
                          {preview.validationReport?.valid ? "✓ Geographically Coherent & Valid" : `⚠ Validation warnings: ${preview.validationReport?.warnings?.join("; ")}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="field" style={{ marginTop: 12, marginBottom: 12 }}>
                  <label>Adventure Path Selection</label>
                  <select
                    value={pathMode}
                    onChange={(e) => setPathMode(e.target.value as "explicit" | "secret")}
                  >
                    <option value="explicit">The Mind Below (Authored Path)</option>
                    <option value="secret">Secret / System Selection (Concealed Omens)</option>
                  </select>
                  <small style={{ display: "block", marginTop: 4, opacity: 0.75 }}>
                    {pathMode === "secret"
                      ? "The adventure path is chosen secretly by the system. Identity, true objectives, and narrative tells are concealed from players and table displays."
                      : "Standard authored three-act campaign path."}
                  </small>
                </div>
              </div>
            </>
          )}
          {mode !== "create" && (
            <Field
              label="Six-character campaign code"
              value={form.code}
              onChange={(code) =>
                setForm({ ...form, code: code.toUpperCase() })
              }
              maxLength={6}
            />
          )}
          {mode !== "join" && (
            <Field
              label="Host PIN (4–8 digits)"
              value={form.pin}
              onChange={(pin) => setForm({ ...form, pin })}
              type="password"
              inputMode="numeric"
            />
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="primary wide" disabled={busy}>
            {busy
              ? "Opening…"
              : mode === "create"
                ? "Create the campaign"
                : mode === "join"
                  ? "Join the table"
                  : "Open host console"}
            <ChevronRight size={18} />
          </button>
        </form>
        <p className="local-note">
          <CircleDot size={14} /> Campaign data stays on this computer.
        </p>
      </section>
    </main>
  );
}

function Campaign({
  state,
  socket,
  connection,
  leave,
}: {
  state: CampaignState;
  socket: Socket;
  connection: string;
  leave: () => void;
}) {
  const [tab, setTab] = useState<Tab>(
    state.me.role === "player" && !state.me.characterId
      ? "party"
      : state.activeCombat && state.activeCombat.status === "active"
        ? "map"
        : state.campaign.phase === "dungeon" || state.activeDungeon
          ? "dungeon"
          : state.campaign.phase === "sanctuary"
            ? "sanctuary"
            : "map",
  );
  const [menu, setMenu] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showLootModal, setShowLootModal] = useState(false);
  const [rollModalContext, setRollModalContext] = useState<{
    open: boolean;
    charId?: number;
    ability?: string;
    type?: string;
    advantage?: "normal" | "advantage" | "disadvantage";
  } | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showCodexModal, setShowCodexModal] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [directoryHex, setDirectoryHex] = useState<string>();
  const [mapFocus, setMapFocus] = useState<{ id: string; revision: number }>({ id: "00", revision: 0 });
  const openDirectory = (hexId?: string) => { setDirectoryHex(hexId); setShowDirectoryModal(true); };
  const [toast, setToast] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCodexModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pendingActions = useRef(new Set<string>());
  const revision = useRef(state.campaign.revision ?? 0);
  revision.current = Math.max(revision.current, state.campaign.revision ?? 0);
  const emit = <T,>(event: string, payload: unknown = {}) =>
    new Promise<T>((resolve, reject) =>
      socket.emit(
        event,
        payload,
        (response: { ok: boolean; error?: string } & T) =>
          response.ok
            ? resolve(response)
            : reject(new Error(response.error ?? "Action failed")),
      ),
    );
  const act: Act = async <T,>(
    event: string,
    payload: unknown = {},
    success?: string,
  ) => {
    const receipted = RECEIPTED_ACTIONS.has(event);
    const pendingKey = `${event}:${JSON.stringify(payload)}`;
    let ownsPending = false;
    try {
      if (!socket.connected) throw new Error("Reconnect before taking an action.");
      if (pendingActions.current.has(pendingKey)) throw new Error("This action is still pending.");
      pendingActions.current.add(pendingKey);
      ownsPending = true;
      const request = receipted ? {
        ...(payload as Record<string, unknown>),
        actionId: createActionId(),
        expectedRevision: revision.current,
      } : payload;
      const result = receipted
        ? await sendMutation<T>(socket, event, request)
        : await emit<T>(event, payload);
      if (receipted && typeof (result as { revision?: number }).revision === "number") {
        revision.current = Math.max(revision.current, (result as { revision: number }).revision);
      }

      if (success) {
        setToast(success);
        setTimeout(() => setToast(""), 3000);
      }

      return result as any;
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Action failed");
      setTimeout(() => setToast(""), 3500);
      throw reason;
    } finally {
      if (ownsPending) pendingActions.current.delete(pendingKey);
    }
  };

  const hasDungeon = Boolean(
    state.campaign.phase === "dungeon" || state.activeDungeon,
  );

  const nav: [Tab, any, string][] = [
    ["sanctuary", Castle, "Sanctuary"],
    ["map", Map, "Frontier"],
    ...(hasDungeon ? [["dungeon", DoorOpen, "Dungeon"] as [Tab, any, string]] : []),
    ["oracle", Dices, "Oracle"],
    ["chronicle", BookOpen, "Chronicle"],
  ];

  return (
    <div className="campaign-shell">
      <header className="app-header">
        <button
          className="mobile-menu icon-button"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <Brand />
        <div className="campaign-title">
          <strong>{state.campaign.name}</strong>
          <small>
            {state.campaign.regionName} · Act {state.campaign.act}
          </small>
        </div>
        <div className={`connection ${connection}`}>
          <i />
          {connection}
        </div>
        <button
          className="code-chip"
          onClick={() => {
            navigator.clipboard.writeText(state.campaign.code);
            setToast("Campaign code copied");
          }}
        >
          <span>TABLE CODE</span>
          <b>{state.campaign.code}</b>
          <Copy size={14} />
        </button>
        <button
          className="btn-hig"
          style={{ padding: "4px 10px", fontSize: "12px", gap: "4px" }}
          onClick={() => openDirectory()}
          title="Living World Directory: Facilities, NPCs, and Tavern Rumors"
        >
          👥 Directory
        </button>
        <button
          className="btn-hig"
          style={{ padding: "4px 10px", fontSize: "12px", gap: "4px" }}
          onClick={() => setShowCodexModal(true)}
          title="Instant Table Codex & Rules (⌘K / Ctrl+K)"
        >
          📖 Codex
        </button>
        <button
          className="btn-hig"
          style={{ padding: "4px 10px", fontSize: "12px", gap: "4px" }}
          onClick={() => setShowPartyModal(true)}
          title="Party Roster & Inventory Ledger"
        >
          🎒 Party Ledger
        </button>
        <button className="icon-button" onClick={leave}>
          <LogOut size={18} />
        </button>
      </header>

      <CampaignSubbar
        state={state}
        act={act}
        onOpenZone={() => setShowZoneModal(true)}
        onOpenLoot={() => setShowLootModal(true)}
        onPhaseChange={(phase) => {
          if (phase === "sanctuary") setTab("sanctuary");
          if (phase === "hexcrawl") setTab("map");
          if (phase === "dungeon") setTab("dungeon");
        }}
      />

      <nav className={menu ? "app-nav open" : "app-nav"}>
        {nav.map(([key, Icon, text]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setMenu(false);
            }}
          >
            <Icon size={18} />
            <span>{text}</span>
          </button>
        ))}
      </nav>
      <section className="main-content">
        {!state.campaign.started ? (
          tab === "party" ? (
            <PartyView state={state} act={act} />
          ) : (
            <LobbyView state={state} act={act} onOpenParty={() => setShowPartyModal(true)} />
          )
        ) : tab === "sanctuary" ? (
          <SanctuaryView state={state} act={act} />
        ) : tab === "oracle" ? (
          <OracleView state={state} act={act} />
        ) : tab === "chronicle" ? (
          <ChronicleView state={state} act={act} socket={socket} />
        ) : (
          <TableCompanionLayout
            map={
              <>
                <div className="companion-actions">
                  <button className={tab !== "dungeon" ? "active" : ""} onClick={() => setTab("map")}>
                    Map
                  </button>
                  {hasDungeon && (
                    <button className={tab === "dungeon" ? "active" : ""} onClick={() => setTab("dungeon")}>
                      Current site
                    </button>
                  )}
                </div>
                {tab === "dungeon" ? (
                  <DungeonView state={state} act={act} />
                ) : (
                  <MapView state={state} act={act} focus={mapFocus} onDirectory={openDirectory} />
                )}
              </>
            }
            encounter={<CombatView state={state} act={act} />}
            players={
              <PlayerDashboard
                state={state}
                act={act}
                onLedger={() => setShowPartyModal(true)}
              />
            }
          />
        )}
      </section>

      {showPartyModal && (
        <Modal title="Party Roster & Inventory Ledger" onClose={() => setShowPartyModal(false)}>
          <PartyView state={state} act={act} />
        </Modal>
      )}

      {showZoneModal && (
        <ZoneDossierModal
          state={state}
          act={act}
          onClose={() => setShowZoneModal(false)}
        />
      )}

      {showLootModal && (
        <TreasureModal
          rewards={state.rewards ?? []}
          characters={state.characters}
          act={act}
          onClose={() => setShowLootModal(false)}
        />
      )}

      <CodexModal
        state={state}
        isOpen={showCodexModal}
        onClose={() => setShowCodexModal(false)}
      />

      <DirectoryModal isOpen={showDirectoryModal} onClose={() => setShowDirectoryModal(false)} state={state} act={act} hexId={directoryHex}
        onMap={id => { setMapFocus(previous => ({ id, revision: previous.revision + 1 })); setTab("map"); setShowDirectoryModal(false); }}/>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CampaignSubbar({
  state,
  act,
  onOpenZone,
  onOpenLoot,
  onPhaseChange,
}: {
  state: CampaignState;
  act: Act;
  onOpenZone: () => void;
  onOpenLoot: () => void;
  onPhaseChange?: (phase: string) => void;
}) {
  const phases = [
    { id: "sanctuary", label: "Sanctuary", icon: "🏰" },
    { id: "hexcrawl", label: "Hexcrawl", icon: "🌲" },
    { id: "dungeon", label: "Dungeon", icon: "🗝️" },
  ] as const;

  const watchNames = {
    1: "Morning",
    2: "Afternoon",
    3: "Evening",
    4: "Night",
  };
  const currentWatch = (state.campaign.watch ?? 1) as 1 | 2 | 3 | 4;
  const fatiguedChars = state.characters.filter((c) => (c.fatigue ?? 0) > 0);

  const isCaller = Boolean(state.me.isCaller || state.me.role === "host");
  const callerChar = state.characters.find(
    (c) => c.ownerToken && c.ownerToken === state.campaign.callerToken
  );
  const unclaimedLoot = (state.rewards ?? []).filter((r) => !r.claimed);

  return (
    <div className="campaign-subbar">
      <div className="subbar-group">
        <span className="subbar-label">PLAY PHASE</span>
        <div className="phase-pills">
          {phases.map((p) => {
            const active = state.campaign.phase === p.id;
            return state.me.role === "host" ? (
              <button
                key={p.id}
                className={`phase-pill-btn ${active ? "active" : ""}`}
                onClick={() => {
                  act(
                    "phase:transition",
                    { phase: p.id },
                    `Phase transition: ${p.label}`,
                  );
                  onPhaseChange?.(p.id);
                }}
              >
                <span>{p.icon}</span>
                <b>{p.label}</b>
              </button>
            ) : (
              <div
                key={p.id}
                className={`phase-pill-badge ${active ? "active" : "inactive"}`}
              >
                <span>{p.icon}</span>
                <b>{p.label}</b>
              </div>
            );
          })}
        </div>
      </div>

      <div className="subbar-group caller-group">
        <div className={`caller-chip ${isCaller ? "is-caller" : ""}`}>
          <Users size={14} />
          {isCaller ? (
            <span className="caller-badge-you">CALLER (YOU)</span>
          ) : (
            <span style={{ fontSize: "11px" }}>
              Caller: <b>{callerChar ? callerChar.name : state.campaign.callerToken ? "Assigned" : "Host"}</b>
            </span>
          )}
          {state.me.role === "host" && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <select
                className="caller-select-dropdown"
                value={state.campaign.callerToken ?? ""}
                onChange={(e) =>
                  act(
                    "campaign:set_caller",
                    { callerToken: e.target.value || null },
                    "Caller assigned",
                  )
                }
                title="Assign Authoritative Caller"
              >
                <option value="">Host Default</option>
                {state.characters.map((c) => (
                  <option key={c.id} value={c.ownerToken ?? ""}>
                    {c.name} ({c.className})
                  </option>
                ))}
              </select>
              {state.campaign.callerToken && (
                <button
                  type="button"
                  className="caller-override-btn"
                  onClick={() =>
                    act(
                      "campaign:set_caller",
                      { callerToken: null },
                      "Host took direct Caller authority",
                    )
                  }
                  title="Instantly revoke player caller and claim host direct authority"
                >
                  ⚡ Host Override
                </button>
              )}
            </div>
          )}
          {state.me.role !== "host" && (
            !state.campaign.callerToken ? (
              <button
                type="button"
                className="small-btn"
                style={{ fontSize: "10px", padding: "2px 6px" }}
                onClick={() =>
                  act(
                    "campaign:set_caller",
                    { callerToken: state.me.token },
                    "Claimed Caller role",
                  )
                }
                title="Claim Caller role for the party"
              >
                Claim Caller
              </button>
            ) : state.campaign.callerToken === state.me.token ? (
              <button
                type="button"
                className="small-btn"
                style={{ fontSize: "10px", padding: "2px 6px" }}
                onClick={() =>
                  act(
                    "campaign:set_caller",
                    { callerToken: null },
                    "Released Caller role",
                  )
                }
                title="Release Caller role back to table"
              >
                Release Caller
              </button>
            ) : null
          )}
        </div>

        {unclaimedLoot.length > 0 && (
          <button className="small-btn loot-alert-btn" onClick={onOpenLoot} title="Treasure Awaiting Allocation">
            <span>💰</span>
            <span>Loot ({unclaimedLoot.length})</span>
          </button>
        )}
      </div>

      <div className="subbar-group expedition-clock-widget">
        <div className="clock-chip" title="4-Watch Expedition Clock">
          <span className="clock-icon">⏳</span>
          <span>Day {state.campaign.day ?? 1} · Watch {currentWatch} ({watchNames[currentWatch]})</span>
          {currentWatch === 4 && (
            <span className="forced-march-badge">⚠️ Forced March Risk</span>
          )}
        </div>
        <div className="clock-chip weather-chip" title="Dawn Weather Condition">
          <span>🌤️</span>
          <span>{state.campaign.weather ?? "Overcast / Mild Breeze"}</span>
        </div>
        <div className="clock-chip rations-chip" title="Party Iron Rations">
          <span>🍞</span>
          <span>{state.campaign.rations ?? 12} Rations</span>
        </div>
        {state.campaign.activeObjective && (
          <div className="clock-chip objective-chip" title={state.campaign.activeObjective.notes || ""}>
            <span>🎯</span>
            <span className="objective-title">Obj: {state.campaign.activeObjective.title}</span>
          </div>
        )}
        {fatiguedChars.length > 0 && (
          <div className="clock-chip fatigue-chip" title="Fatigued Party Members">
            <span>😫</span>
            <span>{fatiguedChars.map((c) => `${c.name} (F${c.fatigue})`).join(", ")}</span>
          </div>
        )}
      </div>

      <div className="subbar-group right">
        <button className="zone-dossier-btn" onClick={onOpenZone}>
          <Compass size={15} />
          <span className="zone-chip-label">ZONE</span>
          <strong>{state.activeZone?.name ?? "The Gloaming"}</strong>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ZoneDossierModal({
  state,
  act,
  onClose,
}: {
  state: CampaignState;
  act: Act;
  onClose: () => void;
}) {
  const zone = state.activeZone;
  const available = state.availableZones ?? [];
  const [targetZone, setTargetZone] = useState(
    state.campaign.activeZoneId ?? "the_gloaming",
  );

  const switchZone = async () => {
    if (targetZone === state.campaign.activeZoneId) return;
    await act(
      "zone:enter",
      { zoneId: targetZone },
      "Traveled to regional zone",
    );
    onClose();
  };

  const returnSanctuary = async () => {
    await act("zone:exit", {}, `Returned to ${state.activeZone?.name ?? "sanctuary"}`);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel zone-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">Thematic Regional Zone</div>
            <h2>{zone?.name ?? "The Frontier"}</h2>
            <p className="zone-theme">{zone?.theme}</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="zone-modal-content">
          <div className="zone-stat-strip">
            <div>
              <span>Biomes</span>
              <b>{zone?.biomePalette.join(", ") || "Wilderness"}</b>
            </div>
            <div>
              <span>Entry Gateway</span>
              <b>{zone?.entryConditions || "Open border"}</b>
            </div>
            <div>
              <span>Exit Route</span>
              <b>{zone?.exitConditions || "Retrace steps"}</b>
            </div>
          </div>

          {zone?.factions && zone.factions.length > 0 && (
            <div className="zone-section">
              <h3>Regional Factions & Powers</h3>
              <div className="faction-grid">
                {zone.factions.map((f) => (
                  <div
                    key={f.name}
                    className={`faction-card ${f.disposition.toLowerCase()}`}
                  >
                    <div className="faction-head">
                      <strong>{f.name}</strong>
                      <span
                        className={`disposition-tag ${f.disposition.toLowerCase()}`}
                      >
                        {f.disposition}
                      </span>
                    </div>
                    <p>{f.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="zone-two-col">
            {zone?.hazardTable && zone.hazardTable.length > 0 && (
              <div className="zone-section">
                <h3>Environmental Hazards</h3>
                <ul>
                  {zone.hazardTable.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {zone?.weatherTable && zone.weatherTable.length > 0 && (
              <div className="zone-section">
                <h3>Regional Weather Patterns</h3>
                <ul>
                  {zone.weatherTable.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {zone?.uniqueFloraFauna && zone.uniqueFloraFauna.length > 0 && (
            <div className="zone-section">
              <h3>Unique Flora & Fauna</h3>
              <div className="flora-chips">
                {zone.uniqueFloraFauna.map((item, i) => (
                  <span key={i} className="flora-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {state.me.role === "host" && (
            <div className="zone-travel-controls">
              <div className="eyebrow">Expedition Navigation (Host Only)</div>
              <div className="inline-fields">
                <select
                  value={targetZone}
                  onChange={(e) => setTargetZone(e.target.value)}
                >
                  {available.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.biomePalette.slice(0, 2).join(", ")})
                    </option>
                  ))}
                </select>
                <button className="primary" onClick={switchZone}>
                  Travel to Zone
                </button>
                <button onClick={returnSanctuary}
                  disabled={state.campaign.partyLocation?.q !== (state.campaign.homeLocation?.q ?? 0) ||
                    state.campaign.partyLocation?.r !== (state.campaign.homeLocation?.r ?? 0) ||
                    (state.campaign.partyLocation?.layerId ?? "surface") !== (state.campaign.homeLocation?.layerId ?? "surface") ||
                    Boolean(state.campaign.activeSiteId)}
                  title="Travel to the haven before returning to sanctuary">Return to Sanctuary</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TavernSessionCard({ state, act }: { state: CampaignState; act: Act }) {
  const session = state.activeSession?.kind === "tavern" ? state.activeSession : null;
  const isCaller = Boolean(state.me.isCaller || state.me.role === "host");
  const ownChar = state.characters.find((c) => c.id === state.me.characterId) ?? (state.me.role === "host" ? state.characters[0] : null);

  const [selectedCharId, setSelectedCharId] = useState<number>(ownChar?.id ?? state.characters[0]?.id ?? 0);
  const [activity, setActivity] = useState<"rest" | "rumors" | "carouse" | "supplies">("rest");
  const [costGp, setCostGp] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<string>("torch");

  useEffect(() => {
    if (activity === "rest") setCostGp(1);
    else if (activity === "carouse") setCostGp(5);
    else if (activity === "rumors") setCostGp(0);
    else if (activity === "supplies") {
      const def = ITEMS.find((i) => i.id === selectedItem);
      setCostGp(def?.costGp ?? 1);
    }
  }, [activity, selectedItem]);

  const submitChoice = async () => {
    if (!selectedCharId) return;
    await act(
      "tavern:submit_choice",
      {
        characterId: selectedCharId,
        activity,
        costGp,
        items: activity === "supplies" ? [selectedItem] : undefined,
      },
      "Tavern activity submitted",
    );
  };

  const resolveTavern = async () => {
    await act("tavern:resolve", {}, "Tavern gathering concluded!");
  };

  const openTavern = async () => {
    await act("tavern:open", {}, "Tavern gathering commenced!");
  };

  return (
    <article className="sub-panel tavern-session-card full-width" style={{ border: "1px solid var(--ember)", marginBottom: "16px" }}>
      <div className="sub-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow">Downtime Gathering</div>
          <h3>Haven Bastion Taproom Gathering</h3>
        </div>
        {(!session || session.status === "resolved") && isCaller && (
          <button className="primary small-btn" onClick={openTavern}>
            <Sparkles size={14} /> Open Tavern Gathering
          </button>
        )}
      </div>

      {session && session.status === "open" && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="badge-tag" style={{ background: "var(--ember)", color: "#000", fontWeight: "bold" }}>
              SESSION ACTIVE · GATHERING CHOICES
            </span>
            {isCaller && (
              <button className="primary small-btn" onClick={resolveTavern}>
                Conclude Gathering & Apply Results
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
                        ✓ {choice.activity.toUpperCase()}{choice.costGp ? ` (-${choice.costGp} GP)` : ""}
                      </span>
                    ) : (
                      <span>Waiting for choice…</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: "6px", padding: "12px", marginTop: "12px" }}>
            <div className="eyebrow" style={{ marginBottom: "8px" }}>Choose Your Downtime Activity</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {state.me.role === "host" && (
                <select
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(Number(e.target.value))}
                  style={{ padding: "6px 8px", fontSize: "13px" }}
                >
                  {state.characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.gold} GP)</option>
                  ))}
                </select>
              )}
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value as any)}
                style={{ padding: "6px 8px", fontSize: "13px" }}
              >
                <option value="rest">🛌 Rest & Recuperate (1 GP: +1 HP & Spells)</option>
                <option value="carouse">🍺 Carouse (5 GP: +10 XP)</option>
                <option value="supplies">🎒 Procure Supplies (Expedition Gear)</option>
                <option value="rumors">📜 Rumor Gathering (Free)</option>
              </select>

              {activity === "supplies" && (
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  style={{ padding: "6px 8px", fontSize: "13px" }}
                >
                  <option value="torch">Torch (1 GP, 1 slot)</option>
                  <option value="iron_rations">Iron Rations (2 GP, 1 slot)</option>
                  <option value="rope_hemp">Hemp Rope (1 GP, 1 slot)</option>
                  <option value="lantern">Lantern (5 GP, 1 slot)</option>
                  <option value="oil_flask">Flask of Oil (1 GP, 1 slot)</option>
                </select>
              )}

              <button className="primary small-btn" onClick={submitChoice}>
                Submit Activity ({costGp} GP)
              </button>
            </div>
          </div>
        </div>
      )}

      {session && session.status === "resolved" && session.result?.logs && (
        <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--muted)" }}>
          <div className="eyebrow" style={{ marginBottom: "4px" }}>Last Gathering Resolution:</div>
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

function LobbyView({
  state,
  act,
  onOpenParty,
}: {
  state: CampaignState;
  act: Act;
  onOpenParty: () => void;
}) {
  const isHost = state.me.role === "host";
  const myToken = state.me.token;
  const myOwned = state.characters.filter(
    (c) => (c.ownerToken && c.ownerToken === myToken) || c.id === state.me.characterId,
  );
  const readiness = state.campaign.tableReadiness ?? {
    totalPlayers: 0,
    readyPlayers: 0,
    allReady: false,
  };
  const isReady = Boolean(state.me.ready);

  const toggleReady = () => {
    act("table:ready", { ready: !isReady }, !isReady ? "Marked ready for expedition" : "Readiness cleared");
  };

  const startCampaign = () => {
    act("campaign:start", {}, "Campaign started! Venturing into the Gloaming...");
  };

  return (
    <div className="lobby-page" style={{ padding: "1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      <div className="lobby-banner" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--line)", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="eyebrow">Table Preparation & Setup</div>
            <h1 style={{ margin: "0.25rem 0" }}>{state.campaign.name}</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Region: <b>{state.campaign.regionName}</b> · Phase: <b>Table Setup</b>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className="code-chip" style={{ fontSize: "1.2rem", padding: "0.5rem 1rem" }}>
              <span>JOIN CODE</span>
              <b>{state.campaign.code}</b>
            </div>
          </div>
        </div>

        <LanDiscoveryPanel state={state} />
      </div>

      {/* Adventure Path Info */}
      <div className="lobby-path-card" style={{ background: "rgba(79, 140, 201, 0.08)", border: "1px solid #4f8cc9", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="eyebrow" style={{ color: "#4f8cc9" }}>
          {state.campaign.isSecretPath ? "Secret Adventure Path Selection" : "Authored Adventure Path"}
        </div>
        <h3 style={{ margin: "0.25rem 0 0.5rem" }}>
          {state.campaign.adventurePath?.name ?? "The Mind Below"}
        </h3>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)" }}>
          {state.campaign.isSecretPath
            ? "The true identity, master, and climactic destination of this adventure path have been chosen secretly by the table assistant. Spoiler details remain hidden until uncovered through exploration and rumors."
            : "A multi-act campaign confronting sinister subterranean influences rising toward the surface."}
        </p>
      </div>

      {/* Table Participants & Roster Readiness */}
      <div className="lobby-participants" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div>
            <h3 style={{ margin: 0 }}>Company Roster & Readiness</h3>
            <small style={{ color: "var(--muted)" }}>
              {readiness.totalPlayers === 0
                ? "No separate player devices joined yet"
                : `${readiness.readyPlayers} of ${readiness.totalPlayers} player${readiness.totalPlayers === 1 ? "" : "s"} ready`}
            </small>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {state.me.role === "player" && (
              <button
                className={`small-btn ${isReady ? "primary" : ""}`}
                onClick={toggleReady}
              >
                {isReady ? "✓ Ready (Click to toggle)" : "⏳ Mark Ready"}
              </button>
            )}
            <button className="small-btn" onClick={onOpenParty}>
              <Users size={14} /> Open Company Sheet
            </button>
          </div>
        </div>

        <div className="character-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {state.characters.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--line)", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 1rem", color: "var(--muted)" }}>No adventurers have stepped forward yet.</p>
              <button className="primary" onClick={onOpenParty}>
                <Plus size={16} /> Create First Character
              </button>
            </div>
          ) : (
            state.characters.map((c) => (
              <article
                key={c.id}
                className="panel character-card"
                style={{
                  border: c.rosterStatus === "active" ? "1px solid var(--ember)" : "1px solid var(--line)",
                  background: c.rosterStatus === "active" ? "rgba(217, 117, 56, 0.06)" : "rgba(255, 255, 255, 0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span
                    className="badge-tag"
                    style={{
                      background: c.rosterStatus === "active" ? "var(--ember)" : "var(--muted)",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: "11px",
                    }}
                  >
                    {c.rosterStatus === "reserve" ? "RESERVE" : "ACTIVE"}
                  </span>
                  {c.generationMethod && (
                    <span className="badge-tag" style={{ fontSize: "10px", opacity: 0.8 }}>
                      {c.generationMethod === "unearthed_arcana" ? "UA METHOD" : "IRON MAN"}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: "0 0 4px" }}>{c.name}</h3>
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--muted)" }}>
                  Level {c.level} · {c.ancestry} {c.className}
                  {c.originZoneId ? ` · Origin: ${c.originZoneId.replace(/_/g, " ")}` : ""}
                </p>
                <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                  <span>HP: <b>{c.hp}/{c.maxHp}</b></span>
                  <span>AC: <b>{c.ac}</b></span>
                  <span>STR: <b>{c.abilities.str}</b></span>
                  <span>DEX: <b>{c.abilities.dex}</b></span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {/* Start Campaign Action */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: "8px", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h4 style={{ margin: 0 }}>Start Expedition</h4>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
            {isHost
              ? readiness.allReady || readiness.totalPlayers === 0
                ? "All participating players are ready. Starting commits the campaign world and opens the Gloaming Sanctuary."
                : `Waiting for ${readiness.totalPlayers - readiness.readyPlayers} player(s) to mark ready.`
              : isReady
                ? "You are marked ready. Waiting for host to start."
                : "Mark yourself ready when your characters are created."}
          </p>
        </div>
        {isHost && (
          <button
            className="primary"
            style={{ padding: "0.75rem 1.5rem", fontSize: "15px", fontWeight: "bold" }}
            onClick={startCampaign}
            disabled={readiness.totalPlayers > 0 && !readiness.allReady}
          >
            Start Campaign
          </button>
        )}
      </div>
    </div>
  );
}

function SanctuaryView({ state, act }: { state: CampaignState; act: Act }) {
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [npc, setNpc] = useState<NpcResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [retainerName, setRetainerName] = useState("");

  const generateSettlementAction = async () => {
    setBusy(true);
    try {
      const res = await act<{ result: SettlementResult }>(
        "settlement:generate",
        {},
        "Settlement consulted via City Oracle",
      );
      if (res?.result) setSettlement(res.result);
    } finally {
      setBusy(false);
    }
  };

  const generateNpcAction = async (classed = false) => {
    setBusy(true);
    try {
      const res = await act<{ result: NpcResult }>(
        "npc:generate",
        { zoneId: state.campaign.activeZoneId, classed },
        classed ? "Dungeon NPC rolled" : "Classless retainer rolled",
      );
      if (res?.result) {
        setNpc(res.result);
        setRetainerName(
          res.result.name || `${res.result.ancestry} ${res.result.className}`,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const hireRetainer = async () => {
    if (!npc) return;
    await act(
      "retainer:hire",
      {
        name: retainerName || `${npc.ancestry} ${npc.className}`,
        ancestry: npc.ancestry,
        className: npc.zoneSubclass || npc.className,
        level: npc.retainerStats.level,
        hp: npc.retainerStats.hp,
        morale: npc.retainerStats.morale,
        dailyWage: npc.retainerStats.dailyWage,
        notes: `${npc.demeanor} (${npc.quirk}). Motive: ${npc.motive}`,
        abilities: npc.abilities,
      },
      `${retainerName} hired into the adventuring company!`,
    );
    setNpc(null);
  };

  const saveSettlementToNotes = async () => {
    if (!settlement) return;
    await act(
      "note:add",
      {
        section: "discovery",
        title: `${settlement.scale.name}: ${settlement.tavern.name}`,
        body: `Scale: ${settlement.scale.name} (Pop: ${settlement.scale.population}, Defenses: ${settlement.scale.defense}, Services: ${settlement.scale.services})\nTavern: ${settlement.tavern.name} (${settlement.tavern.vibe})\nTaproom Rumor: "${settlement.rumor.rumor}" (Authenticity: ${settlement.rumor.authenticity})`,
      },
      "Settlement recorded to Campaign Chronicle",
    );
  };

  return (
    <div className="sanctuary-page surface-grid">
      <section className="panel sanctuary-main">
        <Title
          eyebrow="Civilized Bastion & Downtime"
          title="Sanctuary Hub"
          aside={state.campaign.regionName}
        />

        <div className="sanctuary-hero-banner">
          <p>
            Between expeditions, the adventuring company recovers in sanctuary.
            Procure supplies, hire retainers, carouse for rumors, and consult the
            city oracle.
          </p>
          {(state.me.role === "host" || state.me.isCaller) && (
            <button
              disabled={state.campaign.partyLocation?.q !== (state.campaign.homeLocation?.q ?? 0) ||
                state.campaign.partyLocation?.r !== (state.campaign.homeLocation?.r ?? 0) ||
                (state.campaign.partyLocation?.layerId ?? "surface") !== (state.campaign.homeLocation?.layerId ?? "surface") ||
                Boolean(state.campaign.activeSiteId)}
              className="primary rest-btn"
              onClick={() =>
                act("session:return_sanctuary", {}, "Party recovered at the haven")
              }
            >
              <Heart size={16} /> Full Party Rest & Recovery
            </button>
          )}
        </div>

        <div className="sanctuary-grid">
          {/* Haven Bastion Taproom Downtime Session */}
          <TavernSessionCard state={state} act={act} />

          {/* Haven Bastion Taproom & Grounded Leads */}
          {state.campaign.tavernEstablishment && (
            <article className="sub-panel tavern-establishment-card full-width">
              <div className="sub-panel-header">
                <div>
                  <div className="eyebrow">Haven Bastion Taproom</div>
                  <h3>{state.campaign.tavernEstablishment.name}</h3>
                  <p className="tavern-submeta" style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                    <b>Vibe:</b> {state.campaign.tavernEstablishment.vibe} · <b>Barkeep:</b> {state.campaign.tavernEstablishment.barkeep}
                  </p>
                </div>
              </div>

              {state.campaign.activeObjective && (
                <div className="active-objective-banner" style={{ background: "rgba(217, 117, 56, 0.12)", border: "1px solid var(--ember)", borderRadius: "6px", padding: "12px", margin: "12px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="badge-tag active-obj-tag" style={{ background: "var(--ember)", color: "#000", fontWeight: "bold" }}>CURRENT EXPEDITION OBJECTIVE</span>
                    {state.me.role === "host" && (
                      <button
                        className="small-btn"
                        onClick={() => act("expedition:select_objective", { title: "" }, "Objective cleared")}
                      >
                        Clear Objective
                      </button>
                    )}
                  </div>
                  <h4 style={{ margin: "6px 0 2px", color: "var(--ember)" }}>{state.campaign.activeObjective.title}</h4>
                  <p style={{ margin: "0 0 6px", fontSize: "13px" }}>{state.campaign.activeObjective.notes || ""}</p>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--muted)" }}>
                    {state.campaign.activeObjective.directionHint && (
                      <span><b>Heading:</b> {state.campaign.activeObjective.directionHint}</span>
                    )}
                    {state.campaign.activeObjective.targetHexId && (
                      <span><b>Target Hex:</b> {state.campaign.activeObjective.targetHexId}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="leads-section" style={{ marginTop: "12px" }}>
                <div className="eyebrow" style={{ marginBottom: "8px" }}>Tavern Intel & Grounded Leads</div>
                <div className="leads-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                  {state.campaign.tavernEstablishment.leads.map((lead) => {
                    const isCurrentObj = state.campaign.activeObjective?.leadId === lead.id || state.campaign.activeObjective?.title === lead.title;
                    return (
                      <div
                        key={lead.id}
                        className={`lead-card ${lead.isPathLead ? "path-lead" : ""} ${isCurrentObj ? "active-lead" : ""}`}
                        style={{
                          background: isCurrentObj ? "rgba(217, 117, 56, 0.15)" : lead.isPathLead ? "rgba(79, 140, 201, 0.12)" : "rgba(255, 255, 255, 0.04)",
                          border: isCurrentObj ? "1px solid var(--ember)" : lead.isPathLead ? "1px solid #4f8cc9" : "1px solid var(--line)",
                          borderRadius: "6px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          {lead.isPathLead ? (
                            <span className="badge-tag" style={{ background: "#4f8cc9", color: "#fff", fontSize: "10px" }}>🧭 ADVENTURE PATH</span>
                          ) : lead.isFollowUp ? (
                            <span className="badge-tag" style={{ background: "#9d4edd", color: "#fff", fontSize: "10px" }}>⭐ FOLLOW-UP INTEL</span>
                          ) : (
                            <span className="badge-tag" style={{ fontSize: "10px" }}>REGIONAL LEAD</span>
                          )}
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{lead.source}</span>
                        </div>
                        <h4 style={{ margin: "0", fontSize: "14px" }}>{lead.title}</h4>
                        <p style={{ margin: "0", fontSize: "13px", fontStyle: "italic", color: "var(--ink)" }}>“{lead.claim}”</p>
                        <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {lead.directionHint && <div><b>Direction:</b> {lead.directionHint}</div>}
                          {lead.dangerHint && <div><b>Hazards:</b> {lead.dangerHint}</div>}
                          {lead.preparationHint && <div><b>Preparation:</b> {lead.preparationHint}</div>}
                        </div>
                        <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                          {isCurrentObj ? (
                            <span style={{ color: "var(--ember)", fontWeight: "bold", fontSize: "12px" }}>✓ Selected Expedition Objective</span>
                          ) : (
                            <button
                              className="small-btn primary wide"
                              onClick={() =>
                                act(
                                  "expedition:select_objective",
                                  {
                                    leadId: lead.id,
                                    title: lead.title,
                                    targetHexId: lead.targetHexId,
                                    targetSiteId: lead.targetSiteId,
                                    directionHint: lead.directionHint,
                                    notes: lead.claim,
                                  },
                                  `Selected objective: ${lead.title}`,
                                )
                              }
                            >
                              Set as Active Objective
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          )}

          {/* Starting Tavern Leads (2 Path + 1 Unrelated) */}
          {((state.tavernLeads ?? state.campaign.tavernLeads) ?? []).length > 0 && (
            <article className="sub-panel full-width" style={{ marginTop: "12px", border: "1px solid var(--line)" }}>
              <div className="sub-panel-header">
                <div>
                  <div className="eyebrow" style={{ color: "var(--ember)" }}>Tavern Peat-Smoke Whispers</div>
                  <h3>Expedition Leads & Starting Rumors</h3>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginTop: "12px" }}>
                {(state.tavernLeads ?? state.campaign.tavernLeads ?? []).map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid var(--line)",
                      borderLeft: `4px solid ${
                        lead.leadType === "path_primary"
                          ? "var(--ember)"
                          : lead.leadType === "path_secondary"
                          ? "#2563EB"
                          : "#7C3AED"
                      }`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span
                        className="badge-tag"
                        style={{
                          fontSize: "10px",
                          background: lead.leadType === "path_primary" ? "rgba(217, 117, 56, 0.2)" : lead.leadType === "path_secondary" ? "rgba(37, 99, 235, 0.2)" : "rgba(124, 58, 237, 0.2)",
                          color: lead.leadType === "path_primary" ? "var(--ember)" : lead.leadType === "path_secondary" ? "#60A5FA" : "#A78BFA",
                        }}
                      >
                        Rumor
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>{lead.sourceNpc}</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "13px", fontStyle: "italic", color: "var(--ink)" }}>
                      "{lead.claim}"
                    </p>
                    <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div><b>🧭 Direction:</b> {lead.directionHint}</div>
                      <div><b>⚠️ Danger:</b> {lead.apparentDanger}</div>
                      <div style={{ color: "var(--moss)" }}><b>💰 Reward:</b> {lead.promisedReward}</div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Adventure Path Clues & World Whispers */}
          {state.campaign.adventurePath && (
            <article className="sub-panel adventure-path-card full-width" style={{ border: "1px solid #4f8cc9" }}>
              <div className="sub-panel-header">
                <div>
                  <div className="eyebrow" style={{ color: "#4f8cc9" }}>Adventure Path Investigation</div>
                  <h3>{state.campaign.adventurePath.name}</h3>
                </div>
              </div>

              {state.campaign.adventurePath.activeSituation && (
                <div style={{ background: "rgba(79, 140, 201, 0.08)", padding: "12px", borderRadius: "6px", margin: "10px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <h4 style={{ margin: "0 0 4px" }}>{state.campaign.adventurePath.activeSituation.title}</h4>
                    <span className="badge-tag" style={{ textTransform: "uppercase" }}>{state.campaign.adventurePath.activeSituation.status}</span>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px" }}>{state.campaign.adventurePath.activeSituation.premise}</p>
                  {state.campaign.adventurePath.activeSituation.knownClues.length > 0 && (
                    <div>
                      <span className="eyebrow" style={{ fontSize: "10px" }}>Known Leads & Evidence</span>
                      <ul style={{ margin: "4px 0 0", paddingLeft: "16px", fontSize: "12px" }}>
                        {state.campaign.adventurePath.activeSituation.knownClues.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {state.campaign.adventurePath.narrativeTells.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <div className="eyebrow" style={{ fontSize: "11px" }}>Tells & Atmospheric Phenomena</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: "16px", fontSize: "12px", color: "var(--muted)" }}>
                    {state.campaign.adventurePath.narrativeTells.map((tell, i) => (
                      <li key={i}>{tell}</li>
                    ))}
                  </ul>
                </div>
              )}

              {state.campaign.adventurePath.hostDetails && (
                <div className="host-ap-dashboard" style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px dashed var(--line)" }}>
                  <div className="eyebrow" style={{ color: "var(--ember)" }}>Host Path Ledger (Hidden Tracks & Tolls)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", margin: "8px 0" }}>
                    <div className="stat-box" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>REACH</span>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>{state.campaign.adventurePath.hostDetails.progress.reach} / 6</div>
                    </div>
                    <div className="stat-box" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>AWAKENING</span>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>{state.campaign.adventurePath.hostDetails.progress.awakening} / 6</div>
                    </div>
                    <div className="stat-box" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>KNOWLEDGE</span>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>{state.campaign.adventurePath.hostDetails.progress.knowledge} / 6</div>
                    </div>
                    <div className="stat-box" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>ACCESS</span>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>{state.campaign.adventurePath.hostDetails.progress.access} / 6</div>
                    </div>
                  </div>
                  {state.campaign.adventurePath.hostDetails.resolvedDeeds.length > 0 && (
                    <div style={{ fontSize: "11px", marginTop: "4px" }}>
                      <b>Resolved Deeds:</b> {state.campaign.adventurePath.hostDetails.resolvedDeeds.join(", ")}
                    </div>
                  )}
                  {state.campaign.adventurePath.hostDetails.toll.length > 0 && (
                    <div style={{ fontSize: "11px", marginTop: "4px", color: "var(--ember)" }}>
                      <b>Toll Incurred:</b> {state.campaign.adventurePath.hostDetails.toll.join(" · ")}
                    </div>
                  )}
                </div>
              )}
            </article>
          )}

          {/* City & Settlement Oracle */}
          <article className="sub-panel settlement-card">
            <div className="sub-panel-header">
              <div>
                <div className="eyebrow">Procedural City Generator</div>
                <h3>Settlement & Tavern</h3>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={generateSettlementAction}
              >
                <Castle size={16} /> Consult City Oracle
              </button>
            </div>

            {settlement ? (
              <div className="settlement-details">
                <div className="settlement-scale-banner">
                  <div>
                    <span className="badge-tag">SCALE</span>
                    <h4>{settlement.scale.name}</h4>
                  </div>
                  <div className="scale-stats">
                    <span>
                      <b>Pop:</b> {settlement.scale.population}
                    </span>
                    <span>
                      <b>Defense:</b> {settlement.scale.defense}
                    </span>
                    <span>
                      <b>Services:</b> {settlement.scale.services}
                    </span>
                  </div>
                </div>

                <div className="tavern-box">
                  <div className="tavern-name">
                    <span className="badge-tag">TAVERN</span>
                    <strong>{settlement.tavern.name}</strong>
                    <small>({settlement.tavern.vibe})</small>
                  </div>
                  <div className="rumor-callout">
                    <ScrollText size={15} />
                    <div>
                      <p>“{settlement.rumor.rumor}”</p>
                      <span className="rumor-auth">
                        Authenticity: <b>{settlement.rumor.authenticity}</b>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="small-btn save-note-btn"
                  onClick={saveSettlementToNotes}
                >
                  <BookOpen size={14} /> Record in Chronicle
                </button>
              </div>
            ) : (
              <p className="empty-prompt">
                Consult the city oracle to reveal local defenses, tavern
                atmosphere, and active street rumors.
              </p>
            )}
          </article>

          {/* NPC & Retainer Guild */}
          <article className="sub-panel retainer-card">
            <div className="sub-panel-header">
              <div>
                <div className="eyebrow">Demographic Retainer Engine</div>
                <h3>Guildhall & Retainers</h3>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() => generateNpcAction(false)}
              >
                <Users size={16} /> Seek Retainer (Classless)
              </button>
              <button
                className="ghost"
                disabled={busy}
                onClick={() => generateNpcAction(true)}
              >
                <Users size={16} /> Roll Dungeon NPC (Classed)
              </button>
            </div>

            {npc ? (
              <div className="npc-details">
                <div className="npc-title-row">
                  <div>
                    <span className="badge-tag">{npc.ancestry}</span>
                    {npc.zoneSubclass && (
                      <span className="badge-tag regional">
                        {npc.zoneSubclass}
                      </span>
                    )}
                    <h4>{npc.zoneSubclass || npc.className}</h4>
                  </div>
                  <div className="npc-stats-pill">
                    <span>LV {npc.retainerStats.level}</span>
                    <span>{npc.retainerStats.hp} HP</span>
                    <span>Morale {npc.retainerStats.morale}</span>
                  </div>
                </div>

                <div className="npc-personality">
                  <div className="personality-row">
                    <span>Demeanor:</span>
                    <b>
                      {npc.demeanor} ({npc.quirk})
                    </b>
                  </div>
                  <div className="personality-row">
                    <span>Motive:</span>
                    <p>{npc.motive}</p>
                  </div>
                  <div className="personality-row">
                    <span>Approach:</span>
                    <p>{npc.interaction}</p>
                  </div>
                  <div className="personality-row">
                    <span>Daily Wage:</span>
                    <b>{npc.retainerStats.dailyWage}</b>
                  </div>
                  <div className="personality-row">
                    <span>Abilities:</span>
                    <b>
                      {(["str", "dex", "con", "int", "wis", "cha"] as const)
                        .map((key) => `${key.toUpperCase()} ${npc.abilities[key]}`)
                        .join(" · ")}
                    </b>
                  </div>
                  <div className="personality-row">
                    <span>Method:</span>
                    <b>
                      {npc.abilityMethod === "unearthed_arcana"
                        ? "Unearthed Arcana"
                        : npc.abilityMethod === "iron_man"
                          ? "Iron Man"
                          : "3d6 straight (classless)"}
                    </b>
                  </div>
                </div>

                {state.me.role === "host" && (
                  <div className="hire-controls">
                    <input
                      value={retainerName}
                      onChange={(e) => setRetainerName(e.target.value)}
                      placeholder="Retainer name"
                    />
                    <button className="primary" onClick={hireRetainer}>
                      <Plus size={15} /> Hire into Party Roster
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="empty-prompt">
                Seek potential retainers or local contacts influenced by party
                demographics and current regional subclass.
              </p>
            )}
          </article>
        </div>
      </section>

      <aside className="sanctuary-aside">
        <section className="panel compact downtime-rules">
          <div className="eyebrow">Downtime Rites</div>
          <h3>Sanctuary Procedures</h3>
          <ul className="downtime-list">
            <li>
              <strong>Rest & Recovery:</strong> A night in an inn restores full
              HP and clears temporary exhaustion.
            </li>
            <li>
              <strong>Carousing:</strong> Spend 50 gold at the tavern to roll
              1d6 for bonus XP and wild rumors.
            </li>
            <li>
              <strong>Provisioning:</strong> Buy rations (5 sp / 3 days),
              torches (5 sp / 3), and gear before departing.
            </li>
            <li>
              <strong>Retainers:</strong> Pay daily wages upfront. Low morale
              NPCs require a CHA check to enter deep ruins.
            </li>
          </ul>
        </section>
        <RollFeed rolls={state.rolls.slice(0, 8)} />
      </aside>
    </div>
  );
}

function OracleView({ state, act }: { state: CampaignState; act: Act }) {
  const [question, setQuestion] = useState("Is the way ahead safe?"),
    [likelihood, setLikelihood] = useState("even"),
    [dice, setDice] = useState("1d20"),
    [label, setLabel] = useState("Action check"),
    [cha, setCha] = useState(0);
  const latest = state.rolls[0];
  return (
    <div className="surface-grid oracle-layout">
      <section className="panel oracle-console">
        <Title
          eyebrow="Core GM-less oracle"
          title="Ask fate a closed question"
        />
        <label>
          Question
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label>
          How likely is “yes”?
          <select
            value={likelihood}
            onChange={(e) => setLikelihood(e.target.value)}
          >
            <option value="certain">Almost certain · 4+</option>
            <option value="likely">Likely · 7+</option>
            <option value="even">Even odds · 11+</option>
            <option value="unlikely">Unlikely · 15+</option>
            <option value="impossible">Nearly impossible · 19+</option>
          </select>
        </label>
        <button
          className="primary wide large-button"
          onClick={() =>
            act(
              "oracle:binary",
              { question, likelihood },
              "The oracle has answered",
            )
          }
        >
          <Dices size={20} /> Ask the oracle
        </button>
        {latest?.kind === "oracle" && (
          <div className="oracle-result">
            <span>{latest.total}</span>
            <div>
              <strong>{latest.detail.split(" · ")[0]}</strong>
              <p>{latest.label}</p>
            </div>
          </div>
        )}
      </section>
      <aside className="oracle-side">
        <section className="panel compact">
          <div className="eyebrow">Open dice</div>
          <h3>Server-authoritative roll</h3>
          <div className="inline-fields">
            <input value={dice} onChange={(e) => setDice(e.target.value)} />
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <button
            className="wide"
            onClick={() =>
              act("dice:roll", { expression: dice, label }, "Dice cast")
            }
          >
            Roll {dice}
          </button>
        </section>
        <section className="panel compact">
          <div className="eyebrow">First contact</div>
          <h3>Monster reaction</h3>
          <label>
            Party CHA modifier
            <input
              type="number"
              value={cha}
              onChange={(e) => setCha(Number(e.target.value))}
            />
          </label>
          <button
            className="wide"
            onClick={() =>
              act("oracle:reaction", { chaModifier: cha }, "Reaction resolved")
            }
          >
            Roll 2d6 reaction
          </button>
        </section>
        <RollFeed rolls={state.rolls.slice(0, 7)} />
      </aside>
    </div>
  );
}

function TreasureModal({
  rewards,
  characters,
  act,
  onClose,
}: {
  rewards: RewardRecord[];
  characters: Character[];
  act: Act;
  onClose: () => void;
}) {
  const unclaimed = rewards.filter((r) => !r.claimed);
  const [selectedCharIds, setSelectedCharIds] = useState<Record<string, number>>({});

  return (
    <div className="modal-backdrop">
      <div className="panel modal-content" style={{ maxWidth: "600px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <Title eyebrow="Expedition Spoils" title="Treasure Allocation" />
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>

        {unclaimed.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)" }}>
            <p>All expedition spoils and rewards have been claimed and allocated.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {unclaimed.map((reward) => {
              const totalCoins = (reward.coins.gp ?? 0) + (reward.coins.sp ?? 0) / 10 + (reward.coins.cp ?? 0) / 100;
              const hasCoins = totalCoins > 0;
              const hasItems = reward.items && reward.items.length > 0;

              return (
                <div
                  key={reward.id}
                  style={{
                    background: "rgba(217, 117, 56, 0.08)",
                    border: "1px solid var(--ember)",
                    borderRadius: "6px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span className="badge-tag" style={{ background: "var(--ember)", color: "#000", fontWeight: "bold" }}>
                      SOURCE: {reward.sourceType.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  {hasCoins && (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "14px", marginBottom: "6px" }}>
                        🪙 <b>Coins:</b> {reward.coins.gp ?? 0} GP {reward.coins.sp ? `· ${reward.coins.sp} SP` : ""} {reward.coins.cp ? `· ${reward.coins.cp} CP` : ""}
                      </div>
                      <button
                        className="small-btn primary"
                        onClick={() =>
                          act(
                            "treasure:allocate",
                            { rewardId: reward.id, allocation: { target: "party" } },
                            "Coins divided equally among the party",
                          )
                        }
                      >
                        Divide Coins Evenly (Party)
                      </button>
                    </div>
                  )}

                  {hasItems && (
                    <div>
                      <div style={{ fontSize: "14px", marginBottom: "6px" }}>
                        🎒 <b>Items & Relics:</b>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {reward.items.map((itId, idx) => {
                          const itDef = ITEMS.find((i) => i.id === itId);
                          const itName = itDef?.name ?? itId;
                          const itSlots = itDef?.slots ?? 1;
                          const targetCharId = selectedCharIds[`${reward.id}:${idx}`] ?? characters[0]?.id;
                          const targetChar = characters.find((c) => c.id === targetCharId);
                          const carried = (targetChar?.inventory ?? []).reduce(
                            (s, it) => s + (it.slots ?? 1) * (it.quantity ?? 1),
                            0,
                          );
                          const capacity = targetChar?.gearSlots ?? 10;
                          const willEncumber = carried + itSlots > capacity;

                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                background: "rgba(0, 0, 0, 0.2)",
                                padding: "8px 12px",
                                borderRadius: "4px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <b>{itName}</b> <small style={{ color: "var(--muted)" }}>({itSlots} slot{itSlots > 1 ? "s" : ""})</small>
                                {willEncumber && (
                                  <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "2px" }}>
                                    ⚠️ Will encumber {targetChar?.name} ({carried + itSlots}/{capacity} slots)
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <select
                                  value={targetCharId}
                                  onChange={(e) =>
                                    setSelectedCharIds({
                                      ...selectedCharIds,
                                      [`${reward.id}:${idx}`]: Number(e.target.value),
                                    })
                                  }
                                  style={{ padding: "4px 8px", fontSize: "12px" }}
                                >
                                  {characters.map((c) => {
                                    const cCarried = (c.inventory ?? []).reduce(
                                      (s, it) => s + (it.slots ?? 1) * (it.quantity ?? 1),
                                      0,
                                    );
                                    return (
                                      <option key={c.id} value={c.id}>
                                        {c.name} ({cCarried}/{c.gearSlots} slots)
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  className="small-btn primary"
                                  onClick={() =>
                                    act(
                                      "treasure:allocate",
                                      {
                                        rewardId: reward.id,
                                        allocation: {
                                          target: "character",
                                          characterId: targetCharId,
                                          itemId: itId,
                                        },
                                      },
                                      `${itName} allocated to ${targetChar?.name}`,
                                    )
                                  }
                                >
                                  Assign
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


function ChronicleView({ state, act, socket }: { state: CampaignState; act: Act; socket: Socket }) {
  const [form, setForm] = useState({ section: "session", title: "", body: "" });
  // Broadcasts carry only the live tail of the chronicle; older entries are paged in.
  const [olderNotes, setOlderNotes] = useState<WikiNote[]>([]);
  const [olderRolls, setOlderRolls] = useState<RollRecord[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [exhausted, setExhausted] = useState({ notes: false, rolls: false });
  const notes = [...state.notes, ...olderNotes];
  const rolls = [...state.rolls, ...olderRolls];
  const loadOlder = async () => {
    setLoadingOlder(true);
    try {
      const [notePage, rollPage] = await Promise.all([
        exhausted.notes ? [] : fetchOlderNotes(socket, notes[notes.length - 1]?.id),
        exhausted.rolls ? [] : fetchOlderRolls(socket, rolls[rolls.length - 1]?.id),
      ]);
      setOlderNotes((current) => [...current, ...notePage]);
      setOlderRolls((current) => [...current, ...rollPage]);
      setExhausted((current) => ({
        notes: current.notes || notePage.length === 0,
        rolls: current.rolls || rollPage.length === 0,
      }));
    } finally {
      setLoadingOlder(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await act("note:add", form, "Chronicle entry added");
    setForm({ ...form, title: "", body: "" });
  };
  return (
    <div className="surface-grid chronicle-layout">
      <section>
        <Title eyebrow="Persistent table memory" title="Campaign chronicle" />
        <PressureBoard state={state} act={act} />
        <form className="panel note-form" onSubmit={submit}>
          <div className="creator-grid">
            <label>
              Section
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
              >
                <option value="session">Session log</option>
                <option value="discovery">Discovery</option>
                <option value="faction">Faction</option>
              </select>
            </label>
            <Field
              label="Entry title"
              value={form.title}
              onChange={(title) => setForm({ ...form, title })}
            />
          </div>
          <label>
            What should the campaign remember?
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <button className="primary" disabled={!form.title || !form.body}>
            <ScrollText size={17} /> Add to record
          </button>
        </form>
        <div className="notes-list">
          {notes.map((note) => (
            <article className="panel" key={note.id}>
              <div className="eyebrow">
                {note.section} · {new Date(note.createdAt).toLocaleDateString()}
              </div>
              <h2>{note.title}</h2>
              <p>{note.body}</p>
            </article>
          ))}
        </div>
        {!(exhausted.notes && exhausted.rolls) && (
          <button onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? "Loading older entries…" : "Load older entries"}
          </button>
        )}
      </section>
      <aside>
        <RollFeed rolls={rolls} expanded />
      </aside>
    </div>
  );
}

const pressureShapes = [
  ["countdown", "Countdown", "A known deadline approaches"],
  ["pursuit", "Pursuit", "Hunters close the distance"],
  ["race", "Rival race", "Another group advances toward the same prize"],
  ["heat", "Faction heat", "Attention and reprisals accumulate"],
  ["spread", "Spreading crisis", "Danger expands across people or places"],
  ["mystery", "Revelation", "Evidence changes what the party understands"],
  ["opportunity", "Opportunity", "A favorable window is closing"],
  ["ladder", "Escalation ladder", "Consequences intensify in distinct steps"],
] as const;

function PressureBoard({ state, act }: { state: CampaignState; act: Act }) {
  const [form, setForm] = useState({
    name: "",
    shape: "pursuit",
    threshold: 6,
    consequence: "",
  });
  const [complication, setComplication] = useState<string | null>(null);
  const [rollingComplication, setRollingComplication] = useState(false);

  const rollComplication = async () => {
    setRollingComplication(true);
    try {
      const res = await act<{ result: { complication: string } }>(
        "campaign:complication",
        {},
        "Campaign complication determined by oracle",
      );
      if (res?.result) setComplication(res.result.complication);
    } finally {
      setRollingComplication(false);
    }
  };

  const applyShape = (shapeKey: string) => {
    const presets: Record<
      string,
      { name: string; consequence: string; threshold: number }
    > = {
      countdown: {
        name: "The Blood Moon Rises",
        consequence: "Wards shatter across the valley",
        threshold: 6,
      },
      pursuit: {
        name: "Ash Riders Close Distance",
        consequence: "The hunting pack ambushes the company",
        threshold: 5,
      },
      race: {
        name: "Rival Explorers Delve",
        consequence: "Rivals claim the inner sanctum first",
        threshold: 6,
      },
      heat: {
        name: "Garrison & Thieves' Guild Alert",
        consequence: "Gates barred and bounty placed on adventurers",
        threshold: 4,
      },
      spread: {
        name: "Blighted Miasma Spreads",
        consequence: "The sanctuary oasis turns corrupt and foul",
        threshold: 5,
      },
      mystery: {
        name: "Forgotten Ritual Deciphered",
        consequence: "The slumbering elder entity awakens",
        threshold: 4,
      },
      opportunity: {
        name: "Starlight Gate Closing",
        consequence: "The planar gate seals for a century",
        threshold: 3,
      },
      ladder: {
        name: "Inquisitorial Purge Escalates",
        consequence: "Martial law declared; pyres lit at city gates",
        threshold: 5,
      },
    };
    const p = presets[shapeKey];
    if (p && (!form.name || form.name === form.shape)) {
      setForm({
        ...form,
        shape: shapeKey,
        name: p.name,
        consequence: p.consequence,
        threshold: p.threshold,
      });
    } else {
      setForm({ ...form, shape: shapeKey });
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await act("pressure:add", form, "Campaign pressure added");
    setForm({ ...form, name: "", consequence: "" });
  };

  return (
    <section className="panel pressure-board">
      <div className="pressure-heading">
        <div>
          <div className="eyebrow">Optional campaign momentum</div>
          <h2>Active pressures</h2>
          <p>
            Track only forces that are actually moving. A campaign needs no
            global clock unless its fiction creates one.
          </p>
        </div>

        <div className="pressure-top-actions">
          {state.me.role === "host" && (
            <button
              className="complication-trigger-btn"
              disabled={rollingComplication}
              onClick={rollComplication}
            >
              <AlertTriangle size={15} /> Trigger Complication
            </button>
          )}

          {state.me.role === "host" && (
            <details className="pressure-create">
              <summary>
                <Plus size={15} /> Add pressure
              </summary>
              <form onSubmit={submit}>
                <Field
                  label="What is moving?"
                  value={form.name}
                  onChange={(name) => setForm({ ...form, name })}
                  placeholder="The Ash Riders close in"
                />
                <label>
                  Shape & Preset
                  <select
                    value={form.shape}
                    onChange={(event) => applyShape(event.target.value)}
                  >
                    {pressureShapes.map(([value, label, description]) => (
                      <option value={value} key={value}>
                        {label} — {description}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Steps to consequence
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={form.threshold}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        threshold: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <Field
                  label="What happens at the final step?"
                  value={form.consequence}
                  onChange={(consequence) => setForm({ ...form, consequence })}
                  placeholder="They reach the sanctuary before dawn"
                />
                <button
                  className="primary wide"
                  disabled={!form.name || !form.consequence}
                >
                  Create pressure
                </button>
              </form>
            </details>
          )}
        </div>
      </div>

      {complication && (
        <div className="complication-callout">
          <div className="complication-head">
            <AlertTriangle size={16} />
            <strong>Emergent Campaign Complication</strong>
            <button
              className="icon-button"
              onClick={() => setComplication(null)}
            >
              <X size={14} />
            </button>
          </div>
          <p>{complication}</p>
          <button
            className="small-btn record-complication-btn"
            onClick={() => {
              act(
                "note:add",
                {
                  section: "session",
                  title: "Campaign Complication",
                  body: complication,
                },
                "Complication saved to session notes",
              );
              setComplication(null);
            }}
          >
            <BookOpen size={13} /> Save to Chronicle Notes
          </button>
        </div>
      )}
      {state.pressures.length === 0 ? (
        <div className="pressure-empty">
          <Compass size={22} />
          <div>
            <strong>No campaign-wide pressure is active.</strong>
            <p>
              Explore freely. Add one only when pursuit, rivalry, spreading
              danger, or another consequence begins moving in the fiction.
            </p>
          </div>
        </div>
      ) : (
        <div className="pressure-list">
          {state.pressures.map((pressure) => {
            const shape = pressureShapes.find(
              ([value]) => value === pressure.shape,
            );
            return (
              <article
                key={pressure.id}
                className={`${pressure.status}${pressure.current === pressure.threshold ? " reached" : ""}`}
              >
                <div className="pressure-title">
                  <span>
                    {pressure.status === "resolved"
                      ? "RESOLVED"
                      : pressure.current === pressure.threshold
                        ? "CONSEQUENCE REACHED"
                        : shape?.[1].toUpperCase()}
                  </span>
                  <h3>{pressure.name}</h3>
                </div>
                <div
                  className="pressure-track"
                  aria-label={`${pressure.current} of ${pressure.threshold} steps`}
                >
                  {Array.from({ length: pressure.threshold }, (_, index) => (
                    <i
                      key={index}
                      className={index < pressure.current ? "filled" : ""}
                    />
                  ))}
                </div>
                <p>{pressure.consequence}</p>
                {state.me.role === "host" && pressure.status === "active" && (
                  <div className="pressure-actions">
                    <button
                      onClick={() =>
                        act("pressure:advance", {
                          pressureId: pressure.id,
                          delta: -1,
                        })
                      }
                    >
                      − Step
                    </button>
                    <button
                      className="primary"
                      onClick={() =>
                        act("pressure:advance", {
                          pressureId: pressure.id,
                          delta: 1,
                        })
                      }
                    >
                      + Step
                    </button>
                    <button
                      onClick={() =>
                        act("pressure:resolve", { pressureId: pressure.id })
                      }
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RollFeed({
  rolls,
  expanded = false,
}: {
  rolls: CampaignState["rolls"];
  expanded?: boolean;
}) {
  return (
    <section className={`panel roll-feed${expanded ? " expanded" : ""}`}>
      <div className="eyebrow">Live table record</div>
      <h3>Recent resolutions</h3>
      <div>
        {rolls.length ? (
          rolls.map((roll) => (
            <article key={roll.id}>
              <span className={`roll-kind ${roll.kind}`}>{roll.total}</span>
              <div>
                <b>{roll.label}</b>
                <p>{roll.detail}</p>
                <small>
                  {roll.actor} · {roll.dice}
                </small>
              </div>
            </article>
          ))
        ) : (
          <p>No dice have been cast yet.</p>
        )}
      </div>
    </section>
  );
}
