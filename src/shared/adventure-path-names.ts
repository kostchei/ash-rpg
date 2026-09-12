/** Display names are independent of the stable IDs stored in campaign saves. */
export function adventurePathDisplayName(pathId: string, fallback: string): string {
  switch (pathId) {
    case "the_mind_below":
      return "The Night Below";
    case "vanishing_middle":
      return "The Eternal Cycle";
    default:
      return fallback;
  }
}
