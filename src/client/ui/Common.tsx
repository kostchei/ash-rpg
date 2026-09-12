import { Flame } from "lucide-react";
export function Title({
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
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={`brand${large ? " large" : ""}`}>
      <Flame size={large ? 28 : 22} />
      <span>ASH</span>
      {large && <small>TABLE COMPANION</small>}
    </div>
  );
}
export function Field({
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
