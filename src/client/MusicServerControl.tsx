import { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Music, ExternalLink, Play, CheckCircle } from "lucide-react";

export function MusicServerControl({ compact = false }: { compact?: boolean }) {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  const handleStart = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/music-server/start", { method: "POST" });
      const data = await res.json();
      if (data.ok || data.running) {
        setRunning(true);
        setShowModal(true);
      } else {
        alert(data.error || "Failed to start music server.");
      }
    } catch (err: any) {
      alert(`Error starting music server: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (running) {
      setShowModal(true);
    } else {
      handleStart();
    }
  };

  return (
    <>
      <button
        className="btn-hig"
        style={{
          padding: compact ? "4px 8px" : "4px 10px",
          fontSize: "12px",
          gap: "5px",
          display: "inline-flex",
          alignItems: "center",
          borderColor: running ? "#c59b27" : undefined,
          background: running ? "rgba(197, 155, 39, 0.15)" : undefined,
        }}
        onClick={handleClick}
        disabled={busy}
        title={
          running
            ? "Music Server is Online: Click to Open Player"
            : "Click to start the Heavy Metal YouTube & Looper Music Server"
        }
      >
        <Music size={13} color={running ? "#f1c40f" : undefined} />
        {busy ? (
          <span>Starting Server...</span>
        ) : running ? (
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

      {showModal && (
        <Modal
          title="Chronicles of Iron & Cosmos | Heavy Metal Music Player & Looper"
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "82vh", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 8px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "#aaa" }}>
                Running locally at <strong>http://localhost:5050</strong>
              </span>
              <a
                href="http://localhost:5050"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#f1c40f",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Open in Full Window / New Tab <ExternalLink size={13} />
              </a>
            </div>

            <iframe
              src="http://localhost:5050"
              title="Music Player"
              style={{
                width: "100%",
                flex: 1,
                border: "1px solid #333",
                borderRadius: "8px",
                background: "#090a0d",
              }}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
