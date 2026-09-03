import { mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import Database from "better-sqlite3";
import { HEX_DEFINITIONS, MONSTERS } from "../shared/content.js";
import { generateHexMap } from "./generators/hex-map.js";
import { generateProceduralRegion, type GeneratedRegionWorld } from "./generators/procedural-region.js";
import { CUSTOM_MONSTER_TEMPLATES, resolveMonsterEntry } from "../shared/monster-aliases.js";
import type {
  CampaignPhase,
  CampaignPressure,
  CampaignState,
  Character,
  CursedZoneId,
  DungeonRoom,
  Encounter,
  EncounterMonster,
  PublicConnectionSummary,
  PublicHex,
  PublicSiteSummary,
  RegionGenerationConfig,
  Role,
  RollRecord,
  WikiNote,
  ZoneManifest,
  ZoneSummary,
} from "../shared/types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue>;

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

function verifyPin(pin: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = scryptSync(pin, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const now = () => new Date().toISOString();
const token = () => randomBytes(24).toString("base64url");
const campaignCode = () =>
  Array.from(
    { length: 6 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)],
  ).join("");

export class AshDatabase {
  readonly db: Database.Database;
  private readonly zonesCache = new Map<string, ZoneManifest>();
  private readonly bestiaryCache = new Map<string, EncounterMonster>();

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.exec(
      "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
    );
    this.migrate();
    this.loadZones();
    this.loadBestiary();
  }

  close() {
    this.db.close();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, region_name TEXT NOT NULL,
        act INTEGER NOT NULL DEFAULT 1, current_phase TEXT NOT NULL DEFAULT 'sanctuary',
        active_zone_id TEXT NOT NULL DEFAULT 'oakhaven_borderlands', pin_hash TEXT NOT NULL, host_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        token TEXT PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        character_id INTEGER, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        owner_token TEXT, name TEXT NOT NULL, ancestry TEXT NOT NULL, class_name TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1,
        hp INTEGER NOT NULL, max_hp INTEGER NOT NULL, ac INTEGER NOT NULL, gold INTEGER NOT NULL, gear_slots INTEGER NOT NULL,
        str INTEGER NOT NULL, dex INTEGER NOT NULL, con INTEGER NOT NULL, int INTEGER NOT NULL, wis INTEGER NOT NULL, cha INTEGER NOT NULL,
        anchors_json TEXT NOT NULL, talents_json TEXT DEFAULT '[]', xp INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hexes (
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, id TEXT NOT NULL, ring INTEGER NOT NULL,
        q INTEGER NOT NULL, r INTEGER NOT NULL, name TEXT NOT NULL, biome TEXT NOT NULL, threat_tier INTEGER NOT NULL,
        landmark TEXT NOT NULL, reveal_state TEXT NOT NULL DEFAULT 'unexplored', PRIMARY KEY (campaign_id, id)
      );
      CREATE TABLE IF NOT EXISTS regions (
        id TEXT PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        selection_json TEXT NOT NULL, seed TEXT NOT NULL, generator_version TEXT NOT NULL,
        content_version TEXT NOT NULL, rules_version TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 1,
        revision INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS region_layers (
        region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        layer_id TEXT NOT NULL, kind TEXT NOT NULL, scale INTEGER NOT NULL DEFAULT 6, depth_context TEXT,
        PRIMARY KEY (region_id, layer_id)
      );
      CREATE TABLE IF NOT EXISTS region_hexes (
        canonical_key TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        layer_id TEXT NOT NULL, q INTEGER NOT NULL, r INTEGER NOT NULL, terrain TEXT NOT NULL,
        elevation INTEGER NOT NULL, depth INTEGER NOT NULL DEFAULT 0, moisture REAL NOT NULL DEFAULT 0.5,
        primary_zone TEXT NOT NULL, secondary_zone TEXT, threat_tier INTEGER NOT NULL, name TEXT NOT NULL, landmark TEXT
      );
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        canonical_key TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, current_state TEXT NOT NULL,
        owner_faction_id TEXT, support_json TEXT, history_refs_json TEXT, visibility TEXT NOT NULL DEFAULT 'visible'
      );
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        from_key TEXT NOT NULL, to_key TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'undirected', modes_json TEXT NOT NULL, cost_watches INTEGER NOT NULL DEFAULT 1,
        crossing_method TEXT, requirements_json TEXT, physical_feature_id TEXT, owner_faction_id TEXT
      );
      CREATE TABLE IF NOT EXISTS historical_events (
        id TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL, name TEXT NOT NULL, summary TEXT NOT NULL,
        affected_entities_json TEXT, consequences_json TEXT
      );
      CREATE TABLE IF NOT EXISTS faction_presences (
        id TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        faction_id TEXT NOT NULL, name TEXT NOT NULL, disposition TEXT NOT NULL,
        location_key TEXT NOT NULL, asset_or_role TEXT, strength_or_control TEXT, agenda TEXT
      );
      CREATE TABLE IF NOT EXISTS rumors (
        id TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        origin_site_id TEXT NOT NULL, target_site_id TEXT NOT NULL, claim TEXT NOT NULL,
        accuracy TEXT NOT NULL DEFAULT 'true', direction_hint TEXT
      );
      CREATE TABLE IF NOT EXISTS dungeon_rooms (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL, geometry TEXT NOT NULL, contents TEXT NOT NULL, interaction TEXT NOT NULL,
        exits INTEGER NOT NULL, trap_json TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS encounters (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS encounter_monsters (
        id INTEGER PRIMARY KEY, encounter_id INTEGER NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
        monster_key TEXT NOT NULL, name TEXT, current_hp INTEGER NOT NULL, max_hp INTEGER NOT NULL, lore_tier INTEGER NOT NULL DEFAULT 0,
        ac INTEGER, morale INTEGER, level INTEGER, attacks_json TEXT, traits_json TEXT, lore_json TEXT,
        is_variant INTEGER DEFAULT 0, variant_quality TEXT, variant_strength TEXT, variant_weakness TEXT
      );
      CREATE TABLE IF NOT EXISTS monsters (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, source TEXT NOT NULL, family TEXT, level INTEGER NOT NULL,
        ac INTEGER NOT NULL, hp INTEGER NOT NULL, morale INTEGER NOT NULL, attacks_json TEXT NOT NULL,
        move TEXT NOT NULL, abilities_json TEXT NOT NULL, alignment TEXT NOT NULL, traits_json TEXT NOT NULL,
        lore_json TEXT NOT NULL, harvest_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS threat_vectors (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        vector_key TEXT NOT NULL, name TEXT NOT NULL, shards INTEGER NOT NULL DEFAULT 0, confirmed INTEGER NOT NULL DEFAULT 0,
        UNIQUE(campaign_id, vector_key)
      );
      CREATE TABLE IF NOT EXISTS campaign_pressures (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name TEXT NOT NULL, shape TEXT NOT NULL, current INTEGER NOT NULL DEFAULT 0,
        threshold INTEGER NOT NULL, consequence TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rolls (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        actor TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, dice TEXT NOT NULL, total INTEGER NOT NULL,
        detail TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS wiki_notes (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        section TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_rolls_campaign_created ON rolls(campaign_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_rooms_campaign_sequence ON dungeon_rooms(campaign_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_encounters_campaign_status ON encounters(campaign_id, status);
      CREATE INDEX IF NOT EXISTS idx_pressures_campaign_status ON campaign_pressures(campaign_id, status);
      PRAGMA optimize;
    `);

    // Ensure columns exist if table was created in older schema version
    const campaignCols = this.db.pragma("table_info(campaigns)") as Array<{ name: string }>;
    if (!campaignCols.some((c) => c.name === "current_phase")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN current_phase TEXT NOT NULL DEFAULT 'sanctuary'");
    }
    if (!campaignCols.some((c) => c.name === "active_zone_id")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN active_zone_id TEXT NOT NULL DEFAULT 'oakhaven_borderlands'");
    }
    if (!campaignCols.some((c) => c.name === "active_region_id")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN active_region_id TEXT");
    }
    if (!campaignCols.some((c) => c.name === "party_location_json")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN party_location_json TEXT");
    }
    if (!campaignCols.some((c) => c.name === "home_location_json")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN home_location_json TEXT");
    }

    const charCols = this.db.pragma("table_info(characters)") as Array<{ name: string }>;
    if (!charCols.some((c) => c.name === "talents_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN talents_json TEXT DEFAULT '[]'");
    }
    if (!charCols.some((c) => c.name === "xp")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN xp INTEGER NOT NULL DEFAULT 0");
    }

    const encMonCols = this.db.pragma("table_info(encounter_monsters)") as Array<{ name: string }>;
    if (!encMonCols.some((c) => c.name === "is_variant")) {
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN is_variant INTEGER DEFAULT 0");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN variant_quality TEXT");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN variant_strength TEXT");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN variant_weakness TEXT");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN name TEXT");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN ac INTEGER");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN morale INTEGER");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN level INTEGER");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN attacks_json TEXT");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN traits_json TEXT");
      this.db.exec("ALTER TABLE encounter_monsters ADD COLUMN lore_json TEXT");
    }

    const hexCols = this.db.pragma("table_info(hexes)") as Array<{ name: string }>;
    if (!hexCols.some((c) => c.name === "road")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN road TEXT");
    }
    if (!hexCols.some((c) => c.name === "river")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN river TEXT");
    }
    if (!hexCols.some((c) => c.name === "horizon_rumor")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN horizon_rumor TEXT");
    }
    if (!hexCols.some((c) => c.name === "exit_destination")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN exit_destination TEXT");
    }
    if (!hexCols.some((c) => c.name === "elevation")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN elevation INTEGER DEFAULT 1");
    }
    if (!hexCols.some((c) => c.name === "canonical_key")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN canonical_key TEXT");
    }
    if (!hexCols.some((c) => c.name === "primary_zone")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN primary_zone TEXT");
    }
    if (!hexCols.some((c) => c.name === "secondary_zone")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN secondary_zone TEXT");
    }
    if (!hexCols.some((c) => c.name === "connections_json")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN connections_json TEXT");
    }
    if (!hexCols.some((c) => c.name === "sites_json")) {
      this.db.exec("ALTER TABLE hexes ADD COLUMN sites_json TEXT");
    }
  }

  private loadZones() {
    const zonesDir = resolve("zones");
    if (!existsSync(zonesDir)) return;
    try {
      const dirs = readdirSync(zonesDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          const manifestPath = resolve(zonesDir, d.name, "manifest.json");
          if (existsSync(manifestPath)) {
            const manifest: ZoneManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
            this.zonesCache.set(manifest.id, manifest);
          }
        }
      }
    } catch {
      // Ignored if zones dir is unreadable
    }
  }

  private loadBestiary() {
    // Populate from fallback static content first
    for (const [key, val] of Object.entries(MONSTERS)) {
      this.bestiaryCache.set(key, {
        id: 0,
        monsterKey: key,
        name: val.name,
        currentHp: val.hp,
        maxHp: val.hp,
        loreTier: 0,
        ac: val.ac,
        morale: val.morale,
        attacks: [...val.attacks],
        traits: [...val.traits],
        lore: [...val.lore],
      });
    }

    // Populate custom Cursed Scroll templates
    for (const [key, val] of Object.entries(CUSTOM_MONSTER_TEMPLATES)) {
      this.bestiaryCache.set(key, {
        id: 0,
        ...val,
      });
    }

    const bestiaryPath = resolve("data/bestiary/monsters.json");
    if (existsSync(bestiaryPath)) {
      try {
        const raw = JSON.parse(readFileSync(bestiaryPath, "utf-8"));
        const insert = this.db.prepare(`
          INSERT OR REPLACE INTO monsters 
          (id, name, source, family, level, ac, hp, morale, attacks_json, move, abilities_json, alignment, traits_json, lore_json, harvest_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);

        for (const m of raw) {
          insert.run(
            m.id,
            m.name,
            m.source,
            m.family ?? null,
            m.level,
            m.ac,
            m.hp,
            m.morale,
            JSON.stringify(m.attacks),
            m.move,
            JSON.stringify(m.abilities),
            m.alignment,
            JSON.stringify(m.traits),
            JSON.stringify(m.loreTiers),
            JSON.stringify(m.harvest),
          );

          this.bestiaryCache.set(m.id, {
            id: 0,
            monsterKey: m.id,
            name: m.name,
            currentHp: m.hp,
            maxHp: m.hp,
            loreTier: 0,
            ac: m.ac,
            morale: m.morale,
            level: m.level,
            family: m.family,
            move: m.move,
            abilities: m.abilities,
            alignment: m.alignment,
            attacks: m.attacks,
            traits: m.traits,
            lore: [m.loreTiers.common, m.loreTiers.field, m.loreTiers.obscure, m.loreTiers.arcane],
            harvest: m.harvest,
          });
        }
      } catch (err) {
        console.error("Failed to load bestiary into database:", err);
      }
    }
  }

  getZoneManifest(zoneId: string): ZoneManifest | undefined {
    return this.zonesCache.get(zoneId);
  }

  listZones(): ZoneSummary[] {
    return Array.from(this.zonesCache.values()).map((z) => ({
      id: z.id,
      name: z.name,
      theme: z.theme,
      biomePalette: z.biomePalette,
    }));
  }

  getMonster(key: string): EncounterMonster | undefined {
    return resolveMonsterEntry(key, (k) => this.bestiaryCache.get(k));
  }

  listMonsters(): EncounterMonster[] {
    return Array.from(this.bestiaryCache.values());
  }

  getMonstersForZone(zoneId: string): EncounterMonster[] {
    const zone = this.getZoneManifest(zoneId);
    if (!zone || !zone.wanderingMonsterTable || zone.wanderingMonsterTable.length === 0) {
      return [];
    }
    const matched = zone.wanderingMonsterTable
      .map((k) => this.getMonster(k))
      .filter((m): m is EncounterMonster => m !== undefined);
    return matched;
  }

  setCampaignPhase(campaignId: number, phase: CampaignPhase) {
    this.db.prepare("UPDATE campaigns SET current_phase = ? WHERE id = ?").run(phase, campaignId);
  }

  setActiveZone(campaignId: number, zoneId: string) {
    this.db.prepare("UPDATE campaigns SET active_zone_id = ? WHERE id = ?").run(zoneId, campaignId);
  }

  saveGeneratedRegion(campaignId: number, world: GeneratedRegionWorld) {
    const insertRegion = this.db.prepare(`
      INSERT OR REPLACE INTO regions 
      (id, campaign_id, selection_json, seed, generator_version, content_version, rules_version, attempt, revision, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertLayer = this.db.prepare(`
      INSERT OR REPLACE INTO region_layers
      (region_id, layer_id, kind, scale, depth_context)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertRegionHex = this.db.prepare(`
      INSERT OR REPLACE INTO region_hexes
      (canonical_key, region_id, layer_id, q, r, terrain, elevation, depth, moisture, primary_zone, secondary_zone, threat_tier, name, landmark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSite = this.db.prepare(`
      INSERT OR REPLACE INTO sites
      (id, region_id, canonical_key, kind, name, current_state, owner_faction_id, support_json, history_refs_json, visibility)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertConn = this.db.prepare(`
      INSERT OR REPLACE INTO connections
      (id, region_id, from_key, to_key, kind, name, direction, modes_json, cost_watches, crossing_method, requirements_json, physical_feature_id, owner_faction_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHist = this.db.prepare(`
      INSERT OR REPLACE INTO historical_events
      (id, region_id, sequence, name, summary, affected_entities_json, consequences_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertFaction = this.db.prepare(`
      INSERT OR REPLACE INTO faction_presences
      (id, region_id, faction_id, name, disposition, location_key, asset_or_role, strength_or_control, agenda)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRumor = this.db.prepare(`
      INSERT OR REPLACE INTO rumors
      (id, region_id, origin_site_id, target_site_id, claim, accuracy, direction_hint)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const deleteHexes = this.db.prepare("DELETE FROM hexes WHERE campaign_id = ?");
    const insertHex = this.db.prepare(`
      INSERT INTO hexes 
      (campaign_id, id, ring, q, r, name, biome, threat_tier, landmark, reveal_state, road, river, horizon_rumor, exit_destination, elevation, canonical_key, primary_zone, secondary_zone, connections_json, sites_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      // 1. Region
      insertRegion.run(
        world.region.id,
        campaignId,
        JSON.stringify(world.region.selection),
        world.region.seed,
        world.region.generatorVersion,
        world.region.contentVersion,
        world.region.rulesVersion,
        world.region.attempt,
        world.region.revision,
        world.region.active ? 1 : 0,
        world.region.createdAt,
      );

      // 2. Layers
      for (const l of world.layers) {
        insertLayer.run(l.regionId, l.layerId, l.kind, l.scale, l.depthContext ?? null);
      }

      // 3. Hexes
      for (const rh of world.hexes) {
        insertRegionHex.run(
          rh.canonicalKey,
          rh.regionId,
          rh.layerId,
          rh.q,
          rh.r,
          rh.terrain,
          rh.elevation,
          rh.depth,
          rh.moisture,
          rh.primaryZone,
          rh.secondaryZone ?? null,
          rh.threatTier,
          rh.name,
          rh.landmark ?? null,
        );
      }

      // 4. Sites
      for (const s of world.sites) {
        insertSite.run(
          s.id,
          s.regionId,
          s.canonicalKey,
          s.kind,
          s.name,
          s.currentState,
          s.ownerFactionId ?? null,
          s.supportDependencies ? JSON.stringify(s.supportDependencies) : null,
          s.historyRefIds ? JSON.stringify(s.historyRefIds) : null,
          s.visibility,
        );
      }

      // 5. Connections
      for (const c of world.connections) {
        insertConn.run(
          c.id,
          c.regionId,
          c.fromKey,
          c.toKey,
          c.kind,
          c.name,
          c.direction,
          JSON.stringify(c.modes),
          c.costWatches,
          c.crossingMethod ?? null,
          c.requirements ? JSON.stringify(c.requirements) : null,
          c.physicalFeatureId ?? null,
          c.ownerFactionId ?? null,
        );
      }

      // 6. Historical Events
      for (const h of world.historicalEvents) {
        insertHist.run(
          h.id,
          h.regionId,
          h.sequence,
          h.name,
          h.summary,
          JSON.stringify(h.affectedEntityIds),
          JSON.stringify(h.consequences),
        );
      }

      // 7. Factions
      for (const f of world.factionPresences) {
        insertFaction.run(
          f.id,
          f.regionId,
          f.factionId,
          f.name,
          f.disposition,
          f.locationKey,
          f.assetOrRole,
          f.strengthOrControl,
          f.agenda,
        );
      }

      // 8. Rumors
      for (const r of world.rumors) {
        insertRumor.run(
          r.id,
          r.regionId,
          r.originSiteId,
          r.targetSiteId,
          r.claim,
          r.accuracy,
          r.directionHint ?? null,
        );
      }

      // 9. Public 19 Hexes
      deleteHexes.run(campaignId);
      for (const ph of world.initial19PublicHexes) {
        insertHex.run(
          campaignId,
          ph.id,
          ph.ring,
          ph.q,
          ph.r,
          ph.name,
          ph.biome,
          ph.threatTier,
          ph.landmark,
          ph.revealState,
          ph.road ?? null,
          ph.river ?? null,
          ph.horizonRumor ?? null,
          ph.exitDestination ?? null,
          ph.elevation ?? 1,
          ph.canonicalKey ?? null,
          ph.primaryZone ?? null,
          ph.secondaryZone ?? null,
          ph.connections ? JSON.stringify(ph.connections) : null,
          ph.sites ? JSON.stringify(ph.sites) : null,
        );
      }

      // 10. Update campaign active region & zone
      const primaryZone = world.region.selection.mode === "single"
        ? world.region.selection.zoneId
        : world.region.selection.zoneIds[0];

      this.db.prepare(`
        UPDATE campaigns SET 
          active_region_id = ?, 
          active_zone_id = ?,
          party_location_json = ?,
          home_location_json = ?
        WHERE id = ?
      `).run(
        world.region.id,
        primaryZone,
        JSON.stringify({ q: 0, r: 0, layerId: "surface" }),
        JSON.stringify({ q: 0, r: 0, layerId: "surface" }),
        campaignId,
      );
    })();
  }

  previewRegion(config: RegionGenerationConfig): GeneratedRegionWorld {
    return generateProceduralRegion(0, config);
  }

  commitRegion(campaignId: number, world: GeneratedRegionWorld) {
    this.saveGeneratedRegion(campaignId, world);
  }

  createCampaign(
    name: string,
    regionName: string,
    pin: string,
    generationConfig?: RegionGenerationConfig,
  ) {
    let code = campaignCode();
    while (this.db.prepare("SELECT 1 FROM campaigns WHERE code = ?").get(code))
      code = campaignCode();
    const hostToken = token();

    if (generationConfig) {
      const primaryZone = generationConfig.selection.mode === "single"
        ? generationConfig.selection.zoneId
        : generationConfig.selection.zoneIds[0];

      const result = this.db
        .prepare(
          "INSERT INTO campaigns (code,name,region_name,current_phase,active_zone_id,pin_hash,host_token,created_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .run(code, name, regionName, "sanctuary", primaryZone, hashPin(pin), hostToken, now());
      const campaignId = Number(result.lastInsertRowid);

      const world = generateProceduralRegion(campaignId, {
        ...generationConfig,
        seed: generationConfig.seed || campaignCode(),
      });

      const h00 = world.initial19PublicHexes.find((h) => h.id === "00");
      if (h00) {
        h00.name = `${name} Sanctuary`;
      }

      this.saveGeneratedRegion(campaignId, world);
      return { code, hostToken, campaignId };
    }

    const result = this.db
      .prepare(
        "INSERT INTO campaigns (code,name,region_name,current_phase,active_zone_id,pin_hash,host_token,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(code, name, regionName, "sanctuary", "oakhaven_borderlands", hashPin(pin), hostToken, now());
    const campaignId = Number(result.lastInsertRowid);
    const generatedHexes = generateHexMap({ campaignName: name, regionName, legacy: true });
    const insertHex = this.db.prepare(
      "INSERT INTO hexes (campaign_id,id,ring,q,r,name,biome,threat_tier,landmark,reveal_state,road,river,horizon_rumor,exit_destination,elevation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    for (const h of generatedHexes) {
      insertHex.run(
        campaignId,
        h.id,
        h.ring,
        h.q,
        h.r,
        h.name,
        h.biome,
        h.threatTier,
        h.landmark,
        h.revealState,
        h.road ?? null,
        h.river ?? null,
        h.horizonRumor ?? null,
        h.exitDestination ?? null,
        h.elevation,
      );
    }
    return { code, hostToken, campaignId };
  }

  regenerateHexMap(campaignId: number, themeOrConfig?: string | RegionGenerationConfig) {
    const campaign = this.db
      .prepare("SELECT name, region_name, active_zone_id FROM campaigns WHERE id = ?")
      .get(campaignId) as { name: string; region_name: string; active_zone_id?: string } | undefined;

    let config: RegionGenerationConfig;
    if (typeof themeOrConfig === "object" && themeOrConfig !== null && "selection" in themeOrConfig) {
      config = themeOrConfig;
    } else {
      const theme = typeof themeOrConfig === "string" ? themeOrConfig : "temperate";
      const zoneMap: Record<string, CursedZoneId> = {
        temperate: "oakhaven_borderlands",
        coastal: "midnight_sun",
        highland: "dwellers_in_the_deep",
        wildwood: "the_gloaming",
        marshland: "river_of_night",
      };
      const zoneId = zoneMap[theme] || (campaign?.active_zone_id as CursedZoneId) || "oakhaven_borderlands";
      config = {
        selection: { mode: "single", zoneId },
        initialRadius: 2,
        structuralRadius: 6,
        regionalHexMiles: 6,
        season: "autumn",
        sourceContent: "adapted",
        rulesProfileId: "ash_4watch_v1",
      };
    }

    const world = generateProceduralRegion(campaignId, config);
    if (campaign?.name) {
      const h00 = world.initial19PublicHexes.find((h) => h.id === "00");
      if (h00) {
        h00.name = `${campaign.name} Sanctuary`;
      }
    }
    this.saveGeneratedRegion(campaignId, world);
  }

  joinCampaign(code: string, existingToken?: string) {
    const campaign = this.getCampaign(code);
    if (!campaign) return null;
    if (existingToken) {
      const found = this.db
        .prepare(
          "SELECT token FROM devices WHERE token = ? AND campaign_id = ?",
        )
        .get(existingToken, campaign.id);
      if (found) return { token: existingToken, campaign };
    }
    const deviceToken = token();
    this.db
      .prepare(
        "INSERT INTO devices (token,campaign_id,created_at) VALUES (?,?,?)",
      )
      .run(deviceToken, campaign.id, now());
    return { token: deviceToken, campaign };
  }

  authenticate(code: string, role: Role, authToken: string) {
    const campaign = this.getCampaign(code);
    if (!campaign) return null;
    if (role === "host")
      return campaign.host_token === authToken
        ? { campaignId: Number(campaign.id), characterId: null }
        : null;
    const device = this.db
      .prepare(
        "SELECT character_id FROM devices WHERE campaign_id = ? AND token = ?",
      )
      .get(campaign.id, authToken) as Row | undefined;
    return device
      ? {
          campaignId: Number(campaign.id),
          characterId:
            device.character_id == null ? null : Number(device.character_id),
        }
      : null;
  }

  authenticatePin(code: string, pin: string) {
    const campaign = this.getCampaign(code);
    if (!campaign || !verifyPin(pin, String(campaign.pin_hash))) return null;
    return {
      token: String(campaign.host_token),
      campaignId: Number(campaign.id),
    };
  }

  getCampaign(code: string) {
    return this.db
      .prepare("SELECT * FROM campaigns WHERE code = ?")
      .get(code.toUpperCase()) as Row | undefined;
  }

  addCharacter(
    campaignId: number,
    ownerToken: string | null,
    input: Omit<Character, "id" | "ownerToken">,
  ) {
    const a = input.abilities;
    const result = this.db
      .prepare(
        `INSERT INTO characters
      (campaign_id,owner_token,name,ancestry,class_name,level,hp,max_hp,ac,gold,gear_slots,str,dex,con,int,wis,cha,anchors_json,talents_json,xp,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        campaignId,
        ownerToken,
        input.name,
        input.ancestry,
        input.className,
        input.level,
        input.hp,
        input.maxHp,
        input.ac,
        input.gold,
        input.gearSlots,
        a.str,
        a.dex,
        a.con,
        a.int,
        a.wis,
        a.cha,
        JSON.stringify(input.anchors),
        JSON.stringify(input.talents ?? []),
        input.xp ?? 0,
        now(),
      );
    const id = Number(result.lastInsertRowid);
    if (ownerToken)
      this.db
        .prepare(
          "UPDATE devices SET character_id = ? WHERE token = ? AND campaign_id = ?",
        )
        .run(id, ownerToken, campaignId);
    return id;
  }

  updateCharacter(campaignId: number, character: Character) {
    const a = character.abilities;
    this.db
      .prepare(
        `UPDATE characters SET 
        name = ?, ancestry = ?, class_name = ?, level = ?, hp = ?, max_hp = ?, ac = ?, gold = ?, gear_slots = ?,
        str = ?, dex = ?, con = ?, int = ?, wis = ?, cha = ?, anchors_json = ?, talents_json = ?, xp = ?
        WHERE id = ? AND campaign_id = ?`,
      )
      .run(
        character.name,
        character.ancestry,
        character.className,
        character.level,
        character.hp,
        character.maxHp,
        character.ac,
        character.gold,
        character.gearSlots,
        a.str,
        a.dex,
        a.con,
        a.int,
        a.wis,
        a.cha,
        JSON.stringify(character.anchors),
        JSON.stringify(character.talents ?? []),
        character.xp ?? 0,
        character.id,
        campaignId,
      );
  }

  updateCharacterHp(campaignId: number, characterId: number, hp: number) {
    this.db
      .prepare(
        "UPDATE characters SET hp = MAX(0, MIN(max_hp, ?)) WHERE id = ? AND campaign_id = ?",
      )
      .run(hp, characterId, campaignId);
  }

  addCharacterXp(campaignId: number, characterId: number, amount: number) {
    this.db
      .prepare("UPDATE characters SET xp = MAX(0, xp + ?) WHERE id = ? AND campaign_id = ?")
      .run(amount, characterId, campaignId);
  }

  revealHex(campaignId: number, id: string, revealState: string) {
    this.db
      .prepare(
        "UPDATE hexes SET reveal_state = ? WHERE campaign_id = ? AND id = ?",
      )
      .run(revealState, campaignId, id);
  }

  addRoom(
    campaignId: number,
    room: Omit<DungeonRoom, "id" | "sequence" | "createdAt">,
  ) {
    const row = this.db
      .prepare(
        "SELECT COALESCE(MAX(sequence),0)+1 next FROM dungeon_rooms WHERE campaign_id = ?",
      )
      .get(campaignId) as Row;
    const sequence = Number(row.next);
    this.db
      .prepare(
        "INSERT INTO dungeon_rooms (campaign_id,sequence,geometry,contents,interaction,exits,trap_json,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(
        campaignId,
        sequence,
        room.geometry,
        room.contents,
        room.interaction,
        room.exits,
        room.trap ? JSON.stringify(room.trap) : null,
        now(),
      );
  }

  addEncounterWithMonsters(
    campaignId: number,
    encounterName: string,
    monstersList: EncounterMonster[],
  ) {
    const result = this.db
      .prepare("INSERT INTO encounters (campaign_id,name,created_at) VALUES (?,?,?)")
      .run(campaignId, encounterName, now());
    const encounterId = Number(result.lastInsertRowid);

    const insert = this.db.prepare(`
      INSERT INTO encounter_monsters 
      (encounter_id,monster_key,name,current_hp,max_hp,lore_tier,ac,morale,level,attacks_json,traits_json,lore_json,is_variant,variant_quality,variant_strength,variant_weakness)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    for (const m of monstersList) {
      insert.run(
        encounterId,
        m.monsterKey,
        m.name,
        m.currentHp,
        m.maxHp,
        m.loreTier,
        m.ac ?? null,
        m.morale ?? null,
        m.level ?? null,
        m.attacks ? JSON.stringify(m.attacks) : null,
        m.traits ? JSON.stringify(m.traits) : null,
        m.lore ? JSON.stringify(m.lore) : null,
        m.isVariant ? 1 : 0,
        m.variantQuality ?? null,
        m.variantStrength ?? null,
        m.variantWeakness ?? null,
      );
    }
    return encounterId;
  }

  addEncounter(
    campaignId: number,
    monsterKey: string,
    count: number,
  ) {
    const monster = this.getMonster(monsterKey) ?? {
      id: 0,
      monsterKey,
      name: monsterKey,
      currentHp: 10,
      maxHp: 10,
      loreTier: 0,
      ac: 12,
      morale: 7,
      attacks: ["Strike +2 (1d6)"],
      traits: [],
      lore: [],
    };

    const monstersList: EncounterMonster[] = Array.from({ length: count }, () => ({
      ...monster,
    }));
    return this.addEncounterWithMonsters(campaignId, monster.name, monstersList);
  }

  damageEncounterMonster(campaignId: number, id: number, delta: number) {
    this.db
      .prepare(
        `UPDATE encounter_monsters SET current_hp = MAX(0, MIN(max_hp, current_hp + ?))
      WHERE id = ? AND encounter_id IN (SELECT id FROM encounters WHERE campaign_id = ?)`,
      )
      .run(delta, id, campaignId);
  }

  getEncounterMonster(campaignId: number, id: number) {
    return this.db
      .prepare(
        `SELECT em.* FROM encounter_monsters em JOIN encounters e ON e.id = em.encounter_id
      WHERE em.id = ? AND e.campaign_id = ?`,
      )
      .get(id, campaignId) as Row | undefined;
  }

  revealMonsterLore(campaignId: number, id: number, tier: number) {
    this.db
      .prepare(
        `UPDATE encounter_monsters SET lore_tier = MAX(lore_tier, ?)
      WHERE id = ? AND encounter_id IN (SELECT id FROM encounters WHERE campaign_id = ?)`,
      )
      .run(tier, id, campaignId);
  }

  resolveEncounter(campaignId: number, encounterId: number) {
    this.db
      .prepare(
        "UPDATE encounters SET status = 'resolved' WHERE id = ? AND campaign_id = ?",
      )
      .run(encounterId, campaignId);
  }

  addPressure(
    campaignId: number,
    pressure: Pick<
      CampaignPressure,
      "name" | "shape" | "threshold" | "consequence"
    >,
  ) {
    this.db
      .prepare(
        "INSERT INTO campaign_pressures (campaign_id,name,shape,threshold,consequence,created_at) VALUES (?,?,?,?,?,?)",
      )
      .run(
        campaignId,
        pressure.name,
        pressure.shape,
        pressure.threshold,
        pressure.consequence,
        now(),
      );
  }

  advancePressure(campaignId: number, pressureId: number, delta: number) {
    this.db
      .prepare(
        "UPDATE campaign_pressures SET current = MAX(0, MIN(threshold, current + ?)) WHERE id = ? AND campaign_id = ? AND status = 'active'",
      )
      .run(delta, pressureId, campaignId);
  }

  resolvePressure(campaignId: number, pressureId: number) {
    this.db
      .prepare(
        "UPDATE campaign_pressures SET status = 'resolved' WHERE id = ? AND campaign_id = ?",
      )
      .run(pressureId, campaignId);
  }

  addRoll(campaignId: number, roll: Omit<RollRecord, "id" | "createdAt">) {
    this.db
      .prepare(
        "INSERT INTO rolls (campaign_id,actor,kind,label,dice,total,detail,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(
        campaignId,
        roll.actor,
        roll.kind,
        roll.label,
        roll.dice,
        roll.total,
        roll.detail,
        now(),
      );
  }

  addNote(campaignId: number, section: string, title: string, body: string) {
    this.db
      .prepare(
        "INSERT INTO wiki_notes (campaign_id,section,title,body,created_at) VALUES (?,?,?,?,?)",
      )
      .run(campaignId, section, title, body, now());
  }

  getState(
    campaignId: number,
    role: Role,
    characterId: number | null,
    joinUrl: string,
  ): CampaignState {
    const campaign = this.db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(campaignId) as Row;
    const characters = (
      this.db
        .prepare("SELECT * FROM characters WHERE campaign_id = ? ORDER BY id")
        .all(campaignId) as Row[]
    ).map(rowToCharacter);
    const hexes = (
      this.db
        .prepare(
          "SELECT * FROM hexes WHERE campaign_id = ? ORDER BY CAST(id AS INTEGER)",
        )
        .all(campaignId) as Row[]
    ).map((r) => rowToHex(r, role));
    const rooms = (
      this.db
        .prepare(
          "SELECT * FROM dungeon_rooms WHERE campaign_id = ? ORDER BY sequence",
        )
        .all(campaignId) as Row[]
    ).map(rowToRoom);
    const encounterRows = this.db
      .prepare(
        "SELECT * FROM encounters WHERE campaign_id = ? ORDER BY id DESC",
      )
      .all(campaignId) as Row[];
    const encounters: Encounter[] = encounterRows.map((encounter) => ({
      id: Number(encounter.id),
      name: String(encounter.name),
      status: String(encounter.status) as "active" | "resolved",
      createdAt: String(encounter.created_at),
      monsters: (
        this.db
          .prepare(
            "SELECT * FROM encounter_monsters WHERE encounter_id = ? ORDER BY id",
          )
          .all(encounter.id) as Row[]
      ).map((row) => {
        const key = String(row.monster_key);
        const staticMonster = this.getMonster(key);
        const name = row.name ? String(row.name) : staticMonster?.name ?? key;
        const tier = Number(row.lore_tier);
        const ac = row.ac != null ? Number(row.ac) : staticMonster?.ac;
        const morale = row.morale != null ? Number(row.morale) : staticMonster?.morale;
        const level = row.level != null ? Number(row.level) : staticMonster?.level;
        const attacks = row.attacks_json
          ? JSON.parse(String(row.attacks_json))
          : staticMonster?.attacks ?? [];
        const traits = row.traits_json
          ? JSON.parse(String(row.traits_json))
          : staticMonster?.traits ?? [];
        const lore = row.lore_json
          ? JSON.parse(String(row.lore_json))
          : staticMonster?.lore ?? [];

        return {
          id: Number(row.id),
          monsterKey: key,
          name,
          currentHp: Number(row.current_hp),
          maxHp: Number(row.max_hp),
          loreTier: tier,
          level,
          family: staticMonster?.family,
          move: staticMonster?.move,
          abilities: staticMonster?.abilities,
          alignment: staticMonster?.alignment,
          harvest: staticMonster?.harvest,
          isVariant: Boolean(row.is_variant),
          variantQuality: row.variant_quality ? String(row.variant_quality) : undefined,
          variantStrength: row.variant_strength ? String(row.variant_strength) : undefined,
          variantWeakness: row.variant_weakness ? String(row.variant_weakness) : undefined,
          ...(tier >= 1 ? { ac, lore: lore.slice(0, tier) } : {}),
          ...(tier >= 2 ? { morale, attacks: [...attacks] } : {}),
          ...(tier >= 3 ? { traits: [...traits] } : {}),
        };
      }),
    }));
    const pressures = (
      this.db
        .prepare(
          "SELECT * FROM campaign_pressures WHERE campaign_id = ? ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, id",
        )
        .all(campaignId) as Row[]
    ).map(
      (row): CampaignPressure => ({
        id: Number(row.id),
        name: String(row.name),
        shape: String(row.shape) as CampaignPressure["shape"],
        current: Number(row.current),
        threshold: Number(row.threshold),
        consequence: String(row.consequence),
        status: String(row.status) as CampaignPressure["status"],
      }),
    );
    const rolls = (
      this.db
        .prepare(
          "SELECT * FROM rolls WHERE campaign_id = ? ORDER BY id DESC LIMIT 60",
        )
        .all(campaignId) as Row[]
    ).map(rowToRoll);
    const notes = (
      this.db
        .prepare(
          "SELECT * FROM wiki_notes WHERE campaign_id = ? ORDER BY id DESC LIMIT 100",
        )
        .all(campaignId) as Row[]
    ).map(
      (row): WikiNote => ({
        id: Number(row.id),
        section: String(row.section),
        title: String(row.title),
        body: String(row.body),
        createdAt: String(row.created_at),
      }),
    );

    const activeZoneId = campaign.active_zone_id ? String(campaign.active_zone_id) : "oakhaven_borderlands";
    const phase = (campaign.current_phase ? String(campaign.current_phase) : "sanctuary") as CampaignPhase;
    const activeZone = this.getZoneManifest(activeZoneId);
    const availableZones = this.listZones();

    return {
      campaign: {
        id: campaignId,
        code: String(campaign.code),
        name: String(campaign.name),
        regionName: String(campaign.region_name),
        act: Number(campaign.act),
        phase,
        activeZoneId,
        joinUrl,
        activeRegionId: campaign.active_region_id ? String(campaign.active_region_id) : undefined,
        partyLocation: campaign.party_location_json ? JSON.parse(String(campaign.party_location_json)) : undefined,
        homeLocation: campaign.home_location_json ? JSON.parse(String(campaign.home_location_json)) : undefined,
      },
      me: { role, characterId },
      characters,
      hexes,
      rooms,
      encounters,
      pressures,
      rolls,
      notes,
      activeZone,
      availableZones,
    };
  }
}

function rowToCharacter(row: Row): Character {
  return {
    id: Number(row.id),
    name: String(row.name),
    ancestry: String(row.ancestry),
    className: String(row.class_name),
    level: Number(row.level),
    hp: Number(row.hp),
    maxHp: Number(row.max_hp),
    ac: Number(row.ac),
    gold: Number(row.gold),
    gearSlots: Number(row.gear_slots),
    abilities: {
      str: Number(row.str),
      dex: Number(row.dex),
      con: Number(row.con),
      int: Number(row.int),
      wis: Number(row.wis),
      cha: Number(row.cha),
    },
    anchors: JSON.parse(String(row.anchors_json)),
    talents: row.talents_json ? JSON.parse(String(row.talents_json)) : [],
    xp: row.xp != null ? Number(row.xp) : 0,
  };
}

function rowToHex(row: Row, role: Role = "player"): PublicHex {
  const revealState = String(row.reveal_state) as PublicHex["revealState"];
  const connections: PublicConnectionSummary[] = row.connections_json
    ? JSON.parse(String(row.connections_json))
    : [];
  const sites: PublicSiteSummary[] = row.sites_json
    ? JSON.parse(String(row.sites_json))
    : [];

  const base: PublicHex = {
    id: String(row.id),
    ring: Number(row.ring),
    q: Number(row.q),
    r: Number(row.r),
    revealState,
  };
  if (row.canonical_key) base.canonicalKey = String(row.canonical_key);
  if (row.primary_zone) base.primaryZone = String(row.primary_zone);
  if (row.secondary_zone) base.secondaryZone = String(row.secondary_zone);

  if (revealState === "unexplored") {
    if (row.road) base.road = String(row.road);
    if (row.river) base.river = String(row.river);
    if (row.horizon_rumor) base.horizonRumor = String(row.horizon_rumor);
    if (row.exit_destination) base.exitDestination = String(row.exit_destination);
    if (row.elevation != null) base.elevation = Number(row.elevation);
    if (connections.length > 0) {
      base.connections = connections.filter((c) => c.kind === "road" || c.kind === "river");
    }
    return base;
  }

  if (revealState === "rumored") {
    if (row.road) base.road = String(row.road);
    if (row.river) base.river = String(row.river);
    if (row.horizon_rumor) base.horizonRumor = String(row.horizon_rumor);
    if (connections.length > 0) base.connections = connections;
    return base;
  }

  // scouted, explored, fully_mapped
  const result: PublicHex = {
    ...base,
    name: String(row.name),
    biome: String(row.biome),
    elevation: row.elevation != null ? Number(row.elevation) : 1,
    road: row.road ? String(row.road) : undefined,
    river: row.river ? String(row.river) : undefined,
    horizonRumor: row.horizon_rumor ? String(row.horizon_rumor) : undefined,
    exitDestination: row.exit_destination ? String(row.exit_destination) : undefined,
    connections,
    sites: sites.filter((s) => !s.isSecret || revealState === "fully_mapped"),
  };

  if (revealState === "scouted") {
    result.landmark = row.landmark ? String(row.landmark) : undefined;
    result.threatTier = Number(row.threat_tier);
  } else {
    result.threatTier = Number(row.threat_tier);
    result.landmark = String(row.landmark);
  }

  return result;
}

function rowToRoom(row: Row): DungeonRoom {
  return {
    id: Number(row.id),
    sequence: Number(row.sequence),
    geometry: String(row.geometry),
    contents: String(row.contents),
    interaction: String(row.interaction),
    exits: Number(row.exits),
    trap: row.trap_json ? JSON.parse(String(row.trap_json)) : undefined,
    createdAt: String(row.created_at),
  };
}

function rowToRoll(row: Row): RollRecord {
  return {
    id: Number(row.id),
    actor: String(row.actor),
    kind: String(row.kind),
    label: String(row.label),
    dice: String(row.dice),
    total: Number(row.total),
    detail: String(row.detail),
    createdAt: String(row.created_at),
  };
}
