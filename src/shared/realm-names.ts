import type { CursedZoneId } from "./types.js";

export const REALM_SETTINGS: { id: CursedZoneId; label: string; names: readonly string[] }[] = [
  { id: "the_gloaming", label: "Rural Woods", names: [
    "Wychfen", "Ballymorrow", "Glenmalloch", "Blackthorn Wold", "Dunhallow",
    "Caer Dubh", "Hagbourne", "Wyrmswood", "Kilbracken", "Crowsmere",
  ] },
  { id: "red_sands", label: "Faded Desert", names: [
    "The Silt Sea", "The Red Sands", "The Empty Quarter", "The Ifrit Wastes", "The Brass Expanse",
    "The Ashen Dunes", "The Ember Sea", "The Scorched Kingdom", "The Djinn's Furnace", "The Cinder Marches",
  ] },
  { id: "city_of_masks", label: "Splendid City", names: [
    "Marg", "Quodeth", "Lomar", "Katagia", "Meridia",
    "Kuthchemes", "Xuthal", "Manshaka", "Zarathul", "Velthar",
  ] },
  { id: "midnight_sun", label: "Frozen Coast", names: [
    "Hrafnfjord", "Skallvik", "Isenholm", "Vargstrand", "Niflheim Coast",
    "Frosthavn", "Jarnvik", "Skeldfjord", "Hrimnes", "Draugrholm",
  ] },
  { id: "dwellers_in_the_deep", label: "UnderDark", names: [
    "The Sunless Sea", "Utterdark", "Morzamotha", "The Hollow Deep", "The Obsidian Vaults",
    "The Night Below", "The Silent Abyss", "Nhal Dûm", "The Pale Chasm", "The Black Descent",
  ] },
  { id: "river_of_night", label: "Primeval Jungle", names: [
    "Xaltemoc", "Itzamal", "Coatzal", "Tlalocan", "Ocelotlan",
    "Mazatla", "Xochimal", "Nkalembe", "Mbanza Koro", "Zambala",
  ] },
];

/** Pick a fresh name per setting, excluding the previous draw. */
export function drawRealmNames(previous: Partial<Record<CursedZoneId, string>> = {}): Record<CursedZoneId, string> {
  return Object.fromEntries(REALM_SETTINGS.map(({ id, names }) => {
    const choices = names.filter((name) => name !== previous[id]);
    return [id, choices[Math.floor(Math.random() * choices.length)]];
  })) as Record<CursedZoneId, string>;
}
