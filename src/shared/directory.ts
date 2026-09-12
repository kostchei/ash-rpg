import type { CampaignState, WorldNpc } from "./types.js";
export function npcHexId(npc: WorldNpc, state: CampaignState): string | undefined {
  if (npc.locationType === "facility") {
    const facility = state.facilities?.find(f => f.id === npc.locationId);
    return facility?.locationType === "settlement" ? facility.locationId : undefined;
  }
  if (npc.locationType === "settlement") return npc.locationId === "haven-00" ? "00" : npc.locationId;
  return state.hexes.find(h => h.sites?.some(s => npc.locationId === s.id || npc.locationId.startsWith(`${s.id}:`)))?.id;
}
