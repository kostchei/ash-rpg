import type { ReactNode } from "react";
export function TableCompanionLayout({ map, encounter, players }: { map: ReactNode; encounter: ReactNode; players: ReactNode }) {
  return <div className="table-companion-layout"><section className="table-map" aria-label="Map and sites">{map}</section><section className="table-encounter" aria-label="Encounter and initiative">{encounter}</section><section className="table-players">{players}</section></div>;
}
