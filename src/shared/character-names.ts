const NAME_LISTS: Record<string, readonly string[]> = {
  Dwarf: "Hilde Torbin Marga Bruno Karina Naugrim Brenna Darvin Elga Alric Isolde Gendry Bruga Junnor Vidrid Torson Brielle Ulfgar Sarna Grimm".split(" "),
  Elf: "Eliara Ryarn Sariel Tirolas Galira Varos Daeniel Axidor Hiralia Cyrwin Lothiel Zaphiel Nayra Ithior Amriel Elyon Jirwyn Natinel Fiora Ruhiel".split(" "),
  Goblin: "Iggs Tark Nix Lenk Roke Fitz Tila Riggs Prim Zeb Finn Borg Yark Deeg Nibs Brak Fink Rizzo Squib Grix".split(" "),
  Halfling: "Willow Benny Annie Tucker Marie Hobb Cora Gordie Rose Ardo Alma Norbert Jennie Barvin Tilly Pike Lydia Marlow Astrid Jasper".split(" "),
  "Half-Orc": "Vara Gralk Ranna Korv Zasha Hrogar Klara Tragan Brolga Drago Yelena Krull Ulara Tulk Shiraal Wulf Ivara Hirok Aja Zoraan".split(" "),
  Human: "Zali Bram Clara Nattias Rina Denton Mirena Aran Morgan Giralt Tamra Oscar Ishana Rogar Jasmin Tarin Yuri Malchor Lienna Godfrey".split(" "),
};

const PREFIXES = "Ar Mar Il Rin Gir El Nev Rom Jaf Bran".split(" ");
const SUFFIXES = "fen ten esa ien an tor ilo ek ora as".split(" ");
const ANCESTRY_LIST: Record<string, string> = {
  "High Elf": "Elf", "Wood Elf": "Elf", Drow: "Elf", Orc: "Half-Orc", Derro: "Dwarf",
};

/** Half table names, half independently rolled parts; other ancestries use the full table. */
export function randomCharacterName(ancestry: string, random = Math.random): string {
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  if (random() < 0.5) {
    const names = NAME_LISTS[ANCESTRY_LIST[ancestry] ?? ancestry]
      ?? Object.values(NAME_LISTS).flat();
    return pick(names);
  }
  return pick(PREFIXES) + pick(SUFFIXES);
}

/** Anchor NPCs: 20% three-letter names, 60% standard names, 20% elaborate names. */
export function randomAnchorName(random = Math.random): string {
  const pick = (items: readonly string[]) => items[Math.floor(random() * items.length)];
  const style = random();
  if (style < 0.2) {
    return pick("B D F G H J K L M N P R S T V Z".split(" "))
      + pick(["a", "e", "i", "o", "u"])
      + pick("b d f g k l m n p r s t v x z".split(" "));
  }
  const name = randomCharacterName("", random);
  if (style < 0.8) return name;
  return `${name} ${randomCharacterName("", random)} of the ${pick(["Seven", "Silent", "Shattered", "Hidden", "Silver", "Burning"])} ${pick(["Stars", "Gates", "Crowns", "Spires", "Isles", "Oaths"])}`;
}
