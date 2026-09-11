import type { EncounterPack, OuterPathId, PathInteraction, PathMonster } from "../../../shared/path-encounters.js";

interface Theme {
  title: string; sites: [string, string, string, string, string, string, string];
  terrain: string; npc: string; wants: string; refuses: string;
  evidenceA: string; evidenceB: string; preparationA: string; preparationB: string;
  finaleA: string; finaleB: string; price: string; benefit: string; release: string;
  asset: string; consequence: string;
  monsters: [string, string, string]; jobs: [string, string, string];
  tactics: [string, string, string];
}
const THEMES: Record<OuterPathId, Theme> = {
  cthulhu: {
    title: "The Tide That Dreams", terrain: "Tidal coast and submerged masonry",
    sites: ["Lantern Quay", "The Unmoored Fishing Boat", "Surveyor's Tide Stair", "Salt-Ward Refuge", "The Submerged Archive", "The Three Arrival Piers", "The Drowned Projection Chamber"],
    npc: "Mara Venn, tidal surveyor", wants: "Bring the sleeping crew home before the next tide.", refuses: "Sacrificing the dreamers to simplify the calculation.",
    evidenceA: "The three marked piers are the entire local arrival network. Inverting their stones and discharging the shared intersection excludes it.",
    evidenceB: "The drowned chamber projects the arrival. Its binding cadence can stop projection without destroying the piers.",
    preparationA: "Etch the three exclusion plates from the survey and test one with a tide basin.",
    preparationB: "Recover the cadence, breathing apparatus, and descent rope; test the breathing seal in shallow water.",
    finaleA: "Fit all three surveyed plates and discharge the intersection while the crew holds the piers. Record each pier secured.",
    finaleB: "Maintain the binding cadence in the submerged chamber through its full conjunction; record the apparatus and crew used.",
    asset: "ward salts", price: "Accept a named dream connection; its servant can locate the next unwarded sleeping camp and must travel there.",
    benefit: "Accept a true dream of the projection chamber and learn its approach immediately.", release: "Use the refuge's cleansing circle to sever the recorded dream connection.",
    consequence: "The tide takes the survey skiff; its crew survives on the pier, but the boat is permanently lost.",
    monsters: ["Deep One netters", "Shoggoth salvage mass", "Starspawn tide-warden"],
    jobs: ["Carry the sleeping crew to the tide stair.", "Consume the archive's labelled timber cache to block the descent.", "Protect the arrival stones through conjunction."],
    tactics: ["Drag a grappled victim toward water; offer return of captives for the survey plates.", "Spends its single timber cache to gain armour for this encounter; burning or removing the cache prevents this.", "Holds the nearest plate instead of pursuing retreating heroes; forced away, it loses control of that pier."],
  },
  nyarlathotep: {
    title: "Three Signatures", terrain: "Civic streets, courier roads, and a charter vault",
    sites: ["The Petitioners' Inn", "Charity Office", "Reformer's Tollhouse", "Issuer's Record Hall", "The Mask-Maker's Vault", "The Public Severance Court", "The Acceptance Chamber"],
    npc: "Iven Sorell, warrant clerk", wants: "Recover the original warrants before someone condemns an innocent keeper.", refuses: "An accusation issued without a named witness or document.",
    evidenceA: "Custody of the relic, control of the chamber, and the keeper's invitation are three revocable mandates held by the same beneficiary.",
    evidenceB: "A true designation and the maker's vessel can bind the local mask during acceptance even while its public identities remain trusted.",
    preparationA: "Collect each issuer's revocation and arrange protected testimony at the court.",
    preparationB: "Recover the maker's designation and vessel; demonstrate its seal on the mask's discarded reflection.",
    finaleA: "Read all three valid revocations to their issuers and complete the court's severance, preserving the original documents.",
    finaleB: "Present the vessel during voluntary acceptance and speak the verified designation; bind the local mask rather than attacking an arbitrary patron.",
    asset: "sealed attestations", price: "Publicly endorse the charity's custody claim; only that office gains the stated access, and the endorsement stays in the record until revoked.",
    benefit: "The charity supplies its protected courier route and an introduction to the vault keeper.", release: "File and publish a witnessed revocation with the original issuer.",
    consequence: "The seized witness register is burned; the independent surviving testimony remains available.",
    monsters: ["Nightgaunt abductors", "Flying polyp censor", "Hunting horror courier"],
    jobs: ["Take a witness alive to the acceptance chamber.", "Separate the issuers before they compare the warrants.", "Deliver the stolen relic under the charity's mandate."],
    tactics: ["Retreat with a witness, never fight to the last body; cut harnesses to free captives.", "Obscures a single corridor; chalk lines and a tether preserve the party's escape route.", "Values the parcel over killing; a verified substitute or interception breaks its mission."],
  },
  shub_niggurath: {
    title: "The Generous Harvest", terrain: "Feeding valleys, root tunnels, and cultivated groves",
    sites: ["Greenmarket", "The Blessed Farm", "Breeder's Counting House", "The Root-Cutter's Shed", "The Older Stable Grove", "Mother Gate", "The Bounded Nursery"],
    npc: "Oda Moss, independent herbalist", wants: "Keep the altered families fed while discovering how to end compulsory births.", refuses: "Treating a harmless graft-bearer as an enemy.",
    evidenceA: "Mother Gate and the two marked offshoots are the only forced-propagation sources; stopping raiders does not stop births.",
    evidenceB: "The older grove uses a regulator to maintain bounded reproduction without divine tribute; its plants are still alive.",
    preparationA: "Prepare the severing tools and map both independent offshoots before entering Mother Gate.",
    preparationB: "Grow and test the bounded regulator; arrange a food allocation that covers one complete nursery cycle.",
    finaleA: "Sever Mother Gate and both recorded offshoots after evacuating dependants; verify that forced propagation stops.",
    finaleB: "Install the regulator at every dependent node and keep the bounded nursery supplied through a complete feeding/birth cycle.",
    asset: "mineral rations", price: "Record Rooted Flesh: one mineral ration replaces each day's ordinary food; missed feeding uses ordinary hunger rules.",
    benefit: "Accept Rooted Flesh; after a valid rest in living soil restore one additional HP at the table.", release: "Have Oda remove the graft, ending both its appetite and its recovery benefit.",
    consequence: "The eastern orchard is trampled during the raid; its winter fruit is lost, though the families escape.",
    monsters: ["Fungal seed-carriers", "Ghoul gleaners", "Dark Young root-keeper"],
    jobs: ["Reach viable soil and establish a new nursery.", "Collect named bodies from the battlefield for the root works.", "Keep the forced-propagation node functioning."],
    tactics: ["Carry one seed sack; confiscating or safely sealing it ends the seeding mission.", "Bargain for unclaimed remains; they withdraw if the funeral ground is defended.", "Cannot leave its node without stopping its maintenance; lure it away while workers sever the root."],
  },
  hastur: {
    title: "The Unfinished Festival", terrain: "Playhouses, memorial squares, and backstage passages",
    sites: ["The Common Hearth", "Singer's Lodging", "Keeper's Memorial", "The Former Actor's House", "The Unaltered Rehearsal Room", "The Originating Stage", "The Counter-Performance Hall"],
    npc: "Sella Reed, former performer", wants: "Restore her sister's own name without destroying everything the town loves.", refuses: "Forcing another person to accept a role.",
    evidenceA: "The Returning Hero is indispensable. A willing withdrawal followed by dissolution at the original stage prevents replacement casting.",
    evidenceB: "The original community rite can cancel the work's linked claims if performed with recovered names and willing witnesses.",
    preparationA: "Secure the actor's willing withdrawal and reconstruct the originating stage's dissolution rite.",
    preparationB: "Recover the six original names and rehearse the unaltered rite with willing local performers.",
    finaleA: "Protect the withdrawing actor while the originating role is dissolved; record willing withdrawal rather than a killing.",
    finaleB: "Complete the restored rite before willing witnesses and restore every linked venue's original dedication.",
    asset: "witness candles", price: "Publicly promise to return for the named performance; breaking the promise loses this audience's privilege and trust, not control of your character.",
    benefit: "Invoke The Returning Hero to obtain shelter and a willing local guide from this audience.", release: "Withdraw before the witnesses and complete the role's release at the former actor's hearth.",
    consequence: "The old memorial banners burn; surviving witnesses retain the names needed for restoration.",
    monsters: ["Rehearsing dead", "Byakhee stage-bearers", "The Yellow Usher"],
    jobs: ["Keep the scene repeating until the invited actor arrives.", "Transport the willing cast to the prepared venue.", "Hold the audience at the final stage."],
    tactics: ["Follow their written blocking; changing the stage objects opens a physical exit.", "Will exchange transport for a properly witnessed cancellation; they cannot manufacture consent.", "Protects doors and props; destroying a prop interrupts the scene but does not dissolve the work."],
  },
  yog_sothoth: {
    title: "The Door That Moved", terrain: "Connected thresholds, displaced streets, and gate machinery",
    sites: ["The Wayfarer's Kitchen", "The Open Pantry", "Courier's Route House", "Junction Workshop", "The Empty Destination", "The Indispensable Junction", "The Containment Threshold"],
    npc: "Teren Vale, stranded courier", wants: "Bring the grain shipment home without closing the only return passage.", refuses: "Redirecting a conjunction into an unverified inhabited place.",
    evidenceA: "Junction Three is indispensable; safe discharge followed by a permanent seal breaks the invocation circuit.",
    evidenceB: "The unused destination can contain the conjunction if its emptiness is verified and the return edge is closed after activation.",
    preparationA: "Attune the junction key and construct a discharge lead without closing the grain route first.",
    preparationB: "Survey the containment space, verify its capacity and emptiness, and attune the return latch.",
    finaleA: "Isolate Junction Three, discharge its stored energy, and seal its circuit function without treating unrelated doors as enemies.",
    finaleB: "Redirect the ordered circuit to verified containment, complete the conjunction there, and close the return latch.",
    asset: "attuned keys", price: "Each carried attuned key occupies one gear slot; leaving the borrowed gate open also permits its known pursuers to use it.",
    benefit: "Borrow and record a threshold key, opening the courier's short route to the workshop.", release: "Return and de-attune the borrowed key, closing only its documented temporary edge.",
    consequence: "A displaced arch destroys the grain cart; its courier escapes through the remaining passage.",
    monsters: ["Mutant threshold scouts", "Abomination junction guard", "Spawn of the Moving Gate"],
    jobs: ["Carry a key to the next threshold.", "Prevent isolation of Junction Three.", "Keep the return edge available for the incursion."],
    tactics: ["A survivor carrying its key can transform after returning to its junction; take the key to prevent that operation.", "Bound to the marked edge; rerouting that edge moves its access rather than healing it.", "Can relocate its one keyed threshold once; the chalk return mark makes its new location traceable."],
  },
  tsathoggua: {
    title: "The Hospitable Silence", terrain: "Quiet roads, provision caches, and sleeper tunnels",
    sites: ["The Independent Shelter", "Drover's Last Camp", "Salt-Merchant's Depot", "The Cache Survey", "Former Signatory's Sanctuary", "The Emergence Conduits", "The Tribute Severance Vault"],
    npc: "Hesk Alder, rescued drover", wants: "Find the missing carters and keep the hospice from owning their work.", refuses: "Trading an uninformed traveller into a debt.",
    evidenceA: "Three real caches feed the emergence through dedicated conduits. Their contents can be counted and removed before occupation.",
    evidenceB: "Three tribute agreements sustain the local presence. Releasing pledged servants and completing severance ends the claim with caches intact.",
    preparationA: "Count the caches, free the workers, and prepare charges at the three dedicated conduits.",
    preparationB: "Recover each signatory's release and the shared severance instructions from the sanctuary.",
    finaleA: "Remove the indispensable reserves and collapse their dedicated conduits; account for each cache and rescued worker.",
    finaleB: "Release the pledged servants, cancel all three agreements, and complete the vault's severance rite.",
    asset: "shelter stores", price: "Deliver one inspected sealed parcel to the named depot within seven days; refusal remains possible and no unlimited claim is created.",
    benefit: "Accept guarded hospice rest and one additional recovered HP, recorded at the table.", release: "Settle or formally release the delivery agreement with its recorded signatory.",
    consequence: "A cache's retreating keeper burns the salt cart; the counted reserve is lost to both sides.",
    monsters: ["Serpent archive-servants", "Formless refuge spawn", "Sleeper's interruption wizard"],
    jobs: ["Recover a witnessed technique for the archive.", "Hold the resting place until tribute is delivered.", "Save one cache using its prepared conduit."],
    tactics: ["Copies one witnessed technique only after returning to the archive and study; intercept its notes.", "Bargains for the particular stored tribute; independent passage avoids its refuge.", "One prepared retreat response, then exhausted; bait it before the main operation and record its expenditure."],
  },
  ithaqua: {
    title: "The Last Open Road", terrain: "Winter passes, maintained refuges, and glacial anchors",
    sites: ["The Warm Hearth", "The Snowed Watchhouse", "Refuge Keeper's Store", "The Winter Guide's Camp", "The Empty Storm Basin", "The Four Cold Anchors", "The Exposed Winter Spring"],
    npc: "Anja Holt, winter guide", wants: "Bring the stranded families through a provisioned route before abandoning the refuge.", refuses: "Calling a crossing safe without fuel and a return plan.",
    evidenceA: "Four mapped anchors transmit the stored winter; severing every connection prevents them suppressing the thaw.",
    evidenceB: "The empty basin can receive the full offensive. Its discharge exposes the replenishment spring long enough for permanent severance.",
    preparationA: "Provision protection, a known guide, overnight shelters and the return journey; prepare the four anchor cuts.",
    preparationB: "Survey the empty sink, prepare the lure, and mark the route to the exposed spring before provoking discharge.",
    finaleA: "Reach and sever all four transmitting anchors using the recorded expedition and return provisions.",
    finaleB: "Lure the full reserve into the empty basin and sever the spring during its exposed interval; a discharge alone is insufficient.",
    asset: "expedition fuel", price: "Accept a hunter's mark: the named wind hunter learns your position at dusk until the fire-shrine release, and must travel to reach you.",
    benefit: "Accept one otherwise closed storm crossing, retaining ordinary choice about the destination and return.", release: "Reach the keeper's fire shrine and extinguish the recorded hunter's mark.",
    consequence: "The abandoned outer fuel shed freezes beyond use; its stored timber is lost, while the refuge remains reachable.",
    monsters: ["Wendigo outriders", "Gnoph-keh pass-keeper", "Winter-spring sentinel"],
    jobs: ["Separate the last travellers from their guide.", "Hold the shelter needed for the return journey.", "Protect replenishment during the exposed interval."],
    tactics: ["Howls from an actual side route; ropes and a named regroup point prevent separation.", "Withdraws to the fuel shed if the pass is flanked; it cannot hold both places alone.", "Has only the remaining recorded reserve; a provoked full discharge leaves it without another storm."],
  },
  tcho_tcho: {
    title: "The Price of Care", terrain: "Clinics, public roads, chapter houses, and a collection court",
    sites: ["The Public Dispensary", "The Chapter Clinic", "Independent Physician's House", "The Replacement Providers", "Dissidents' Chapter Hall", "The Collection Court", "The Shared Severance Shrine"],
    npc: "Dr. Nera Quill, chapter physician", wants: "Keep patients alive while ending the compulsory collection.", refuses: "Closing a clinic before patients have another provider.",
    evidenceA: "Collection ends under the termination clause if five independent services remain functioning through the next collection date.",
    evidenceB: "All three chapters can withdraw and sever the patron together, retaining their mundane expertise and replacing the disclosed subsidies.",
    preparationA: "Arrange actual providers, tools and supplies for medicine, justice, protection, trade and travel.",
    preparationB: "Obtain each chapter's valid withdrawal and transfer its mundane tools and expertise to the communities.",
    finaleA: "Keep all five alternatives operating through collection, then execute the verified termination clause before its issuers.",
    finaleB: "Complete the collective withdrawal and shared severance with care and transport still functioning under the former chapter providers.",
    asset: "medical consignments", price: "Accept the clinic's stated delivery obligation and collection date; it gives no right over uninformed patients.",
    benefit: "Obtain care and a physician's introduction to the dissident chapter, with the subsidy entered in the ledger.", release: "Replace the consumed subsidy and obtain a witnessed release from the authorised collector.",
    consequence: "The collector's wagon overturns and destroys its tribute cargo; the dependent patients still have their physician.",
    monsters: ["Chapter collection guards", "Proto-shoggoth escort", "Funerary collection keeper"],
    jobs: ["Deliver the named collection writ, not kill every refuser.", "Protect the tribute wagon.", "Complete the specific succession rite before collection."],
    tactics: ["Will negotiate a valid deferral from the issuer; ancestry and membership are not proof of hostility.", "Follows the cargo, allowing a diversion while the patients are evacuated.", "Requires the named successor and witnessed rite; preserving the priest or interrupting the rite denies its authority."],
  },
  azathoth: {
    title: "The Furnace That Sings", terrain: "Public utilities, measured capture fields, and stabiliser works",
    sites: ["The Hospital Hearth", "Bell-Keeper's Furnace", "The Weightless Quarry", "The Grounding Workshop", "The Intact Stabiliser", "The Four Collectors", "The Counter-Pattern Chamber"],
    npc: "Bera Flint, municipal engineer", wants: "Keep the hospital warm while stopping the collected harmonics.", refuses: "Disabling life-saving power without a safe substitute.",
    evidenceA: "Four collectors capture specified activations only within their boundaries; disconnection and safe discharge end this circuit.",
    evidenceB: "An intact counter-pattern held through conjunction establishes separation even while the collectors remain assembled.",
    preparationA: "Build and test a grounding lead, mark all four boundaries, and arrange the hospital's safe heat substitute.",
    preparationB: "Recover the stabiliser geometry and test the counter-pattern's repair sequence using mundane tools.",
    finaleA: "Disconnect each collector and safely discharge all stored harmonics; verify that hospital heat no longer feeds capture.",
    finaleB: "Complete and sustain the counter-pattern through the measured conjunction; protect its functioning condition rather than fighting the god.",
    asset: "grounding charges", price: "One known heat harmonic reaches the eastern collector; this first demonstration cannot complete catastrophe.",
    benefit: "Run the furnace to keep the hospital warm for the night and reveal its visible capture boundary.", release: "Ground and reset the furnace outside the active field so future heat can be used without capture.",
    consequence: "The quarry crane falls as gravity returns; the workers survive but their equipment is destroyed.",
    monsters: ["Harmonic echo", "Weightless stone intruder", "Sound-armoured collector"],
    jobs: ["Repeat one qualifying emission at the boundary.", "Hold the stabiliser out of alignment.", "Keep the final collector sounding."],
    tactics: ["Cannot recur after the feeding device is grounded; ordinary magic outside the boundary does not feed it.", "Restoring the local gravity valve displaces it without requiring a kill.", "Armour lasts only while its visible sounding tube remains connected; sever or muffle the tube."],
  },
};

export function encounterCatalogue() { return Object.entries(THEMES).map(([id, t]) => ({ id: id as OuterPathId, title: t.title })); }
export function buildEncounterPack(id: OuterPathId): EncounterPack {
  const t = THEMES[id];
  if (!t) throw new Error("Unknown encounter path");
  const names = ["haven", "witness", "record", "prepare_a", "prepare_b", "finale_a", "finale_b"];
  const clue = (key: string, fact: string, text: string, source: string, leads: string[]) => ({ id: key, fact, text, source, leads });
  const interaction = (key: string, label: string, procedure: string, effects: PathInteraction["effects"], extra: Partial<PathInteraction> = {}): PathInteraction => ({
    id: key, label, procedure, effects, minutes: 10, once: true,
    success: "The recorded deed is complete; its evidence and consequences persist.",
    failure: "The attempt is interrupted. Retreat or try another approach; the essential evidence remains recoverable.", ...extra });
  const pack: EncounterPack = { version: 1, pathId: id, title: t.title,
    openingSites: ["haven", "witness", "record"], initialAssets: { [t.asset]: 2 },
    clues: [
      clue("a_witness", "remedy_a_known", t.evidenceA, `${t.npc} at ${t.sites[1]}`, ["prepare_a"]),
      clue("a_record", "remedy_a_known", t.evidenceA, `Independent field record at ${t.sites[2]}`, ["prepare_a"]),
      clue("b_witness", "remedy_b_known", t.evidenceB, `Former operator at ${t.sites[2]}`, ["prepare_b"]),
      clue("b_record", "remedy_b_known", t.evidenceB, `Original instructions at ${t.sites[1]}`, ["prepare_b"]),
      clue("a_access", "access_a", `${t.preparationA} The route leads to ${t.sites[5]}.`, t.sites[3], ["finale_a"]),
      clue("b_access", "access_b", `${t.preparationB} The route leads to ${t.sites[6]}.`, t.sites[4], ["finale_b"]),
    ], sites: [] };
  pack.sites = names.map((siteId, i) => {
    const tier = i < 3 ? 0 : i < 5 ? 1 : 2;
    const groupId = `${siteId}_group`;
    const monsters: PathMonster[] = i === 0 ? [] : [{ id: groupId, name: t.monsters[tier],
      count: tier === 0 ? 2 : 1, ac: [12, 14, 15][tier], hpEach: [7, 22, 38][tier],
      attack: [`+2, 1d6 damage`, `+4, 1d8 damage`, `+6, 2d6 damage`][tier], morale: [7, 8, 9][tier],
      objective: t.jobs[tier], tell: `Evidence of ${t.monsters[tier].toLowerCase()} working toward this objective is visible before engagement.`,
      tactic: t.tactics[tier], defeat: "Check morale after the first casualty or loss of the objective; survivors can retreat, bargain, or surrender." }];
    const actions: PathInteraction[] = [];
    if (i === 0) {
      actions.push(interaction("ordinary_work", "Repair the public footbridge", "A local carpenter needs an hour of ordinary work. This is useful independent work, with no allegiance required.",
        { facts: ["bridge_repaired"], assets: { [t.asset]: 2 } }, { minutes: 60, success: `The public route reopens. The carpenter supplies two ${t.asset}; collect this reward once.` }));
      actions.push(interaction("prepare_stores", `Prepare one ${t.asset}`, `Spend an hour gathering and preparing local materials with the keeper. Record the work; this creates no gold or XP.`,
        { assets: { [t.asset]: 1 } }, { minutes: 60, once: false }));
      actions.push(interaction("accept_benefit", "Consider the offered help", `${t.benefit} Price: ${t.price} Apply character-sheet effects at the table and record who accepts.`,
        { facts: ["benefit_accepted"], clues: ["b_record"] }, { check: "Voluntary acceptance: name the consenting character and record the disclosed price; no die roll.", success: `${t.benefit} Obligation: ${t.price}` }));
      actions.push(interaction("release_benefit", "Complete the release", `${t.release} Record the people, place and materials used.`,
        { facts: ["benefit_released"] }, { requires: ["benefit_accepted"], check: "Confirm the stated release procedure has actually been completed.", success: "The accepted obligation is released; retain its history without continuing its effect." }));
    } else {
      actions.push(interaction(`${siteId}_observe`, "Observe the situation", `From cover, identify the working route and objective. ${t.tactics[tier]} No roll is required to notice this exposed mechanism.`,
        { facts: [`${siteId}_observed`] }));
      actions.push(interaction(`${siteId}_parley`, "Negotiate or outmanoeuvre the group", `Use its stated objective: ${t.jobs[tier]} ${t.tactics[tier]} Offer a concrete bargain, diversion, or withdrawal route.`,
        { facts: [`${siteId}_safe`], resolveGroup: groupId }, { check: "Resolve reaction, negotiation, stealth, or the stated environmental countermeasure at the table; record the result.",
          success: "The group's interference is resolved without requiring its death. Preserve the agreed terms in the journal.",
          failureEffects: { toll: t.consequence }, failure: t.consequence }));
      actions.push(interaction(`${siteId}_combat`, "Record the resolved confrontation", "Play the confrontation using the printed group and ordinary combat/morale rules. Record casualties, retreats and how its interference ended; this button does not simulate combat.",
        { facts: [`${siteId}_safe`], resolveGroup: groupId }, { check: "Resolve combat or evasion at the table first. Do not award a kill for retreating or negotiating.",
          failureEffects: { toll: t.consequence }, failure: t.consequence }));
      // The witness can be approached at the site's outskirts; documents survive even if the witness is lost.
      if (i === 1 || i === 2) {
        actions.push(interaction(`${siteId}_talk`, "Hear the witness", `Meet the witness at the visible shelter outside the occupied area. ${t.wants} Respect the refusal: ${t.refuses} Listening earns the clue without a persuasion check.`,
          { clues: [i === 1 ? "a_witness" : "b_witness"] }));
        actions.push(interaction(`${siteId}_search`, "Recover the independent record", "Read the marked copy kept at the public approach. Its provenance is independent of the witness; basic evidence is not locked behind a die roll.",
          { clues: [i === 1 ? "b_record" : "a_record"] }));
        actions.push(interaction(`${siteId}_aid`, i === 1 ? "Fulfil the witness's request" : "Preserve the independent archive",
          i === 1 ? `${t.wants} Record the people rescued or protected and what changed for them.` : "Recover and protect the independent records and their keeper; place a second copy in the haven so evidence survives future loss.",
          { facts: [`${siteId}_investigated`] }, { requires: [`${siteId}_safe`],
            check: "Complete the described rescue, protection, or preservation at the table; learning a clue alone is insufficient." }));
      } else if (i === 3 || i === 4) {
        const route = i === 3 ? "a" : "b";
        actions.push(interaction(`${siteId}_work`, "Complete and test the preparation", i === 3 ? t.preparationA : t.preparationB,
          { facts: [`prepared_${route}`, `${siteId}_investigated`], clues: [`${route}_access`] },
          { requires: [`remedy_${route}_known`, `${siteId}_safe`], costs: { [t.asset]: 1 }, minutes: 60,
            check: "Perform the described work and test. Use an appropriate check only if the table finds uncertainty; record the concrete result." }));
      } else {
        const route = i === 5 ? "a" : "b";
        actions.push(interaction(`${siteId}_complete`, "Carry out the remedy", i === 5 ? t.finaleA : t.finaleB,
          { facts: [`${siteId}_investigated`], victory: route.toUpperCase() as "A" | "B" },
          { requires: [`prepared_${route}`, `access_${route}`, `${siteId}_safe`], minutes: 0,
            check: "Complete every stated physical/ritual condition at the table. Record elapsed time separately; possessing the preparation is not completion.",
            success: "This incursion is resolved. The other remedy is not required. Preserve the Toll and continue with the actual aftermath." }));
      }
    }
    return { id: siteId, act: (tier + 1) as 1 | 2 | 3, name: t.sites[i], terrain: t.terrain,
      arrival: i === 0 ? `People at ${t.sites[0]} offer two independent leads and ordinary bridge work.` : `At ${t.sites[i]}, ${t.jobs[tier]} ${t.npc} seeks help nearby.`,
      directions: i === 0 ? "Return to the established haven." : `Follow the named lead from ${i < 3 ? t.sites[0] : i < 5 ? t.sites[i === 3 ? 1 : 2] : t.sites[i === 5 ? 3 : 4]}; place this site in suitable ${t.terrain.toLowerCase()} before travel.`,
      warning: i === 0 ? "The offered help has a disclosed price; ordinary investigation does not require accepting it." : `${t.monsters[tier]} pursue an objective. ${t.tactics[tier]}`,
      exits: i === 0 ? ["witness", "record"] : ["haven"],
      npcs: [{ id: `${siteId}_npc`, name: ["Elin Ward, haven keeper", t.npc, "Corin Ash, former operator", "Dara Flint, expedition specialist", "Venn Reed, archive custodian", "Hale Moss, work-crew leader", "Sera Holt, rite keeper"][i], role: i === 0 ? "Local contact" : "Witness and potential ally",
        wants: t.wants, offers: "Testimony, local access, and help with the site's stated operation.", refuses: t.refuses }],
      monsters, interactions: actions,
      quest: { title: i === 0 ? "Restore the public crossing" : `Help at ${t.sites[i]}`,
        request: i === 0 ? "Repair the carpenter's footbridge without joining a faction." : i === 1 ? t.wants : i === 2 ? "Preserve the independent archive and protect its keeper." : i === 3 ? t.preparationA : i === 4 ? t.preparationB : i === 5 ? t.finaleA : t.finaleB,
        reward: i === 0 ? `Two ${t.asset} and a working public crossing.` : i < 3 ? "Independent evidence and a practical next lead." : i < 5 ? "A tested countermeasure and access to its operation." : "An independently sufficient end to this incursion.",
        completeWhen: i === 0 ? "bridge_repaired" : `${siteId}_investigated` } };
  });
  return pack;
}
