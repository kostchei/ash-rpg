import { expect, it } from "vitest";
import { weaponReference } from "../src/shared/table-companion.js";

it.each([
  { properties: [], str: 18, dex: 10, attack: 4 },
  { properties: [], str: 3, dex: 10, attack: -4 },
  { properties: ["finesse"], str: 10, dex: 18, attack: 4 },
  { properties: ["ranged"], str: 18, dex: 18, attack: 4 },
])("excludes ability modifiers from damage: %o", ({ properties, str, dex, attack }) => {
  const character = { className: "Thief", level: 1, abilities: { str, dex } };
  const weapon = { instanceId: "test", itemId: "test", name: "Test weapon", kind: "weapon" as const, slots: 1, damage: "1d8", properties };
  expect(weaponReference(character, weapon)).toEqual({ attackBonus: attack, damageBonus: 0, damageDie: "1d8" });
  expect(weaponReference({ ...character, className: "Fighter", level: 3,
    classChoices: { masteredWeapon: "test" }, talents: ["+1 to melee and ranged damage rolls"],
  }, weapon)).toEqual({ attackBonus: attack + 1, damageBonus: 3, damageDie: "1d8" });
});
