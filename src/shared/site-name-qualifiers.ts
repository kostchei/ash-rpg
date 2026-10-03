/**
 * Cairn Second Edition, Warden's Guide, Naming Procedures: Adjectives d100.
 * By Yochai Gal and Cairn contributors; adapted in roll order.
 * ASH replaces Curvy / Glow / Slaughter with Black / Brazen / Dread.
 * https://cairnrpg.com/second-edition/wardens-guide/naming-procedures/
 * This table is licensed CC BY-SA 4.0:
 * https://creativecommons.org/licenses/by-sa/4.0/
 * See docs/bestiary/site-naming.md for attribution and ASH's selection policy.
 */
export const SITE_QUALIFIERS = [
  "Aging", "Amber", "Ancient", "Angry", "Ashen", "Bare", "Battered", "Bitter", "Blackened", "Blazing",
  "Bleak", "Blighted", "Blistered", "Blistering", "Blustery", "Brisk", "Bright", "Broad", "Calm", "Celestial",
  "Choking", "Cold", "Colorful", "Copper", "Cracked", "Crimson", "Crumbling", "Curled", "Curling", "Curved",
  "Black", "Dampened", "Dark", "Dazzling", "Dead", "Deathly", "Diamond", "Dismal", "Dreary", "Empty",
  "Endless", "Fierce", "Flaming", "Flashing", "Foggy", "Forbidden", "Forgotten", "Fragile", "Frayed", "Frozen",
  "Furious", "Gaping", "Gleaming", "Brazen", "Granite", "Grim", "Grizzled", "Hazy", "Heated", "Hellish",
  "Hideous", "Jagged", "Lone", "Lonely", "Luminous", "Lurching", "Lustrous", "Miserable", "Misty", "Mournful",
  "Muddy", "Narrow", "Ominous", "Overgrown", "Patched", "Peeling", "Plunging", "Ragged", "Rotting", "Salty",
  "Savage", "Shifting", "Shimmering", "Shining", "Shivering", "Shrouded", "Singed", "Sinking", "Dread", "Smoky",
  "Soggy", "Sour", "Sputtering", "Stained", "Starved", "Stinking", "Stuffed", "Sunken", "Thin", "Withered",
] as const;

export const SITE_NAME_STYLES = ['epithet_subject', 'person', 'place', 'short', 'tarot', 'plain'] as const;
export type SiteNameStyle = typeof SITE_NAME_STYLES[number];

/** ASH-authored settlement fragments: 10 x 10 distinct stored combinations. */
export const SITE_PLACE_NAMES = ['Grey', 'Black', 'White', 'Green', 'Red', 'Gold', 'Silver', 'Stone', 'Ash', 'Oak']
  .flatMap(prefix => ['mere', 'ford', 'haven', 'wick', 'bridge', 'holm', 'wall', 'field', 'fell', 'brook'].map(suffix => prefix + suffix));

export const SITE_NAME_SOURCE = 'Site naming v2: six seeded styles; 100-entry type, qualifier, subject, person and place pools. Qualifiers adapted from Cairn 2e / Naming Procedures, Yochai Gal and contributors, CC BY-SA 4.0 (https://cairnrpg.com/second-edition/wardens-guide/naming-procedures/): Curvy, Glow, Slaughter replaced by Black, Brazen, Dread. Other words and style templates are authored ASH tables; tarot uses the site card title. Path additions replace tail slots, keeping 100 equally weighted distinct entries.';
