import { useState, useEffect } from "react";
import { Music, ExternalLink, Pin, ChevronLeft } from "lucide-react";

export interface MusicServerState {
  running: boolean;
  busy: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  pinned: boolean;
  setPinned: (pinned: boolean) => void;
  togglePinned: () => void;
  startServer: () => Promise<void>;
}

export function useMusicServer(): MusicServerState {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/music-server/status");
      if (res.ok) {
        const data = await res.json();
        setRunning(!!data.running);
      }
    } catch {
      setRunning(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const startServer = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/music-server/start", { method: "POST" });
      const data = await res.json();
      if (data.ok || data.running) {
        setRunning(true);
        setDrawerOpen(true);
      } else {
        alert(data.error || "Failed to start music server.");
      }
    } catch (err: any) {
      alert(`Error starting music server: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleDrawer = () => {
    if (!running) {
      startServer();
    } else {
      setDrawerOpen(!drawerOpen);
    }
  };

  const togglePinned = () => {
    setPinned(!pinned);
  };

  return {
    running,
    busy,
    drawerOpen,
    setDrawerOpen,
    toggleDrawer,
    pinned,
    setPinned,
    togglePinned,
    startServer,
  };
}

export function MusicSidebarButton({
  state,
}: {
  state: MusicServerState;
}) {
  const { running, busy, drawerOpen, toggleDrawer } = state;
  return (
    <button
      className={`app-nav-music-btn ${drawerOpen ? "active" : ""}`}
      onClick={toggleDrawer}
      title={
        running
          ? drawerOpen
            ? "Close Music Player Panel"
            : "Open Music Player Panel"
          : "Click to start Heavy Metal Music Server"
      }
      aria-label="Toggle Heavy Metal Music Player"
    >
      <div className="music-icon-wrapper">
        <Music size={18} />
        {running && <span className="music-pulse-dot" />}
      </div>
      <span>Music</span>
      {busy && <span className="music-busy-badge">...</span>}
    </button>
  );
}

export function MusicSideDrawer({
  state,
}: {
  state: MusicServerState;
}) {
  const { running, busy, drawerOpen, setDrawerOpen, pinned, togglePinned, startServer } = state;

  return (
    <aside
      className={`music-side-drawer ${drawerOpen ? "open" : "closed"} ${pinned ? "pinned" : ""}`}
      aria-label="Heavy Metal Music Player"
    >
      <div className="music-drawer-header">
        <div className="drawer-title-group">
          <span className="drawer-fire-icon">⚔️</span>
          <div>
            <h3 className="drawer-title">Iron &amp; Cosmos</h3>
            <span className="drawer-subtitle">Heavy Metal Looper</span>
          </div>
        </div>

        <div className="drawer-actions">
          {running ? (
            <span className="status-badge online" title="Server is actively serving on port 5050">
              <span className="status-dot-mini" /> Online
            </span>
          ) : (
            <span className="status-badge offline" title="Server offline">
              Offline
            </span>
          )}

          <button
            className={`btn-drawer-icon ${pinned ? "active" : ""}`}
            onClick={togglePinned}
            title={pinned ? "Unpin (float over screen)" : "Pin to side (shifts game board side-by-side)"}
          >
            <Pin size={14} />
          </button>

          <a
            href="http://localhost:5050"
            target="_blank"
            rel="noreferrer"
            className="btn-drawer-icon"
            title="Open in Full Browser Tab"
          >
            <ExternalLink size={14} />
          </a>

          <button
            className="btn-drawer-icon close-btn"
            onClick={() => setDrawerOpen(false)}
            title="Collapse Player Panel"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div className="music-drawer-content">
        {running ? (
          <iframe
            src="http://localhost:5050"
            title="Iron & Cosmos Heavy Metal Player"
            className="music-iframe"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          />
        ) : (
          <div className="music-drawer-offline">
            <div className="offline-card">
              <div className="offline-icon">⚡</div>
              <h4>Heavy Metal Engine Offline</h4>
              <p>
                Looping sets for <strong>The Gates of Slumber</strong>, <strong>Liege Lord</strong>,{" "}
                <strong>Manilla Road</strong>, <strong>Hawkwind</strong>, <strong>Cirith Ungol</strong>, and 12 other pillars.
              </p>
              <button
                className="btn-start-server"
                onClick={startServer}
                disabled={busy}
              >
                {busy ? "Starting Python Server..." : "⚡ Start Music Server"}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MusicServerControl({
  state,
  compact = false,
}: {
  state?: MusicServerState;
  compact?: boolean;
}) {
  const localState = useMusicServer();
  const s = state || localState;

  return (
    <button
      className="btn-hig music-header-btn"
      style={{
        padding: compact ? "4px 8px" : "4px 10px",
        fontSize: "12px",
        gap: "5px",
        display: "inline-flex",
        alignItems: "center",
        borderColor: s.running ? "#c59b27" : undefined,
        background: s.running ? "rgba(197, 155, 39, 0.15)" : undefined,
      }}
      onClick={s.toggleDrawer}
      disabled={s.busy}
      title={
        s.running
          ? s.drawerOpen
            ? "Hide Music Player"
            : "Show Music Player"
          : "Click to start the Heavy Metal YouTube & Looper Music Server"
      }
    >
      <Music size={13} color={s.running ? "#f1c40f" : undefined} />
      {s.busy ? (
        <span>Starting Server...</span>
      ) : s.running ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          Music Player
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#2ecc71",
              boxShadow: "0 0 6px #2ecc71",
            }}
          />
        </span>
      ) : (
        <span>Start Music Server</span>
      )}
    </button>
  );
}
