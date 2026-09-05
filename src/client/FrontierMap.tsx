import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { PublicHex } from "../shared/types";
import { HEX_DIRECTIONS, HEX_POLYGON, HEX_RADIUS, HEX_WIDTH, hexCenter, mapConnections, mapLabel, terrainTile, pointOfInterestTile, routeArtwork, isWaterRoute, wrapMapLabel } from "./hex-cartography";

interface FrontierMapProps {
  hexes: PublicHex[];
  selectedId: string;
  onSelect: (id: string) => void;
  partyLocation: { q: number; r: number };
}

export function FrontierMap({ hexes, selectedId, onSelect, partyLocation }: FrontierMapProps) {
  const [zoom, setZoom] = useState(1);
  const clipId = useId().replaceAll(":", "");
  if (!hexes.length) return <p>No hexes have been charted.</p>;
  const centers = hexes.map(hexCenter);
  const minX = Math.min(...centers.map((p) => p.x)) - HEX_WIDTH / 2 - 24;
  const minY = Math.min(...centers.map((p) => p.y)) - HEX_RADIUS - 24;
  const width = Math.max(...centers.map((p) => p.x)) + HEX_WIDTH / 2 + 24 - minX;
  const height = Math.max(...centers.map((p) => p.y)) + HEX_RADIUS + 24 - minY;
  const routes = mapConnections(hexes);
  const selected = hexes.find((hex) => hex.id === selectedId);
  const party = hexCenter(partyLocation);
  const destinations = hexes.filter((hex) => hex.exitDestination);

  return (
    <div className="frontier-atlas">
      <div className="atlas-toolbar">
        <span>FIELD MAP <span className="atlas-toolbar-dot">·</span> Select a hex to inspect</span>
        <div className="atlas-zoom">
          <button type="button" aria-label="Zoom out map" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.25))}><Minus size={15} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in map" disabled={zoom >= 2} onClick={() => setZoom(Math.min(2, zoom + 0.25))}><Plus size={15} /></button>
        </div>
      </div>
      <div className="atlas-scroll" tabIndex={0} role="region" aria-label="Scrollable frontier map">
        <svg className="hex-map" viewBox={`${minX} ${minY} ${width} ${height}`} style={{ width: `${zoom * 100}%` }} aria-label="Campaign hex map">
          <defs>
            <clipPath id={clipId}><polygon points={HEX_POLYGON} transform="scale(0.94)" /></clipPath>
          </defs>
          <g className="map-cells">
            {hexes.map((hex) => {
              const { x, y } = hexCenter(hex);
              return (
                <g key={hex.id} className={`hex-cell ${hex.revealState}`} transform={`translate(${x} ${y})`}
                  role="button" tabIndex={0} aria-pressed={selectedId === hex.id}
                  aria-label={`Hex ${hex.id}: ${mapLabel(hex)}, ${hex.revealState.replaceAll("_", " ")}`}
                  onClick={() => onSelect(hex.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(hex.id); } }}>
                  <title>{`Hex ${hex.id} · ${mapLabel(hex)}`}</title>
                  <polygon className="hex-poly" points={HEX_POLYGON} />
                </g>
              );
            })}
          </g>
          <g className="map-terrain" aria-hidden="true">
            {hexes.map((hex) => {
              const tile = terrainTile(hex), { x, y } = hexCenter(hex);
              return tile && <image key={hex.id} href={tile} x={-HEX_WIDTH / 2} y={-HEX_RADIUS} width={HEX_WIDTH} height={HEX_RADIUS * 2}
                preserveAspectRatio="none" transform={`translate(${x} ${y})`} clipPath={`url(#${clipId})`} />;
            })}
          </g>
          <g className="map-routes" aria-hidden="true">
            {hexes.map((hex) => {
              const { x, y } = hexCenter(hex);
              return <g key={hex.id} transform={`translate(${x} ${y})`}>
                {routeArtwork(hex, routes).map((art, index) => {
                  if (art.url) return <image key={index} href={art.url} x={-HEX_WIDTH / 2} y={-HEX_RADIUS} width={HEX_WIDTH} height={HEX_RADIUS * 2} preserveAspectRatio="none" />;
                  const end = hexCenter(HEX_DIRECTIONS[art.edge!]);
                  return <path key={index} d={`M 0 0 L ${end.x / 2} ${end.y / 2}`} className={art.water ? "atlas-river" : "atlas-road"} />;
                })}
              </g>;
            })}
            {routes.filter((route) => !HEX_DIRECTIONS.some((d) => d.q === route.to.q - route.from.q && d.r === route.to.r - route.from.r)).map((route) => {
              const from = hexCenter(route.from), to = hexCenter(route.to);
              const water = isWaterRoute(route.kind);
              const bend = water ? 13 : 0;
              return <path key={route.id} d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2 + bend} ${(from.y + to.y) / 2 - bend} ${to.x} ${to.y}`}
                className={water ? "atlas-river" : `atlas-road ${route.kind === "trail" ? "trail" : ""}`} />;
            })}
          </g>
          <g className="map-labels" aria-hidden="true">
            {hexes.map((hex) => {
              const { x, y } = hexCenter(hex), site = pointOfInterestTile(hex);
              const known = hex.revealState !== "unexplored";
              return (
                <g key={hex.id} transform={`translate(${x} ${y})`} className={known ? "charted-label" : "uncharted-label"}>
                  <text className="hex-id" x="-25" y="-46">{hex.id}</text>
                  {site && <>
                    <ellipse className="hex-site-paper" cx="0" cy="-18" rx="50" ry="28" />
                    <image className="hex-symbol" href={site} x={-HEX_WIDTH / 2} y={-HEX_RADIUS} width={HEX_WIDTH} height={HEX_RADIUS * 2} preserveAspectRatio="none" clipPath={`url(#${clipId})`} />
                  </>}
                  {!known && <text className="hex-unknown-symbol" y="-2">?</text>}
                  {wrapMapLabel(mapLabel(hex)).map((line, index) => <text key={index} className="hex-label" y={29 + index * 14}>{line}</text>)}
                  {known && hex.threatTier != null && <text className="hex-tier" y="60">T{hex.threatTier}{hex.elevation != null ? ` · Elev ${hex.elevation}` : ""}</text>}
                  {hex.revealState === "rumored" && <circle className="hex-rumor-mark" cx="43" cy="-25" r="3" />}
                </g>
              );
            })}
          </g>
          {selected && <polygon className="hex-selection" points={HEX_POLYGON} transform={`translate(${hexCenter(selected).x} ${hexCenter(selected).y})`} />}
          <g className="party-marker-group" transform={`translate(${party.x} ${party.y - 53})`} aria-label="Party location">
            <circle r="10" />
            <path d="M -4 4 L 0 -5 L 4 4 L 0 2 Z" />
          </g>
        </svg>
      </div>
      <div className="map-legend">
        <span><i className="mapped" /> Charted</span>
        <span><i className="unknown" /> Uncharted</span>
        <span><i className="rumored" /> Rumored</span>
        <span><i className="legend-road" /> Road / trail</span>
        <span><i className="legend-river" /> Waterway</span>
        <span><i className="legend-party" /> Party</span>
      </div>
      {destinations.length > 0 && <div className="atlas-destinations">
        {destinations.map((hex) => <button type="button" key={hex.id} onClick={() => onSelect(hex.id)}><span>{hex.id}</span> {hex.exitDestination!.replace("➔", "").trim()} ↗</button>)}
      </div>}
      <p className="atlas-credit">Cartography: <a href="https://ipainthings.itch.io/hexcrawltiles" target="_blank" rel="noreferrer">Hexcrawl Hex Tiles</a> · Dungeon Architecture</p>
    </div>
  );
}
