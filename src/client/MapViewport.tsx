import {
  useCallback,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

/** Pointer travel, in pixels, that separates a click on a hex from a drag of the map. */
const PAN_THRESHOLD = 4;

export interface MapViewportProps {
  viewportRef: RefObject<HTMLDivElement | null>;
  className?: string;
  ariaLabel: string;
  children: ReactNode;
}

/**
 * A scrollable map surface that can be dragged to pan. Scrolling is the browser's own, so
 * scrollbars, the mouse wheel, and arrow keys keep working; dragging simply moves the scroll
 * offsets. A drag that travels far enough swallows the click it ends on, so panning across the map
 * never selects the hex or room the pointer happens to land on.
 */
export function MapViewport({ viewportRef, className = "", ariaLabel, children }: MapViewportProps) {
  const drag = useRef<{ x: number; y: number; left: number; top: number; panned: boolean } | null>(null);
  const swallowClick = useRef(false);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const el = viewportRef.current;
      if (!el) return;
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        left: el.scrollLeft,
        top: el.scrollTop,
        panned: false,
      };
    },
    [viewportRef],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const el = viewportRef.current;
      const state = drag.current;
      if (!el || !state) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (!state.panned) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
        state.panned = true;
        el.classList.add("panning");
        el.setPointerCapture(event.pointerId);
      }
      el.scrollLeft = state.left - dx;
      el.scrollTop = state.top - dy;
    },
    [viewportRef],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const el = viewportRef.current;
      const state = drag.current;
      drag.current = null;
      if (!el || !state) return;
      if (state.panned) {
        swallowClick.current = true;
        el.classList.remove("panning");
        if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      }
    },
    [viewportRef],
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.stopPropagation();
    event.preventDefault();
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`map-viewport ${className}`.trim()}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}

/**
 * Keeps the point at the centre of the viewport centred when the zoom level changes, so zooming in
 * magnifies the ground being looked at instead of jumping to the map's top-left corner.
 */
export function useZoomAnchor(
  viewportRef: RefObject<HTMLDivElement | null>,
  zoom: number,
  setZoom: (zoom: number) => void,
): (zoom: number) => void {
  const anchor = useRef<{ fx: number; fy: number } | null>(null);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    const held = anchor.current;
    anchor.current = null;
    if (!el || !held) return;
    el.scrollLeft = held.fx * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = held.fy * el.scrollHeight - el.clientHeight / 2;
  }, [zoom, viewportRef]);

  return useCallback(
    (next: number) => {
      const el = viewportRef.current;
      if (el && el.scrollWidth > 0 && el.scrollHeight > 0) {
        anchor.current = {
          fx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
          fy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
        };
      }
      setZoom(next);
    },
    [viewportRef, setZoom],
  );
}

export interface ZoomSliderProps {
  zoom: number;
  onZoom: (zoom: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
}

export function ZoomSlider({ zoom, onZoom, min, max, step, label }: ZoomSliderProps) {
  return (
    <div className="map-zoom">
      <button
        type="button"
        aria-label="Zoom out map"
        disabled={zoom <= min}
        onClick={() => onZoom(Math.max(min, Number((zoom - step).toFixed(2))))}
      >
        −
      </button>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={zoom}
        onChange={(event) => onZoom(Number(event.target.value))}
      />
      <button
        type="button"
        aria-label="Zoom in map"
        disabled={zoom >= max}
        onClick={() => onZoom(Math.min(max, Number((zoom + step).toFixed(2))))}
      >
        +
      </button>
      <span className="map-zoom-readout">{Math.round(zoom * 100)}%</span>
    </div>
  );
}
