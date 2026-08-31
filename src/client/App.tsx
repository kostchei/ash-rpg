import { useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  ChevronRight,
  CircleDot,
  Compass,
  Copy,
  Dices,
  DoorOpen,
  Flame,
  Heart,
  HelpCircle,
  LogOut,
  Map,
  Menu,
  Plus,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { ABILITY_KEYS, ANCESTRIES, CLASSES, MONSTERS } from "../shared/content";
import type {
  CampaignState,
  Character,
  EncounterMonster,
  PublicHex,
  SessionIdentity,
} from "../shared/types";

type Tab = "map" | "oracle" | "party" | "encounters" | "chronicle";
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
    name: "The Oakhaven Company",
    regionName: "The Western Reaches",
    pin: "",
    code: queryCode,
  });
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
    state.me.role === "player" && !state.me.characterId ? "party" : "map",
  );
  const [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
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
    ["map", Map, "Frontier"],
    ["oracle", Dices, "Oracle"],
    ["party", Users, "Party"],
    ["encounters", Swords, "Encounters"],
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
        <button className="icon-button" onClick={leave}>
          <LogOut size={18} />
        </button>
      </header>
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
          </button>
        ))}
      </nav>
      <section className="main-content">
        {tab === "map" && <MapView state={state} act={act} />}
        {tab === "oracle" && <OracleView state={state} act={act} />}
        {tab === "party" && <PartyView state={state} act={act} />}
        {tab === "encounters" && <EncounterView state={state} act={act} />}
        {tab === "chronicle" && <ChronicleView state={state} act={act} />}
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MapView({ state, act }: { state: CampaignState; act: Act }) {
  const [selectedId, setSelectedId] = useState("00"),
    [biome, setBiome] = useState("forest");
  const selected =
    state.hexes.find((hex) => hex.id === selectedId) ?? state.hexes[0];
  return (
    <div className="surface-grid map-layout">
      <section className="panel map-surface">
        <Title
          eyebrow="Shared party fog"
          title="The 19-hex frontier"
          aside={`${state.hexes.filter((h) => h.revealState !== "unexplored").length} / 19 known`}
        />
        <svg
          className="hex-map"
          viewBox="0 0 620 570"
          aria-label="Campaign hex map"
        >
          {state.hexes.map((hex) => {
            const x = 310 + 106 * (hex.q + hex.r / 2),
              y = 285 + 92 * hex.r;
            return (
              <g
                key={hex.id}
                className={`hex-cell ${hex.revealState}${selected.id === hex.id ? " selected" : ""}`}
                transform={`translate(${x} ${y})`}
                onClick={() => setSelectedId(hex.id)}
                tabIndex={0}
              >
                <polygon points="0,-56 48,-28 48,28 0,56 -48,28 -48,-28" />
                <text className="hex-id" y="-6">
                  {hex.id}
                </text>
                <text className="hex-label" y="14">
                  {hex.name
                    ? hex.name.split(" ").slice(0, 2).join(" ")
                    : "UNKNOWN"}
                </text>
                {hex.threatTier != null && (
                  <text className="hex-tier" y="32">
                    T{hex.threatTier}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="map-legend">
          <span>
            <i className="mapped" /> Explored
          </span>
          <span>
            <i className="rumored" /> Rumored
          </span>
          <span>
            <i className="unknown" /> Unknown
          </span>
        </div>
      </section>
      <aside className="map-sidebar">
        <section className="panel inspector">
          <div className="eyebrow">
            Hex {selected.id} · {selected.revealState.replace("_", " ")}
          </div>
          <h2>{selected.name ?? "Beyond the known map"}</h2>
          {selected.name ? (
            <>
              <div className="stat-row">
                <span>Biome</span>
                <b>{selected.biome}</b>
              </div>
              <div className="stat-row">
                <span>Threat</span>
                <b>Tier {selected.threatTier}</b>
              </div>
              <p>{selected.landmark}</p>
            </>
          ) : (
            <p>
              The server withholds this hex’s contents until the party reveals
              it. There is nothing to find in browser data.
            </p>
          )}
          {state.me.role === "host" &&
            selected.revealState === "unexplored" && (
              <button
                className="primary wide"
                onClick={() =>
                  act(
                    "hex:reveal",
                    { id: selected.id, revealState: "scouted" },
                    `Hex ${selected.id} revealed`,
                  )
                }
              >
                <Sparkles size={17} /> Reveal to the party
              </button>
            )}
          {state.me.role === "host" &&
            !["unexplored", "fully_mapped"].includes(selected.revealState) && (
              <button
                className="wide"
                onClick={() =>
                  act("hex:reveal", {
                    id: selected.id,
                    revealState: "fully_mapped",
                  })
                }
              >
                Mark fully mapped
              </button>
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
      {state.rooms.length > 0 && (
        <section className="panel full-span room-strip">
          <Title eyebrow="Current delve" title="Revealed chambers" />
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
      <details>
        <summary>Cultural anchors</summary>
        <p>
          <b>Homeland:</b> {character.anchors.homeland || "Unwritten"}
        </p>
        <p>
          <b>Landmark:</b> {character.anchors.landmark || "Unwritten"}
        </p>
        <p>
          <b>Nemesis:</b> {character.anchors.nemesis || "Unwritten"}
        </p>
      </details>
    </article>
  );
}

function EncounterView({ state, act }: { state: CampaignState; act: Act }) {
  const entries = Object.entries(MONSTERS),
    [monsterKey, setMonsterKey] = useState(entries[0][0]),
    [count, setCount] = useState(1);
  return (
    <div className="encounter-page">
      <div className="encounter-heading">
        <Title
          eyebrow="Monsternomicon"
          title="Encounter field board"
          aside={`${state.encounters.filter((e) => e.status === "active").length} active`}
        />
        {state.me.role === "host" && (
          <div className="start-encounter">
            <select
              value={monsterKey}
              onChange={(e) => setMonsterKey(e.target.value)}
            >
              {entries.map(([key, monster]) => (
                <option value={key} key={key}>
                  {monster.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={count}
              min="1"
              max="12"
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <button
              className="primary"
              onClick={() =>
                act(
                  "encounter:start",
                  { monsterKey, count },
                  "Encounter started",
                )
              }
            >
              <Plus size={17} /> Start
            </button>
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
                  onClick={() =>
                    act("encounter:resolve", { encounterId: encounter.id })
                  }
                >
                  Resolve
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
      <section className="panel threat-board">
        <div>
          <div className="eyebrow">Quantum arch-nemesis</div>
          <h2>Threat vectors</h2>
          <p>
            The first vector to collect three Lore Shards becomes the confirmed
            master threat.
          </p>
          <button
            onClick={() => act("threat:manifest", {}, "A threat manifested")}
          >
            <Sparkles size={17} /> Manifest a clue
          </button>
        </div>
        <div className="threat-list">
          {state.threats.map((threat) => (
            <article
              key={threat.id}
              className={threat.confirmed ? "confirmed" : ""}
            >
              <span>
                {threat.confirmed ? "CONFIRMED" : threat.key.toUpperCase()}
              </span>
              <h3>{threat.name}</h3>
              <div>
                {[0, 1, 2].map((i) => (
                  <i key={i} className={i < threat.shards ? "filled" : ""} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
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
  return (
    <article className="monster-row">
      <div className="monster-number">{index + 1}</div>
      <div className="monster-main">
        <div className="monster-name">
          <strong>{monster.name}</strong>
          <span>Lore {monster.loreTier}/4</span>
        </div>
        <div className="hp-bar">
          <i
            style={{
              width: `${Math.max(0, (monster.currentHp / monster.maxHp) * 100)}%`,
            }}
          />
        </div>
        <small>
          {monster.currentHp} / {monster.maxHp} HP
        </small>
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
          <BookOpen size={14} /> Lore
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
