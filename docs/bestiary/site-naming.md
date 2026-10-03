# Site naming v2

Five stored pools each contain exactly 100 distinct entries:

| Pool | Source |
| --- | --- |
| Place types | 40 existing ASH entries plus 60 authored additions |
| Qualifiers | Cairn's published d100, with three substitutions below |
| Subjects | 40 existing ASH entries plus 60 authored additions |
| People | All combinations of ASH's existing ten character-name prefixes and ten suffixes |
| Places | All combinations of ten authored ASH place prefixes and ten suffixes |

Qualifiers are adapted from **Cairn Second Edition, Warden's Guide:
[Naming Procedures](https://cairnrpg.com/second-edition/wardens-guide/naming-procedures/)**,
by Yochai Gal and Cairn contributors. ASH replaces Curvy with Black, Glow with
Brazen, and Slaughter with Dread, retaining the other 97 entries in roll order.
The adapted table in `src/shared/site-name-qualifiers.ts` is licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Cairn's [repository](https://github.com/yochaigal/cairn) identifies the full text
as CC BY-SA 4.0. Attribution and modifications appear in the fieldbook's Name
source note and PDF source appendix. Other pools and templates are authored
ASH material, not attributed to Cairn.

Six styles are selected uniformly:

| Style | Assembly |
| --- | --- |
| Epithet and subject | `{type} of the {qualifier} {subject}` |
| Person | `{person}'s {qualifier} {type}` (names ending in s use a trailing apostrophe) |
| Place | `The {qualifier} {type} of {place}` |
| Short | `{qualifier} {type}` |
| Tarot | `{type} of the {site tarot title}` |
| Plain | `{type} of the {subject}` |

Tarot naming reuses the site's actual drawn card. It does not imply a completed
story or grant a mechanical effect. People and places are naming tokens; they
do not create an NPC, settlement, or history. The raw audit retains the chosen
style and any person, place, or tarot title.

Path additions replace tail entries in the three core pools, preserving exactly
100 distinct equally weighted slots. Duplicate words gain no extra weight.
Previously, half the draws used a four-word path shortlist alongside a 22-word
generic qualifier list: words in both, including Rewritten in five paths,
received about 14.77% probability. Rewritten now has one slot (1%) on those
paths and none on the ordinary regional path.

Generation selects stored tables and templates; it does not call a language
model. Added type/subject/place vocabulary and templates are authored content;
each result is a deterministic seeded selection. Sites can repeat words.
Saved names are unchanged; regenerating an old seed under v2 can change names.
Naming has its own stream, so objective and tarot draws are unaffected.
