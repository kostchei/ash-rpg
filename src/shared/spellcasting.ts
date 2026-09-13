import { CLASSES } from "./content.js";

export type CastingTradition = "arcane" | "divine" | "primal" | "occult";

/**
 * Which tradition a cast belongs to. A caster class's own tradition wins — a
 * Warlock reading a divine scroll is still working occult — and otherwise the
 * spell's own sphere decides.
 */
export function resolveCastingTradition(className: string, sphere?: string): CastingTradition {
  const classDef = CLASSES.find((c) => c.name.toLowerCase() === className.toLowerCase());
  if (classDef?.spellcasting) return classDef.spellcasting.type;
  if (sphere === "arcane" || sphere === "divine" || sphere === "primal" || sphere === "occult") {
    return sphere;
  }
  throw new Error(`Cannot resolve a casting tradition for "${className}" casting a "${sphere}" spell`);
}

/** The ability a tradition rolls its spellcasting checks with. */
export function castingAbilityFor(tradition: CastingTradition): "int" | "wis" | "cha" {
  switch (tradition) {
    case "arcane":
      return "int";
    case "divine":
    case "primal":
      return "wis";
    case "occult":
      return "cha";
  }
}
