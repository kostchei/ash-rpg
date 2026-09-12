import { useEffect, useState } from "react";
import type { CampaignState } from "../shared/types";
export function LanDiscoveryPanel({ state }: { state: CampaignState }) {
  const [interfaces, setInterfaces] = useState<
    Array<{ name: string; address: string; isWifi: boolean; isEthernet: boolean; priority: number }>
  >([]);
  const [selectedIp, setSelectedIp] = useState<string>(() => {
    const locHost = typeof window !== "undefined" ? window.location.hostname : "";
    if (locHost && locHost !== "localhost" && locHost !== "127.0.0.1") {
      return locHost;
    }
    try {
      const u = new URL(state.campaign.joinUrl);
      if (u.hostname && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
        return u.hostname;
      }
    } catch {}
    return "localhost";
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/network/interfaces")
      .then((r) => r.json())
      .then((data) => {
        if (data.interfaces && Array.isArray(data.interfaces)) {
          setInterfaces(data.interfaces);
          if ((selectedIp === "localhost" || selectedIp === "127.0.0.1") && data.current?.address) {
            setSelectedIp(data.current.address);
          }
        }
      })
      .catch(() => {});
  }, []);

  const port = typeof window !== "undefined" && window.location.port ? window.location.port : "3000";
  const protocol = typeof window !== "undefined" && window.location.protocol ? window.location.protocol : "http:";
  const effectiveBaseUrl =
    selectedIp === "localhost"
      ? `${protocol}//localhost:${port}`
      : `${protocol}//${selectedIp}:${port}`;
  const effectiveJoinUrl = `${effectiveBaseUrl}/play?code=${state.campaign.code}`;
  const qrSrc = `/api/campaigns/${state.campaign.code}/qr?ip=${encodeURIComponent(selectedIp)}`;
  const activeIface = interfaces.find((i) => i.address === selectedIp);

  return (
    <div className="lan-discovery-box">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--moss)", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>📶 HOME WI-FI & PHONE QR DISCOVERY</span>
          {activeIface && (
            <span className="badge-tag" style={{ background: "rgba(131, 155, 87, 0.2)", color: "var(--moss)", fontSize: "11px" }}>
              {activeIface.name} ({selectedIp})
            </span>
          )}
        </div>
        {interfaces.length > 1 && (
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
            <span>Network:</span>
            <select
              className="interface-select"
              value={selectedIp}
              onChange={(e) => setSelectedIp(e.target.value)}
            >
              {interfaces.map((iface) => (
                <option key={iface.address} value={iface.address}>
                  {iface.name} ({iface.address}){iface.isWifi ? " · Wi-Fi" : iface.isEthernet ? " · Wired" : ""}
                </option>
              ))}
              <option value="localhost">localhost (this PC only)</option>
            </select>
          </label>
        )}
      </div>

      <div className="lan-discovery-row">
        <img
          src={qrSrc}
          alt={`Join QR code for campaign ${state.campaign.code}`}
          className="lan-qr-img"
        />
        <div style={{ flex: 1, minWidth: "240px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
            Scan with phone camera on your home Wi-Fi:
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
            <input
              type="text"
              readOnly
              value={effectiveJoinUrl}
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "13px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--ink)",
              }}
            />
            <button
              type="button"
              className="small-btn primary"
              onClick={() => {
                navigator.clipboard.writeText(effectiveJoinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>
            Connect phones to the same Wi-Fi. Scanned phones immediately open their responsive digital character sheet.
          </small>
        </div>
      </div>
    </div>
  );
}

