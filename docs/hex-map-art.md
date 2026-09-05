# Hex map artwork

The atlas uses **Hexcrawl Hex Tiles v1.3** by Dungeon Architecture:
https://ipainthings.itch.io/hexcrawltiles

The purchased PNGs are local assets, excluded from Git. Import the extracted pack:

```powershell
node scripts/import-hexcrawl-tiles.mjs "D:\Code\Core_Dark\tmp\OSR_Maps\hex_maps"
```

All 91 original PNGs are copied unchanged. The catalog covers nine terrain families,
17 points of interest, 15 road edge pairs and 15 river edge pairs. Each asset uses a
pointy-top hex canvas; SVG fits it to the same geometry used for the map grid.

Terrain variants are chosen deterministically from the hex coordinates and name.
Known sites use matching point-of-interest art. Unexplored hexes do not reveal
terrain or site art. Paths and rivers are chosen by the actual connected edges;
single-ended routes use a short drawn segment because the pack contains edge pairs.

The creator requires a link to the asset page, shown below the map. The asset page
permits use in projects but prohibits redistribution of the pack and inclusion in
distributed mapping software without permission. The local import does not grant
redistribution rights; review that condition before shipping bundled art.
