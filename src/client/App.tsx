import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FrontierMap } from "./FrontierMap";
import {
  AlertTriangle,
  Apple,
  ArrowUpCircle,
  BookOpen,
  Castle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Compass,
  Copy,
  Dices,
  DoorOpen,
  Filter,
  Flame,
  Footprints,
  Heart,
  HelpCircle,
  LogOut,
  Map,
  Menu,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Tent,
  Users,
  X,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { ABILITY_KEYS, ANCESTRIES, CLASSES, MONSTERS } from "../shared/content";
import { BORDER_PAIRINGS, getBorderPairing, validateBorderPairing, ZONE_PROFILES } from "../shared/zone-profiles";
import type {
  CampaignState,
  Character,
  CursedZoneId,
  EncounterMonster,
  MonsterCatalogEntry,
  NpcResult,
  PublicHex,
  RegionGenerationConfig,
  SessionIdentity,
  SettlementResult,
  ZoneManifest,
  ZoneSummary,
} from "../shared/types";

type Tab = "sanctuary" | "map" | "encounters" | "party" | "oracle" | "chronicle";
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
    next.on("state", setState);
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
        borderProfileId: pairing?.borderProfileId,
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
                      {ZONE_PROFILES[selectedZone]?.historicalPremise}
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
      : state.campaign.phase === "sanctuary"
        ? "sanctuary"
        : "map",
  );
  const [menu, setMenu] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [toast, setToast] = useState("");
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
    try {
      const result = await emit<T>(event, payload);
      if (success) {
        setToast(success);
        setTimeout(() => setToast(""), 2400);
      }
      return result;
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Action failed");
      setTimeout(() => setToast(""), 3500);
      throw reason;
    }
  };
  const nav: [Tab, typeof Map, string][] = [
    ["sanctuary", Castle, "Sanctuary"],
    ["map", Map, "Frontier"],
    ["encounters", Swords, "Encounters"],
    ["party", Users, "Party"],
    ["oracle", Dices, "Oracle"],
    ["chronicle", BookOpen, "Chronicle"],
  ];
  const activeEncountersCount = state.encounters.filter(
    (e) => e.status === "active",
  ).length;

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
        <button className="icon-button" onClick={leave}>
          <LogOut size={18} />
        </button>
      </header>

      <CampaignSubbar
        state={state}
        act={act}
        onOpenZone={() => setShowZoneModal(true)}
        onPhaseChange={(phase) => {
          if (phase === "sanctuary") setTab("sanctuary");
          if (phase === "hexcrawl") setTab("map");
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
            {key === "party" && <em>{state.characters.length}</em>}
            {key === "encounters" && activeEncountersCount > 0 && (
              <em className="danger-badge">{activeEncountersCount}</em>
            )}
          </button>
        ))}
      </nav>
      <section className="main-content">
        {tab === "sanctuary" && <SanctuaryView state={state} act={act} />}
        {tab === "map" && <MapView state={state} act={act} />}
        {tab === "encounters" && <EncounterView state={state} act={act} />}
        {tab === "party" && <PartyView state={state} act={act} />}
        {tab === "oracle" && <OracleView state={state} act={act} />}
        {tab === "chronicle" && <ChronicleView state={state} act={act} />}
      </section>

      {showZoneModal && (
        <ZoneDossierModal
          state={state}
          act={act}
          onClose={() => setShowZoneModal(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CampaignSubbar({
  state,
  act,
  onOpenZone,
  onPhaseChange,
}: {
  state: CampaignState;
  act: Act;
  onOpenZone: () => void;
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
          <div className="clock-chip objective-chip" title={state.campaign.activeObjective.claim || state.campaign.activeObjective.notes || ""}>
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
    await act("zone:exit", {}, `Returned to ${state.activeZone?.havenDefaults?.name ?? "sanctuary"}`);
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
                <button onClick={returnSanctuary}>Return to Sanctuary</button>
              </div>
            </div>
          )}
        </div>
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

  const generateNpcAction = async () => {
    setBusy(true);
    try {
      const res = await act<{ result: NpcResult }>(
        "npc:generate",
        { zoneId: state.campaign.activeZoneId },
        "NPC & Retainer rolled",
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
          {state.me.role === "host" && (
            <button
              className="primary rest-btn"
              onClick={() =>
                act("party:rest", {}, "Party fully rested and healed")
              }
            >
              <Heart size={16} /> Full Party Rest & Recovery
            </button>
          )}
        </div>

        <div className="sanctuary-grid">
          {/* Haven Bastion Taproom & Grounded Leads */}
          {state.campaign.tavernEstablishment && (
            <article className="sub-panel tavern-establishment-card full-width">
              <div className="sub-panel-header">
                <div>
                  <div className="eyebrow">Haven Bastion Taproom</div>
                  <h3>{state.campaign.tavernEstablishment.name}</h3>
                  <p className="tavern-submeta" style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                    <b>Vibe:</b> {state.campaign.tavernEstablishment.vibe} · <b>Barkeep:</b> {state.campaign.tavernEstablishment.barkeepName} · <b>Patrons:</b> {state.campaign.tavernEstablishment.patronage}
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
                  <p style={{ margin: "0 0 6px", fontSize: "13px" }}>{state.campaign.activeObjective.claim || state.campaign.activeObjective.notes}</p>
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
                onClick={generateNpcAction}
              >
                <Users size={16} /> Seek Retainer / NPC
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

function MapView({ state, act }: { state: CampaignState; act: Act }) {
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
          title="The 19-hex frontier"
          aside={`${state.hexes.filter((h) => h.revealState !== "unexplored").length} / ${state.hexes.length} charted`}
        />

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
                    Procedurally re-seed the 19-hex frontier with connected
                    waterways, radiating roads, and horizon rumors.
                  </p>
                  <div className="theme-select-row">
                    <select
                      value={genTheme}
                      onChange={(e) => setGenTheme(e.target.value)}
                    >
                      <option value="the_gloaming">The Gloaming (Gothic Mistwood - CS1)</option>
                      <option value="red_sands">The Red Sands (Djurum Desert - CS2)</option>
                      <option value="midnight_sun">The Isles of Andrik (Glacial Fjords - CS3)</option>
                      <option value="river_of_night">The Black River (Primeval Jungle - CS4)</option>
                      <option value="dwellers_in_the_deep">Morzomotha (Karst Deeps - CS5)</option>
                      <option value="city_of_masks">The City of Masks (Meridia Canals - CS6)</option>
                    </select>
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
          <section className="panel compact join-card">
            <img
              src={`/api/campaigns/${state.campaign.code}/qr`}
              alt={`QR code to join campaign ${state.campaign.code}`}
            />
            <div>
              <div className="eyebrow">Invite the table</div>
              <h3>Scan to join</h3>
              <p>{state.campaign.joinUrl}</p>
            </div>
          </section>
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

function PartyView({ state, act }: { state: CampaignState; act: Act }) {
  const own = state.characters.find((c) => c.id === state.me.characterId),
    [creating, setCreating] = useState(state.me.role === "player" && !own);
  return (
    <div className="party-page">
      <Title
        eyebrow="Campaign roster"
        title="The adventuring company"
        aside={`${state.characters.length} sworn member${state.characters.length === 1 ? "" : "s"}`}
      />
      {creating && (
        <CharacterCreator act={act} done={() => setCreating(false)} />
      )}
      {!creating && (state.me.role === "host" || !own) && (
        <button className="add-card" onClick={() => setCreating(true)}>
          <Plus /> Add a character
        </button>
      )}
      <div className="character-grid">
        {state.characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            canEdit={
              state.me.role === "host" || state.me.characterId === character.id
            }
            act={act}
            own={state.me.characterId === character.id}
          />
        ))}
      </div>
    </div>
  );
}

function CharacterCreator({ act, done }: { act: Act; done: () => void }) {
  const [form, setForm] = useState({
      name: "",
      ancestry: ANCESTRIES[0] as string,
      className: CLASSES[0].name as string,
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "", landmark: "", nemesis: "" },
    }),
    [busy, setBusy] = useState(false);
  const roll = async () => {
    const result = await act<{ scores: number[] }>("character:roll-abilities");
    setForm({
      ...form,
      abilities: Object.fromEntries(
        ABILITY_KEYS.map((key, i) => [key, result.scores[i]]),
      ) as typeof form.abilities,
    });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await act("character:create", form, `${form.name} joined the company`);
      done();
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="panel creator" onSubmit={submit}>
      <div className="creator-heading">
        <div>
          <div className="eyebrow">Seven-step character flow</div>
          <h2>Call a new adventurer forward.</h2>
        </div>
        <button type="button" onClick={roll}>
          <Dices size={17} /> Roll 3d6 in order
        </button>
      </div>
      <div className="creator-grid">
        <Field
          label="Character name"
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
        />
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
          <select
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
          >
            {CLASSES.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="ability-editor">
        {ABILITY_KEYS.map((key) => (
          <label key={key}>
            {labels[key]}
            <input
              type="number"
              min="3"
              max="20"
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
      <button className="primary" disabled={busy || !form.name}>
        {busy ? "Recording…" : "Enter the campaign"}
      </button>
    </form>
  );
}

function CharacterCard({
  character,
  canEdit,
  act,
  own,
}: {
  character: Character;
  canEdit: boolean;
  act: Act;
  own: boolean;
}) {
  const nextLevelXp = character.level * 10;
  const currentXp = character.xp ?? 0;
  const canLevelUp = currentXp >= nextLevelXp && character.level < 36;
  const xpPercent = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

  return (
    <article className={`panel character-card${own ? " own" : ""}`}>
      <div className="portrait-mark">{character.name[0]}</div>
      <div className="character-head">
        <div className="eyebrow">
          Level {character.level} · {character.ancestry}
        </div>
        <h2>{character.name}</h2>
        <p>
          {character.className}
          {own ? " · your character" : ""}
        </p>
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
          <div key={key}>
            <span>{labels[key]}</span>
            <b>{character.abilities[key]}</b>
            <small>
              {mod(character.abilities[key]) >= 0 ? "+" : ""}
              {mod(character.abilities[key])}
            </small>
          </div>
        ))}
      </div>

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

      <div className="gear-slot-chip">
        <Shield size={14} />
        <span>
          Gear Capacity: <b>{character.gearSlots} slots</b> (10 + STR mod)
        </span>
      </div>

      <details className="card-drawer">
        <summary>Cultural anchors</summary>
        <div className="drawer-body">
          <p>
            <b>Homeland:</b> {character.anchors.homeland || "Unwritten"}
          </p>
          <p>
            <b>Landmark:</b> {character.anchors.landmark || "Unwritten"}
          </p>
          <p>
            <b>Nemesis:</b> {character.anchors.nemesis || "Unwritten"}
          </p>
        </div>
      </details>
    </article>
  );
}

function EncounterView({ state, act }: { state: CampaignState; act: Act }) {
  const [catalog, setCatalog] = useState<MonsterCatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [zoneOnly, setZoneOnly] = useState(false);
  const [monsterKey, setMonsterKey] = useState("owlbear");
  const [count, setCount] = useState(1);
  const [forceVariant, setForceVariant] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.monsters) && data.monsters.length > 0) {
          setCatalog(data.monsters);
          if (
            !monsterKey ||
            !data.monsters.some(
              (m: MonsterCatalogEntry) => m.key === monsterKey,
            )
          ) {
            setMonsterKey(data.monsters[0].key);
          }
        }
      })
      .catch(() => {
        const fallback = Object.entries(MONSTERS).map(([k, v]) => ({
          key: k,
          name: v.name,
          level: 1,
        }));
        setCatalog(fallback);
      });
  }, []);

  const families = Array.from(
    new Set(catalog.map((m) => m.family).filter(Boolean) as string[]),
  ).sort();

  const activeZoneTable = state.activeZone?.wanderingMonsterTable ?? [];

  const filteredMonsters = catalog.filter((m) => {
    if (zoneOnly && activeZoneTable.length > 0) {
      if (!activeZoneTable.includes(m.key)) return false;
    }
    if (familyFilter !== "all" && m.family !== familyFilter) return false;
    const lvl = m.level ?? 1;
    if (levelFilter === "0-1" && lvl > 1) return false;
    if (levelFilter === "2-4" && (lvl < 2 || lvl > 4)) return false;
    if (levelFilter === "5-8" && (lvl < 5 || lvl > 8)) return false;
    if (levelFilter === "9+" && lvl < 9) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="encounter-page">
      <div className="encounter-heading">
        <Title
          eyebrow="Monsternomicon & Field Adjudicator"
          title="Tactical Encounter Board"
          aside={`${state.encounters.filter((e) => e.status === "active").length} active`}
        />

        {state.me.role === "host" && (
          <div className="start-encounter-panel panel">
            <div className="panel-title-bar">
              <div className="eyebrow">Summon Creature or Threat</div>
              <h3>Launch Table Encounter</h3>
            </div>

            <div className="monster-filter-bar">
              <div className="search-input-wrap">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search 270+ bestiary entries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="clear-btn" onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
              >
                <option value="all">All Families ({families.length})</option>
                {families.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="0-1">Levels 0–1</option>
                <option value="2-4">Levels 2–4</option>
                <option value="5-8">Levels 5–8</option>
                <option value="9+">Levels 9+</option>
              </select>

              {activeZoneTable.length > 0 && (
                <label className="checkbox-label zone-toggle">
                  <input
                    type="checkbox"
                    checked={zoneOnly}
                    onChange={(e) => setZoneOnly(e.target.checked)}
                  />
                  <span>
                    <b>{state.activeZone?.name?.split(" ")[0]}</b> Wanderers (
                    {activeZoneTable.length})
                  </span>
                </label>
              )}
            </div>

            <div className="start-encounter-actions">
              <div className="monster-select-col">
                <label>
                  Creature ({filteredMonsters.length} available)
                  <select
                    value={monsterKey}
                    onChange={(e) => setMonsterKey(e.target.value)}
                  >
                    {filteredMonsters.map((m) => (
                      <option value={m.key} key={m.key}>
                        {m.name} [LV {m.level ?? 1}
                        {m.family ? ` · ${m.family}` : ""}]
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="count-col">
                Qty
                <input
                  type="number"
                  value={count}
                  min="1"
                  max="12"
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>

              <label className="checkbox-label variant-toggle">
                <input
                  type="checkbox"
                  checked={forceVariant}
                  onChange={(e) => setForceVariant(e.target.checked)}
                />
                <span>Variant Mutation</span>
              </label>

              <button
                className="primary start-btn"
                disabled={!monsterKey || filteredMonsters.length === 0}
                onClick={() =>
                  act(
                    "encounter:start",
                    { monsterKey, count, forceVariant },
                    "Encounter started on table board",
                  )
                }
              >
                <Plus size={17} /> Start
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="encounter-grid">
        {state.encounters.map((encounter) => (
          <section
            className={`panel encounter-card ${encounter.status}`}
            key={encounter.id}
          >
            <div className="encounter-title">
              <div>
                <div className="eyebrow">{encounter.status} encounter</div>
                <h2>{encounter.name}</h2>
              </div>
              {state.me.role === "host" && encounter.status === "active" && (
                <button
                  className="resolve-btn"
                  onClick={() =>
                    act("encounter:resolve", { encounterId: encounter.id })
                  }
                >
                  <CheckCircle2 size={15} /> Resolve
                </button>
              )}
            </div>
            {encounter.monsters.map((monster, index) => (
              <MonsterRow
                key={monster.id}
                monster={monster}
                index={index}
                state={state}
                act={act}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function MonsterRow({
  monster,
  index,
  state,
  act,
}: {
  monster: EncounterMonster;
  index: number;
  state: CampaignState;
  act: Act;
}) {
  const isDefeated = monster.currentHp <= 0;

  return (
    <article className={`monster-row ${isDefeated ? "defeated" : ""}`}>
      <div className="monster-number">{index + 1}</div>
      <div className="monster-main">
        <div className="monster-name">
          <div className="monster-heading-left">
            <strong>{monster.name}</strong>
            {monster.level != null && (
              <span className="lvl-chip">LV {monster.level}</span>
            )}
            {monster.family && (
              <span className="family-chip">{monster.family}</span>
            )}
          </div>
          <span>Lore {monster.loreTier}/4</span>
        </div>

        {monster.isVariant && (
          <div className="variant-banner">
            <span className="variant-tag">MUTANT VARIANT</span>
            <strong>{monster.variantQuality}</strong>
            {monster.variantStrength && (
              <small>⚔️ {monster.variantStrength}</small>
            )}
            {monster.variantWeakness && (
              <small>⚡ Bane: {monster.variantWeakness}</small>
            )}
          </div>
        )}

        <div className="hp-bar">
          <i
            style={{
              width: `${Math.max(0, (monster.currentHp / monster.maxHp) * 100)}%`,
            }}
          />
        </div>
        <small className="hp-label">
          {monster.currentHp} / {monster.maxHp} HP
        </small>

        {isDefeated ? (
          <div className="defeated-callout">
            <div className="defeated-badge">
              <Skull size={15} /> Felled in Combat
            </div>

            {/* Monsternomicon Anatomical Salvage Table */}
            {monster.harvest && monster.harvest.length > 0 && (
              <div className="harvest-box">
                <div className="harvest-heading">
                  <Sparkles size={14} />
                  <span>Monsternomicon Anatomical Salvage</span>
                </div>
                {monster.harvest.map((h, i) => (
                  <div key={i} className="harvest-item">
                    <div className="harvest-info">
                      <strong>{h.reagent}</strong>
                      <span className="harvest-dc-tag">DC {h.dc} INT</span>
                      <p>{h.effect}</p>
                    </div>
                    <button
                      className="small-btn harvest-roll-btn"
                      onClick={() =>
                        act(
                          "dice:roll",
                          {
                            expression: "1d20",
                            label: `Harvest Check vs DC ${h.dc} (${h.reagent})`,
                          },
                          "Harvest check cast",
                        )
                      }
                    >
                      Roll DC {h.dc}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {monster.loreTier === 0 && (
              <p className="fog-message">
                <HelpCircle size={15} /> Capabilities unknown. Pass an INT lore
                check.
              </p>
            )}
            {monster.ac != null && (
              <div className="revealed-stats">
                <span>
                  AC <b>{monster.ac}</b>
                </span>
                {monster.morale != null && (
                  <span>
                    Morale <b>{monster.morale}</b>
                  </span>
                )}
                {monster.move && (
                  <span>
                    Move <b>{monster.move}</b>
                  </span>
                )}
                {monster.alignment && (
                  <span>
                    Align <b>{monster.alignment}</b>
                  </span>
                )}
              </div>
            )}
            {monster.attacks?.map((text) => (
              <p className="monster-detail" key={text}>
                <Swords size={14} /> {text}
              </p>
            ))}
            {monster.traits?.map((text) => (
              <p className="monster-detail" key={text}>
                <Sparkles size={14} /> {text}
              </p>
            ))}
            {monster.lore?.map((text, i) => (
              <p className="lore-line" key={text}>
                <b>DC {[9, 12, 15, 18][i]}</b>
                {text}
              </p>
            ))}
          </>
        )}
      </div>

      <div className="monster-actions">
        {state.me.role === "host" && (
          <>
            <button
              onClick={() =>
                act("encounter:hp", { monsterId: monster.id, delta: -1 })
              }
            >
              −1 HP
            </button>
            <button
              onClick={() =>
                act("encounter:hp", { monsterId: monster.id, delta: 1 })
              }
            >
              +1 HP
            </button>
          </>
        )}
        <button
          onClick={() =>
            act("encounter:lore", {
              monsterId: monster.id,
              characterId: state.me.characterId,
            })
          }
        >
          <BookOpen size={14} /> Lore (
          {monster.loreTier < 4
            ? `DC ${[9, 12, 15, 18][monster.loreTier]}`
            : "Max"}
          )
        </button>
        <button
          onClick={() => act("encounter:morale", { monsterId: monster.id })}
        >
          <Shield size={14} /> Morale
        </button>
      </div>
    </article>
  );
}

function ChronicleView({ state, act }: { state: CampaignState; act: Act }) {
  const [form, setForm] = useState({ section: "session", title: "", body: "" });
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
          {state.notes.map((note) => (
            <article className="panel" key={note.id}>
              <div className="eyebrow">
                {note.section} · {new Date(note.createdAt).toLocaleDateString()}
              </div>
              <h2>{note.title}</h2>
              <p>{note.body}</p>
            </article>
          ))}
        </div>
      </section>
      <aside>
        <RollFeed rolls={state.rolls} expanded />
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
              setToast("Saved to chronicle notes");
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
function Title({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="surface-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {aside && <span>{aside}</span>}
    </div>
  );
}
function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={`brand${large ? " large" : ""}`}>
      <Flame size={large ? 28 : 22} />
      <span>ASH</span>
      {large && <small>TABLE COMPANION</small>}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  [key: string]: unknown;
}) {
  return (
    <label>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
