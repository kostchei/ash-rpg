import { useId, useState } from "react";
import { Dices } from "lucide-react";
import { randomAnchorName } from "../shared/character-names";

type Kind = "contact" | "nemesis" | "landmark";
const templates: Record<Kind, readonly string[]> = {
  contact: ["** the fence", "** the banker", "Guildmaster **", "** the smith", "** the sage", "** the barkeep"],
  nemesis: ["Fought a duel with **", "Harried by **", "Ex-lover **", "** the mother-in-law"],
  landmark: ["The ** Barrow", "The Great Temple of **", "** Inn", "Shrine of **", "Rift to **"],
};
const pick = (items: readonly string[]) => items[Math.floor(Math.random() * items.length)];
function suggestions(kind: Kind) {
  return templates[kind].map((template, index) => {
    const name = randomAnchorName();
    const place = `${pick(["Ash", "Moon", "Thorn", "Raven", "Ember", "Winter"])}${pick(["fall", "mere", "watch", "hollow", "reach"])}`;
    const title = kind !== "landmark" ? name
      : index === 1 || index === 3 ? name
      : index === 2 ? pick(["The Silver Stag", "The Wandering Lantern", "The Fox and Crown", place])
      : index === 4 ? pick([place, "the Sea of Forgotten Stars", "the Dreaming Beyond"])
      : pick([place, "Sleeping King", "Seven Crowns", "Hollow Moon"]);
    return template.replace("**", title);
  });
}

export function AnchorField({ kind, label, value, onChange }: {
  kind: Kind; label: string; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const [options, setOptions] = useState(() => suggestions(kind));
  const append = (option: string) => value.trim() ? `${value.trim()}\n${option}` : option;
  return (
    <div className="anchor-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} maxLength={500} rows={3}
        aria-describedby={`${id}-help`}
        placeholder="Write your own, or add a suggestion…"
        onChange={(event) => onChange(event.target.value)} />
      <small id={`${id}-help`}>Tap a suggestion to add it. Edit any name or detail above, or write another.</small>
      <div className="anchor-suggestions" aria-label={`${label} suggestions`}>
        {options.map((option) => (
          <button type="button" key={option} disabled={append(option).length > 500}
            onClick={() => onChange(append(option))}>+ {option}</button>
        ))}
      </div>
      <button type="button" className="anchor-reroll" onClick={() => setOptions(suggestions(kind))}>
        <Dices size={14} aria-hidden="true" /> New suggestions
      </button>
    </div>
  );
}
