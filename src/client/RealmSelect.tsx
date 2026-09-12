import { useRef, useState, type SelectHTMLAttributes } from "react";
import { flushSync } from "react-dom";
import { drawRealmNames, REALM_SETTINGS } from "../shared/realm-names";

export function RealmSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const [names, setNames] = useState(drawRealmNames);
  const keyboardOpen = useRef(false);
  const refresh = () => flushSync(() => setNames((previous) => drawRealmNames(previous)));

  return (
    <select
      {...props}
      onPointerDown={(event) => {
        if (event.button === 0) refresh();
        props.onPointerDown?.(event);
      }}
      onKeyDown={(event) => {
        const opens = event.key === " " || event.key === "Enter" || event.key === "F4" || (event.altKey && event.key === "ArrowDown");
        if (opens && !event.repeat && !keyboardOpen.current) {
          refresh();
          keyboardOpen.current = true;
        } else if (event.key === "Escape" || event.key === "Enter") {
          keyboardOpen.current = false;
        }
        props.onKeyDown?.(event);
      }}
      onChange={(event) => {
        keyboardOpen.current = false;
        props.onChange?.(event);
      }}
      onBlur={(event) => {
        keyboardOpen.current = false;
        props.onBlur?.(event);
      }}
    >
      {REALM_SETTINGS.map(({ id, label }) => (
        <option key={id} value={id}>{label} — {names[id]}</option>
      ))}
    </select>
  );
}
