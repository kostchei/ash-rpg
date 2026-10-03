# Rough Shadowdark classification

The mapped CSV contains 1,325 Diablo entries. Gloves, boots, belts and cloaks/capes were removed (145 entries). Repeated names across different games or item types remain separate.

Weapon labels are taken from the **Weapons** table on printed pages 110–111 of the supplied Player's Guide to the Western Reaches V1 extraction. Body armour uses the requested **none, leather, chain, plate** labels. These are design approximations, not official conversion rules.

## How to use the columns

- `shadowdark_category` is the proposed category.
- `shadowdark_group` separates full body armour, armour components, weapons, shields and equipment.
- `mapping_basis` and `mapping_note` explain approximations and exceptions.
- Diablo source URLs and the local Shadowdark source/page are retained.

## Armour

Clothing and ceremonial headwear map to none. Padded, leather, hide and pelt protection map to leather. Mail, scales and flexible metal protection generally map to chain. Rigid metal suits and plates map to plate. Fantasy names use a rough family/material interpretation; an Exceptional or Elite Diablo item does not automatically become heavier armour.

Helms, bracers, pants and shoulders are marked **Armour component**. Their category describes their rough armour style. It does not mean that wearing that piece alone grants a complete suit's AC, or that component AC should stack.

Shields use **Shield** or **Round shield**, both present on page 112, rather than being forced into a body-armour category. Round shield is a rough shape-based assignment and uses that profile's properties if adopted.

## Weapons

- One-handed axes use Handaxe; large/two-handed axes use Greataxe.
- One-handed hammers use Mace; heavy two-handed blunt weapons use Warhammer.
- Flails use Morningstar. They do not acquire the reach of Razor chain.
- Polearms, glaives and two-handed scythes use Pike as a reach-weapon approximation. One-handed scythes/sickles use Scimitar.
- Martial quarterstaves and daibo use Stave; ordinary/spellcaster staves use Staff.
- Wrist claws/blades use Dagger. Fist weapons use Strikes.
- Hand crossbows use Crossbow, including that profile's two-handed and loading restrictions.
- Falchion keeps the guide's named category, but the guide makes it two-handed. Lance retains the guide's mounted/charge restrictions.
- Bows with short/compact identities use Shortbow; ambiguous larger/fantasy bows default to Longbow.

147 wands, orbs, magical off-hands, trophies and quivers are assigned to **Equipment**, using the user-approved categories below. These categories extend the classification beyond the guide's weapon table:

- **Wand:** all items in the Diablo Wand family.
- **Holy symbol:** totems, mojos, phylacteries, shrunken heads, skull implements and talismans. This is a ritual function, including dark-faith symbols, rather than a claim that an item is benevolent.
- **Spellbook:** codices, folios and spellbooks.
- **Arcane focus:** orbs, crystals and other implements without a clearer ritual or book identity. Ambiguous objects default here.
- **Quiver:** ordinary ammunition containers.

These are equipment reskins. The assignment grants no spells, charges, bonuses or class permissions. Equipment entries cite the user-approved grouping rather than a page of the weapon table.

The source table also contains Blowgun, Boomerang, Chakram, Rapier, Razor chain, Sai, Shuriken, Sling and Whip. No convincing corresponding Diablo base was assigned to those categories; the classification does not force every source category to have an entry.

## Source correction

The earlier CSV contained 21 Diablo II table headings in place of each table's first item. The mapped CSV corrects that parser error using the cached Arreat Summit tables, restoring bases such as Quilted Armor, Hand Axe, Hatchet and Shako. The source row count remains 1,470. The original CSV is retained as previously delivered; use the mapped CSV for this classification.

Diablo IV retains the earlier July 2026 community-catalogue coverage limit. This classification does not expand that catalogue's coverage.
