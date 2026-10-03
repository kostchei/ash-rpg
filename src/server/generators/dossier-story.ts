// Versioned, authored source tables. Generation selects text and fills explicit
// record references; it does not ask a model to invent connective prose.
export const STORY_TABLE_VERSION = '1';
export const ZONE_SCENES = {
  midnight_sun: ['Sea spray freezes along the landing ropes. Turf roofs and carved prows shelter beneath the basalt cliffs.', 'Pale light lies across the fjord. Smoke rises from the longhouses while armed skiffs watch the narrow passages.', 'Meltwater runs between the standing stones. Beyond the sheltered farms, snow still fills the mountain cuts.'],
  the_gloaming: ['Mist gathers between the trees and the old boundary stones. The nearest hearth is already hidden behind the branches.', 'Dark water fills the cart ruts. Smoke hangs over the clearing, and the barrow path disappears into the wood.', 'Reeds scrape the causeway. Beyond the last worked field, a line of ancient trees hides the road.'],
  red_sands: ['Heat shimmers above the stone flats. Caravans gather where the last shade reaches the well.', 'Wind carries red dust through the abandoned walls. The nearest water lies beyond a narrow canyon pass.', 'The dune crests shift above buried masonry. Travellers argue over water and the right to use the old road.'],
  river_of_night: ['Rain ticks against the broad leaves. The river carries dark silt past the landing steps.', 'Roots grip the old stonework. A narrow trail leaves the cultivated bank and vanishes beneath the canopy.', 'Mist rises from the flooded low ground. Beyond the fish traps, the river bends toward ruined terraces.'],
  dwellers_in_the_deep: ['Water falls somewhere beyond the lamplight. The stone passage carries a cold draught from the deeper galleries.', 'Mineral stains mark the height of an old flood. The inhabited ledges end at a stair cut into darkness.', 'The cavern roof disappears above the lamps. A rope crossing leads toward abandoned stone chambers.'],
  city_of_masks: ['Canal water laps against the landing. Above it, shuttered galleries overlook the crowded quay.', 'Rain darkens the piazza stones. Messengers cross the bridges while watchmen check the gates.', 'Barges crowd the market reach. Behind the warehouses, an old passage leaves the public streets.'],
};
export const SITE_SCENES: Record<string, string[]> = {
  caves: ['A low entrance leads into uneven galleries. Narrow shelves overlook the passage, and several exits are hidden by changes in level.', 'Water and loose stone divide the chambers. A straight approach exposes visitors to anyone watching from the deeper ledges.'],
  'deep tunnels': ['The entrance drops into a worked passage. Old side doors and service cuts make the apparent main route only one way through.', 'A long descent opens into intersecting galleries. Sound carries far enough to warn the occupants before intruders reach them.'],
  ruins: ['Broken walls separate sheltered courts from exposed approaches. Old doorways still control movement between the surviving rooms.', 'The outer walls have fallen, but the inner thresholds remain. Occupants can watch an approach without revealing the route behind them.'],
  tomb: ['Burial passages branch from a narrow entry hall. Memorials and sealed thresholds distinguish the older chambers from later additions.', 'A descending stair reaches the burial rooms. Heavy doors divide the galleries, and the deepest approach offers little room to retreat.'],
};
export const NPC_APPEARANCE = ['A weathered travelling coat is carefully patched at the elbows.', 'A bundle of notes and practical tools hangs beside a well-used shoulder bag.', 'Their cloak is neatly fastened, but the hem shows the wear of a long journey.', 'They keep their possessions close and stop frequently to examine the route.', 'A repaired belt and mud-stained boots suggest more travel than comfort.'];
export const ENCOUNTER_ACTIVITY = {
  vampire: ['The vampire receives visitors beside a covered resting place and asks what they are prepared to offer.', 'The vampire watches the approach from shelter, letting a visitor speak before moving into view.'],
  demon_balor: ['The Balor occupies an open approach, where its wings and whip have room to move.', 'The Balor studies the arrivals before committing to violence. Its reaction determines whether the meeting begins with words or an attack.'],
  nord: ['The crew hold the crossing behind their shields. Their serpent companion occupies the water below; no magical bond is assumed.', 'The crew gather at a waterside landing. The serpent is nearby, making an assault on the boats dangerous.'],
  default: ['The creature occupies the approach to the associated site. Its rolled reaction determines how it responds to visitors.', 'The creature is present near the associated site. Resolve its rolled reaction before choosing violence.'],
};
export const JOB_STAKES = ['The local faction wants the work completed before rivals can claim its outcome. Failure leaves the claim unsettled; success gives the party a result they can bring back and defend.', 'The job offers a way to settle a dispute over access. Taking the reward without completing the objectives leaves the route and its claim unresolved.', 'The request has become a public test of the faction’s promises. Completing the objectives supplies a concrete result; abandoning them sends the dispute back to the assembly.'];
export const MOTIVE_SENTENCES: Record<string, string> = {
  'Seeking Hire': '{name} is looking for an expedition to join as a paid retainer.',
  'Hunting a Nemesis': '{name} is tracking an outlaw, monster or rival who has fled into the wilds.',
  'Escaping a Debt': '{name} is hiding from a collector or bounty hunter.',
  'Caravan Escort': '{name} is guiding a trade caravan toward the next frontier settlement.',
  'Lost Heirloom': '{name} is searching the nearby wilderness for a family relic.',
  'Spiritual Pilgrimage': '{name} is travelling to a shrine or megalith in the hope of lifting a curse.',
  'Selling Rare Salvage': '{name} has rare salvage to sell, including reagents or ancient scrolls.',
  'Undercover Informant': '{name} secretly gathers information for a faction or local ruler.',
  'Wounded Survivor': '{name} is the only survivor of a destroyed adventuring party.',
  'Challenging Champions': '{name} seeks an honourable duel to prove their prowess.',
  'Seeking Strange Reagents': '{name} needs two fresh venom glands or rare herbs.',
  'Carrying Dire Warning': '{name} warns that an invading warband or a catastrophe is two days away.',
};
export const OBJECTIVE_VERBS: Record<string, string> = {
  recover_relic: 'Recover', treasure_cache: 'Secure', rescue_captive: 'Rescue', rescue_companion: 'Rescue',
  assassinate_leader: 'The contract calls for the assassination of', defeat_guardian: 'Overcome', monster_eggs: 'Recover',
  harvest_components: 'Collect', exotic_materials: 'Collect', lift_curse: 'Lift the curse affecting', break_ward: 'Break',
  learn_secret: 'Examine', clear_border: 'Clear', secure_chokepoint: 'Secure', secure_descent: 'Secure',
};
