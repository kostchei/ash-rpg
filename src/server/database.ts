import { adventurePathDisplayName } from "../shared/adventure-path-names.js";
import { combatSeats, seatIndex, activeSeat, projectCombat } from "../shared/table-companion.js";
import { mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import Database from "better-sqlite3";
import { HEX_DEFINITIONS, MONSTERS, STARTING_EQUIPMENT, SPELLS, ITEMS } from "../shared/content.js";
import { generateHexMap } from "./generators/hex-map.js";
import { generateProceduralRegion, type GeneratedRegionWorld } from "./generators/procedural-region.js";
import { CUSTOM_MONSTER_TEMPLATES, resolveMonsterEntry } from "../shared/monster-aliases.js";
import { abilityModifier, calculateDerivedAc, calculateGearSlots, computeHpStatus, getMonsterAcHint } from "./rules.js";
import type {
  ActZoneAssignment,
  ActivitySession,
  AdventurePathRecord,
  CampaignPhase,
  CampaignPressure,
  CampaignState,
  Character,
  CharacterSpell,
  Combatant,
  CombatState,
  CursedZoneId,
  DungeonConnectionEdge,
  DungeonGraphState,
  DungeonRoom,
  DungeonRoomNode,
  Encounter,
  EncounterGroup,
  EncounterMonster,
  ExpeditionObjective,
  InventoryItem,
  OutcomeResolution,
  PublicAdventurePathSummary,
  PublicConnectionSummary,
  PublicHex,
  PublicSiteSummary,
  RegionGenerationConfig,
  RewardRecord,
  RewardSource,
  Role,
  RollRecord,
  TablePlayerSummary,
  TavernEstablishment,
  TavernLead,
  TreasureRollRecord,
  WikiNote,
  WorldFacility,
  WorldNpc,
  XpAwardRecipient,
  ZoneManifest,
  ZoneSummary,
} from "../shared/types.js";
import { ALL_SLICE_NAMES, requireCombatState, type SliceName, type SlicesUpdate } from "../shared/slices.js";

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
  onRollAdded?: (campaignId: number, roll: RollRecord) => void;
  onNoteAdded?: (campaignId: number, note: WikiNote) => void;

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
        active_zone_id TEXT NOT NULL DEFAULT 'the_gloaming', pin_hash TEXT NOT NULL, host_token TEXT NOT NULL UNIQUE,
        started INTEGER NOT NULL DEFAULT 0, is_secret_path INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        token TEXT PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        character_id INTEGER, ready INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        owner_token TEXT, name TEXT NOT NULL, ancestry TEXT NOT NULL, class_name TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1,
        hp INTEGER NOT NULL, max_hp INTEGER NOT NULL, ac INTEGER NOT NULL, gold INTEGER NOT NULL, gear_slots INTEGER NOT NULL,
        str INTEGER NOT NULL, dex INTEGER NOT NULL, con INTEGER NOT NULL, int INTEGER NOT NULL, wis INTEGER NOT NULL, cha INTEGER NOT NULL,
        anchors_json TEXT NOT NULL, talents_json TEXT DEFAULT '[]', xp INTEGER NOT NULL DEFAULT 0,
        roster_status TEXT NOT NULL DEFAULT 'active', generation_method TEXT, generation_dice_json TEXT, origin_zone_id TEXT, created_at TEXT NOT NULL
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
      CREATE TABLE IF NOT EXISTS site_discoveries (
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL, discovered_at TEXT NOT NULL,
        PRIMARY KEY (campaign_id, site_id)
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
      CREATE TABLE IF NOT EXISTS xp_awards (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL, amount INTEGER NOT NULL, reason TEXT NOT NULL,
        character_ids_json TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(campaign_id, source_id)
      );
      CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_rolls_campaign_created ON rolls(campaign_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_rooms_campaign_sequence ON dungeon_rooms(campaign_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_encounters_campaign_status ON encounters(campaign_id, status);
      CREATE INDEX IF NOT EXISTS idx_pressures_campaign_status ON campaign_pressures(campaign_id, status);
      CREATE INDEX IF NOT EXISTS idx_xp_awards_campaign_source ON xp_awards(campaign_id, source_id);
      CREATE TABLE IF NOT EXISTS campaign_slice_revisions (
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        slice_name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (campaign_id, slice_name)
      );
      CREATE TABLE IF NOT EXISTS table_seating (
        campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
        seats_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS world_facilities (
        id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        location_type TEXT NOT NULL,
        location_id TEXT NOT NULL,
        keeper_npc_id TEXT,
        keeper_name TEXT,
        description TEXT NOT NULL,
        services_json TEXT NOT NULL,
        PRIMARY KEY (campaign_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_facilities_campaign ON world_facilities(campaign_id);
      CREATE TABLE IF NOT EXISTS world_npcs (
        id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        ancestry TEXT NOT NULL,
        location_type TEXT NOT NULL,
        location_id TEXT NOT NULL,
        location_name TEXT,
        disposition TEXT NOT NULL DEFAULT 'neutral',
        notes TEXT NOT NULL DEFAULT '',
        rescue_state TEXT,
        PRIMARY KEY (campaign_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_npcs_campaign ON world_npcs(campaign_id);
      CREATE TABLE IF NOT EXISTS tavern_leads (
        id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        source_npc TEXT NOT NULL,
        claim TEXT NOT NULL,
        direction_hint TEXT NOT NULL,
        apparent_danger TEXT NOT NULL,
        promised_reward TEXT NOT NULL,
        destination_site_id TEXT NOT NULL,
        lead_type TEXT NOT NULL,
        is_empty_site INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (campaign_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_leads_campaign ON tavern_leads(campaign_id);
      PRAGMA optimize;
    `);

    // Ensure columns exist if table was created in older schema version
    const campaignCols = this.db.pragma("table_info(campaigns)") as Array<{ name: string }>;
    if (!campaignCols.some((c) => c.name === "current_phase")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN current_phase TEXT NOT NULL DEFAULT 'sanctuary'");
    }
    if (!campaignCols.some((c) => c.name === "active_zone_id")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN active_zone_id TEXT NOT NULL DEFAULT 'the_gloaming'");
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
    if (!campaignCols.some((c) => c.name === "day")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN day INTEGER NOT NULL DEFAULT 1");
    }
    if (!campaignCols.some((c) => c.name === "watch")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN watch INTEGER NOT NULL DEFAULT 1");
    }
    if (!campaignCols.some((c) => c.name === "watches_traveled_today")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN watches_traveled_today INTEGER NOT NULL DEFAULT 0");
    }
    if (!campaignCols.some((c) => c.name === "weather")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN weather TEXT NOT NULL DEFAULT 'Overcast / Mild Breeze'");
    }
    if (!campaignCols.some((c) => c.name === "rations")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN rations INTEGER NOT NULL DEFAULT 12");
    }
    if (!campaignCols.some((c) => c.name === "active_objective_json")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN active_objective_json TEXT");
    }
    if (!campaignCols.some((c) => c.name === "active_site_id")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN active_site_id TEXT");
    }
    if (!campaignCols.some((c) => c.name === "adventure_path_json")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN adventure_path_json TEXT");
    }
    if (!campaignCols.some((c) => c.name === "tavern_establishment_json")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN tavern_establishment_json TEXT");
    }
    if (!campaignCols.some((c) => c.name === "caller_token")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN caller_token TEXT");
    }
    if (!campaignCols.some((c) => c.name === "revision")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN revision INTEGER NOT NULL DEFAULT 1");
    }
    if (!campaignCols.some((c) => c.name === "started")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN started INTEGER NOT NULL DEFAULT 0");
    }
    if (!campaignCols.some((c) => c.name === "is_secret_path")) {
      this.db.exec("ALTER TABLE campaigns ADD COLUMN is_secret_path INTEGER NOT NULL DEFAULT 0");
    }

    const deviceCols = this.db.pragma("table_info(devices)") as Array<{ name: string }>;
    if (!deviceCols.some((c) => c.name === "ready")) {
      this.db.exec("ALTER TABLE devices ADD COLUMN ready INTEGER NOT NULL DEFAULT 0");
    }

    const charCols = this.db.pragma("table_info(characters)") as Array<{ name: string }>;
    if (!charCols.some((c) => c.name === "talents_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN talents_json TEXT DEFAULT '[]'");
    }
    if (!charCols.some((c) => c.name === "xp")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN xp INTEGER NOT NULL DEFAULT 0");
    }
    if (!charCols.some((c) => c.name === "fatigue")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN fatigue INTEGER NOT NULL DEFAULT 0");
    }
    if (!charCols.some((c) => c.name === "class_id")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN class_id TEXT NOT NULL DEFAULT 'fighter'");
    }
    if (!charCols.some((c) => c.name === "inventory_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN inventory_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!charCols.some((c) => c.name === "spells_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN spells_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!charCols.some((c) => c.name === "conditions_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN conditions_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!charCols.some((c) => c.name === "class_choices_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN class_choices_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!charCols.some((c) => c.name === "death_strikes")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN death_strikes INTEGER NOT NULL DEFAULT 0");
    }
    if (!charCols.some((c) => c.name === "stabilized")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN stabilized INTEGER NOT NULL DEFAULT 0");
    }
    if (!charCols.some((c) => c.name === "roster_status")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN roster_status TEXT NOT NULL DEFAULT 'active'");
    }
    if (!charCols.some((c) => c.name === "generation_method")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN generation_method TEXT");
    }
    if (!charCols.some((c) => c.name === "generation_dice_json")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN generation_dice_json TEXT");
    }
    if (!charCols.some((c) => c.name === "origin_zone_id")) {
      this.db.exec("ALTER TABLE characters ADD COLUMN origin_zone_id TEXT");
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_receipts (
        id INTEGER PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        actor_token TEXT NOT NULL,
        action_id TEXT NOT NULL,
        expected_revision INTEGER,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(campaign_id, actor_token, action_id)
      );
      CREATE INDEX IF NOT EXISTS idx_action_receipts_lookup ON action_receipts(campaign_id, actor_token, action_id);

      CREATE TABLE IF NOT EXISTS activity_sessions (
        id TEXT PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        revision INTEGER NOT NULL DEFAULT 1,
        choices_json TEXT NOT NULL DEFAULT '{}',
        resolved_at TEXT,
        result_json TEXT
      );

      CREATE TABLE IF NOT EXISTS dungeon_graphs (
        site_id TEXT PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        current_room_id INTEGER NOT NULL,
        entry_room_id INTEGER NOT NULL,
        nodes_json TEXT NOT NULL,
        edges_json TEXT NOT NULL,
        exploration_turns INTEGER NOT NULL DEFAULT 0,
        light_turns_remaining INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS combat_states (
        encounter_id INTEGER PRIMARY KEY REFERENCES encounters(id) ON DELETE CASCADE,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        round INTEGER NOT NULL DEFAULT 1,
        active_index INTEGER NOT NULL DEFAULT 0,
        initiative_order_json TEXT NOT NULL,
        conditions_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        contents_json TEXT NOT NULL,
        claimed INTEGER NOT NULL DEFAULT 0,
        allocations_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS campaign_acts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        act_number INTEGER NOT NULL,
        zone_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        level_min INTEGER NOT NULL DEFAULT 1,
        level_max INTEGER NOT NULL DEFAULT 3,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        prerequisites_json TEXT,
        transition_route_json TEXT,
        content_version TEXT NOT NULL DEFAULT 'v1',
        created_at TEXT NOT NULL,
        UNIQUE(campaign_id, act_number),
        UNIQUE(campaign_id, zone_id)
      );

      CREATE TABLE IF NOT EXISTS encounter_groups (
        id TEXT PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        site_id TEXT,
        room_id INTEGER,
        name TEXT NOT NULL,
        member_count INTEGER NOT NULL DEFAULT 1,
        members_json TEXT NOT NULL DEFAULT '[]',
        policy_type TEXT NOT NULL DEFAULT 'general_monster',
        guarding_source_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS treasure_rolls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        group_id TEXT NOT NULL,
        policy_slot TEXT NOT NULL DEFAULT 'carried_treasure',
        policy_version TEXT NOT NULL DEFAULT 'v1',
        seed TEXT NOT NULL,
        roll INTEGER NOT NULL,
        present INTEGER NOT NULL,
        source_id TEXT,
        table_basis TEXT NOT NULL,
        quality TEXT NOT NULL DEFAULT 'poor',
        coins_json TEXT NOT NULL DEFAULT '{"cp":0,"sp":0,"gp":0}',
        items_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        UNIQUE(campaign_id, group_id, policy_slot)
      );

      CREATE TABLE IF NOT EXISTS reward_sources (
        id TEXT PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        quality TEXT NOT NULL DEFAULT 'normal',
        xp_value INTEGER NOT NULL DEFAULT 0,
        coins_json TEXT NOT NULL DEFAULT '{"cp":0,"sp":0,"gp":0}',
        items_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'unclaimed',
        access_state TEXT NOT NULL DEFAULT 'unrevealed',
        exclusion_group TEXT,
        group_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS xp_award_recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        award_sequence INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        level_before INTEGER NOT NULL,
        xp_before INTEGER NOT NULL,
        level_after INTEGER NOT NULL,
        xp_after INTEGER NOT NULL,
        reset_loss INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'applied',
        created_at TEXT NOT NULL,
        UNIQUE(campaign_id, source_id, character_id)
      );

      CREATE TABLE IF NOT EXISTS path_outcomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        deed_id TEXT NOT NULL,
        outcome_type TEXT NOT NULL,
        approach TEXT NOT NULL,
        notes TEXT,
        story_xp_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(campaign_id, deed_id)
      );

      CREATE INDEX IF NOT EXISTS idx_treasure_rolls_group ON treasure_rolls(campaign_id, group_id);
      CREATE INDEX IF NOT EXISTS idx_encounter_groups_site ON encounter_groups(campaign_id, site_id);
      CREATE INDEX IF NOT EXISTS idx_reward_sources_campaign ON reward_sources(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_acts_campaign ON campaign_acts(campaign_id);
    `);

    const graphCols = this.db.pragma("table_info(dungeon_graphs)") as Array<{ name: string }>;
    if (!graphCols.some(c => c.name === "site_structure_json")) {
      this.db.exec("ALTER TABLE dungeon_graphs ADD COLUMN site_structure_json TEXT");
    }
    const roomCols = this.db.pragma("table_info(dungeon_rooms)") as Array<{ name: string }>;
    if (!roomCols.some((c) => c.name === "site_id")) {
      this.db.exec("ALTER TABLE dungeon_rooms ADD COLUMN site_id TEXT");
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

  setPartyLocation(campaignId: number, location: { q: number; r: number; layerId?: string }) {
    this.db
      .prepare("UPDATE campaigns SET party_location_json = ? WHERE id = ?")
      .run(JSON.stringify(location), campaignId);
  }

  discoverSite(campaignId: number, siteId: string) {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO site_discoveries (campaign_id, site_id, discovered_at) VALUES (?, ?, ?)",
      )
      .run(campaignId, siteId, now());
  }

  isSiteDiscovered(campaignId: number, siteId: string): boolean {
    const row = this.db
      .prepare(
        "SELECT 1 FROM site_discoveries WHERE campaign_id = ? AND site_id = ?",
      )
      .get(campaignId, siteId);
    return !!row;
  }

  getDiscoveredSiteIds(campaignId: number): Set<string> {
    const rows = this.db
      .prepare("SELECT site_id FROM site_discoveries WHERE campaign_id = ?")
      .all(campaignId) as { site_id: string }[];
    return new Set(rows.map((r) => r.site_id));
  }

  /**
   * Current site occupancy per hex, read live rather than from a snapshot taken when the hex was
   * charted. Terrain and landmarks are permanent once observed; who or what holds a place is not.
   */
  getSitesByHex(campaignId: number): Map<string, PublicSiteSummary[]> {
    const rows = this.db
      .prepare(
        `SELECT s.* FROM sites s
         JOIN regions rg ON rg.id = s.region_id
         WHERE rg.campaign_id = ?`,
      )
      .all(campaignId) as Row[];
    const index = new Map<string, PublicSiteSummary[]>();
    for (const row of rows) {
      const key = String(row.canonical_key);
      const support = row.support_json ? JSON.parse(String(row.support_json)) : undefined;
      const summary: PublicSiteSummary = {
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind) as PublicSiteSummary["kind"],
        description: support?.reasonForLocation,
        isSecret: row.visibility === "secret",
        visibility: String(row.visibility) as PublicSiteSummary["visibility"],
      };
      const bucket = index.get(key);
      if (bucket) bucket.push(summary);
      else index.set(key, [summary]);
    }
    return index;
  }

  saveGeneratedRegion(campaignId: number, world: GeneratedRegionWorld) {
    const insertRegion = this.db.prepare(`
      INSERT INTO regions 
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
      (campaign_id, id, ring, q, r, name, biome, threat_tier, landmark, reveal_state, road, river, horizon_rumor, exit_destination, elevation, canonical_key, primary_zone, secondary_zone, connections_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      // Find current max revision for this campaign and deactivate prior active region
      const lastRevRow = this.db
        .prepare("SELECT MAX(revision) as max_rev FROM regions WHERE campaign_id = ?")
        .get(campaignId) as { max_rev: number | null } | undefined;
      const nextRevision = (lastRevRow?.max_rev ?? 0) + 1;

      this.db
        .prepare("UPDATE regions SET active = 0 WHERE campaign_id = ?")
        .run(campaignId);

      // 1. Region (INSERT, preserving history and avoiding FK cascade deletions)
      insertRegion.run(
        world.region.id,
        campaignId,
        JSON.stringify(world.region.selection),
        world.region.seed,
        world.region.generatorVersion,
        world.region.contentVersion,
        world.region.rulesVersion,
        world.region.attempt,
        nextRevision,
        1,
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
          home_location_json = ?,
          tavern_establishment_json = ?,
          adventure_path_json = ?
        WHERE id = ?
      `).run(
        world.region.id,
        primaryZone,
        JSON.stringify({ q: 0, r: 0, layerId: "surface" }),
        JSON.stringify({ q: 0, r: 0, layerId: "surface" }),
        world.tavernEstablishment ? JSON.stringify(world.tavernEstablishment) : null,
        world.adventurePath ? JSON.stringify(world.adventurePath) : null,
        campaignId,
      );

      const havenSite = world.sites.find((s) => s.kind === "haven");
      if (havenSite) {
        this.discoverSite(campaignId, havenSite.id);
      }
    })();
  }

  previewRegion(config: RegionGenerationConfig): GeneratedRegionWorld {
    return generateProceduralRegion(0, config);
  }

  startCampaign(campaignId: number) {
    const row = this.db.prepare("SELECT started FROM campaigns WHERE id = ?").get(campaignId) as { started: number } | undefined;
    if (row && row.started === 1) {
      return { started: true, alreadyStarted: true };
    }
    this.db.prepare("UPDATE campaigns SET started = 1, current_phase = 'sanctuary' WHERE id = ?").run(campaignId);
    return { started: true, alreadyStarted: false };
  }

  createCampaign(
    name: string,
    regionName: string,
    pin: string,
    generationConfig?: RegionGenerationConfig,
    pathSelection?: { mode?: "explicit" | "secret"; pathId?: string },
  ) {
    let code = campaignCode();
    while (this.db.prepare("SELECT 1 FROM campaigns WHERE code = ?").get(code))
      code = campaignCode();
    const hostToken = token();
    const isSecretPath = pathSelection?.mode === "secret" ? 1 : 0;

    if (!generationConfig || (generationConfig as any).legacy === true) {
      const defaultAP = {
        pathId: "the_mind_below",
        name: "The Night Below",
        progress: { reach: 0, awakening: 0, knowledge: 0 },
        aquaticMethodsRevealed: [],
      };
      const result = this.db
        .prepare(
          "INSERT INTO campaigns (code,name,region_name,current_phase,active_zone_id,pin_hash,host_token,started,is_secret_path,adventure_path_json,created_at) VALUES (?,?,?,?,?,?,?,0,?,?,?)",
        )
        .run(code, name, regionName, "sanctuary", "the_gloaming", hashPin(pin), hostToken, isSecretPath, JSON.stringify(defaultAP), now());
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
      this.seedStartingWorld(campaignId);
      return { code, hostToken, campaignId, isSecretPath: Boolean(isSecretPath) };
    }

    const config = generationConfig;
    const primaryZone =
      config.selection.mode === "single"
        ? config.selection.zoneId
        : config.selection.zoneIds[0];

    // Generate procedural world FIRST so any failure aborts before campaign record insertion
    const world = generateProceduralRegion(0, {
      ...config,
      seed: config.seed || campaignCode(),
    });

    let campaignId = 0;
    this.db.transaction(() => {
      const result = this.db
        .prepare(
          "INSERT INTO campaigns (code,name,region_name,current_phase,active_zone_id,pin_hash,host_token,started,is_secret_path,created_at) VALUES (?,?,?,?,?,?,?,0,?,?)",
        )
        .run(code, name, regionName, "sanctuary", primaryZone, hashPin(pin), hostToken, isSecretPath, now());
      campaignId = Number(result.lastInsertRowid);

      world.region.campaignId = campaignId;
      const h00 = world.initial19PublicHexes.find((h) => h.id === "00");
      if (h00) {
        h00.name = `${name} Sanctuary`;
      }

      this.saveGeneratedRegion(campaignId, world);
      this.seedStartingWorld(campaignId);
    })();

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
      const theme = typeof themeOrConfig === "string" ? themeOrConfig.toLowerCase().trim() : "temperate";
      const zoneMap: Record<string, CursedZoneId> = {
        temperate: "the_gloaming",
        coastal: "midnight_sun",
        highland: "dwellers_in_the_deep",
        wildwood: "the_gloaming",
        marshland: "river_of_night",
        desert: "red_sands",
        urban: "city_of_masks",
        the_gloaming: "the_gloaming",
        red_sands: "red_sands",
        midnight_sun: "midnight_sun",
        river_of_night: "river_of_night",
        dwellers_in_the_deep: "dwellers_in_the_deep",
        city_of_masks: "city_of_masks",
      };
      const zoneId = zoneMap[theme];
      if (!zoneId) {
        throw new Error(`Unknown theme or zone: "${themeOrConfig}"`);
      }
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
    return world;
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
    /** Rescued NPCs arrive with nothing, so their class pack must not be granted. */
    options: { startingGear?: boolean } = {},
  ) {
    const a = input.abilities;
    const classId = input.classId || input.className.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const startingGear = options.startingGear !== false;

    const inventory: InventoryItem[] = input.inventory && input.inventory.length > 0
      ? input.inventory
      : (startingGear && STARTING_EQUIPMENT[classId] ? STARTING_EQUIPMENT[classId].map((packItem) => {
          const itemDef = ITEMS.find((it) => it.id === packItem.itemId);
          return {
            instanceId: randomBytes(8).toString("hex"),
            itemId: packItem.itemId,
            name: itemDef?.name ?? packItem.itemId,
            kind: itemDef?.kind ?? "gear",
            slots: itemDef?.slots ?? 1,
            equipped: packItem.equipped ?? false,
            quantity: packItem.quantity ?? 1,
            damage: itemDef?.damage,
            properties: itemDef?.properties,
            baseAc: itemDef?.baseAc,
            acBonus: itemDef?.acBonus,
            maxDexMod: itemDef?.maxDexMod,
          };
        }) : []);

    let spells: CharacterSpell[] = input.spells && input.spells.length > 0
      ? input.spells
      : [];

    if (spells.length === 0) {
      if (classId === "priest") {
        spells = SPELLS.filter((s) => s.tier === 1 && s.sphere === "divine").slice(0, 2).map((s) => ({
          spellId: s.id,
          tier: s.tier,
          available: true,
          penanceRequired: false,
        }));
      } else if (classId === "wizard") {
        spells = SPELLS.filter((s) => s.tier === 1 && s.sphere === "arcane").slice(0, 3).map((s) => ({
          spellId: s.id,
          tier: s.tier,
          available: true,
          penanceRequired: false,
        }));
      }
    }

    const finalAc = inventory.length > 0 ? calculateDerivedAc(inventory, abilityModifier(a.dex)).ac : input.ac;
    const finalGearSlots = calculateGearSlots({ className: input.className, abilities: { str: a.str, con: a.con } });

    let rosterStatus = input.rosterStatus;
    if (ownerToken) {
      const owned = this.db
        .prepare("SELECT id, roster_status FROM characters WHERE campaign_id = ? AND owner_token = ?")
        .all(campaignId, ownerToken) as Array<{ id: number; roster_status: string }>;
      if (!rosterStatus) {
        rosterStatus = owned.length === 0 ? "active" : "reserve";
      }
    } else {
      if (!rosterStatus) rosterStatus = "active";
    }

    const result = this.db
      .prepare(
        `INSERT INTO characters
      (campaign_id,owner_token,name,ancestry,class_name,level,hp,max_hp,ac,gold,gear_slots,str,dex,con,int,wis,cha,anchors_json,talents_json,xp,fatigue,class_id,inventory_json,spells_json,conditions_json,class_choices_json,death_strikes,stabilized,roster_status,generation_method,generation_dice_json,origin_zone_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        campaignId,
        ownerToken,
        input.name,
        input.ancestry,
        input.className,
        input.level ?? 1,
        input.hp,
        input.maxHp,
        finalAc ?? input.ac ?? 10,
        input.gold,
        finalGearSlots,
        a.str,
        a.dex,
        a.con,
        a.int,
        a.wis,
        a.cha,
        JSON.stringify(input.anchors ?? []),
        JSON.stringify(input.talents ?? []),
        input.xp ?? 0,
        input.fatigue ?? 0,
        classId,
        JSON.stringify(inventory),
        JSON.stringify(spells),
        JSON.stringify(input.conditions ?? []),
        JSON.stringify(input.classChoices ?? {}),
        input.deathStrikes ?? 0,
        input.stabilized ? 1 : 0,
        rosterStatus,
        input.generationMethod ?? null,
        input.generationDice ? JSON.stringify(input.generationDice) : null,
        input.originZoneId ?? null,
        now(),
      );
    const id = Number(result.lastInsertRowid);
    if (ownerToken && rosterStatus === "active")
      this.db
        .prepare(
          "UPDATE devices SET character_id = ? WHERE token = ? AND campaign_id = ?",
        )
        .run(id, ownerToken, campaignId);
    return id;
  }

  /**
   * The party adjustment stage before setting off: name exactly who marches. Retainers
   * and rescued companions count towards the cap like anyone else.
   */
  setPartyRoster(campaignId: number, characterIds: number[], minParty: number, maxParty: number) {
    const unique = [...new Set(characterIds)];
    if (unique.length !== characterIds.length) throw new Error("A character was listed twice");
    if (unique.length < minParty) {
      throw new Error(`A party leaving the haven must number at least ${minParty}, retainers included`);
    }
    if (unique.length > maxParty) {
      throw new Error(`A party leaving the haven may number at most ${maxParty}, retainers included`);
    }

    const campaign = this.db.prepare("SELECT current_phase FROM campaigns WHERE id = ?")
      .get(campaignId) as { current_phase: string } | undefined;
    const activeCamp = this.db.prepare(
      "SELECT 1 FROM activity_sessions WHERE campaign_id = ? AND kind IN ('camp', 'camp_night') AND status = 'open'",
    ).get(campaignId);
    if (campaign?.current_phase !== "sanctuary" && !activeCamp) {
      throw new Error("The party can only be adjusted in a haven sanctuary or during camp");
    }

    const rows = this.db
      .prepare("SELECT id, owner_token FROM characters WHERE campaign_id = ?")
      .all(campaignId) as Array<{ id: number; owner_token: string | null }>;
    for (const id of unique) {
      if (!rows.some((row) => row.id === id)) throw new Error(`Character ${id} is not in this campaign`);
    }

    this.db.transaction(() => {
      this.db.prepare("UPDATE characters SET roster_status = 'reserve' WHERE campaign_id = ?").run(campaignId);
      const activate = this.db.prepare("UPDATE characters SET roster_status = 'active' WHERE id = ?");
      for (const id of unique) activate.run(id);
      // Keep every device pointed at one of its own marching characters.
      const devices = this.db
        .prepare("SELECT token, character_id FROM devices WHERE campaign_id = ?")
        .all(campaignId) as Array<{ token: string; character_id: number | null }>;
      for (const device of devices) {
        const owned = rows.filter((row) => row.owner_token === device.token).map((row) => row.id);
        const marching = owned.filter((id) => unique.includes(id));
        if (device.character_id && marching.includes(device.character_id)) continue;
        this.db.prepare("UPDATE devices SET character_id = ? WHERE token = ? AND campaign_id = ?")
          .run(marching[0] ?? null, device.token, campaignId);
      }
    })();

    return { active: unique };
  }

  swapActiveCharacter(campaignId: number, ownerToken: string, characterId: number) {
    const target = this.db
      .prepare("SELECT id, owner_token FROM characters WHERE id = ? AND campaign_id = ?")
      .get(characterId, campaignId) as { id: number; owner_token: string } | undefined;
    if (!target) throw new Error("Character not found");
    if (target.owner_token !== ownerToken) {
      throw new Error("You do not own this character");
    }

    const campaign = this.db.prepare("SELECT current_phase FROM campaigns WHERE id = ?").get(campaignId) as { current_phase: string } | undefined;
    const activeCamp = this.db.prepare("SELECT 1 FROM activity_sessions WHERE campaign_id = ? AND kind IN ('camp', 'camp_night') AND status = 'open'").get(campaignId);
    if (campaign?.current_phase !== "sanctuary" && !activeCamp) {
      throw new Error("Roster swapping is only permitted in a haven sanctuary or during camp");
    }

    this.db.transaction(() => {
      this.db
        .prepare("UPDATE characters SET roster_status = 'reserve' WHERE campaign_id = ? AND owner_token = ?")
        .run(campaignId, ownerToken);
      this.db
        .prepare("UPDATE characters SET roster_status = 'active' WHERE id = ?")
        .run(characterId);
      this.db
        .prepare("UPDATE devices SET character_id = ? WHERE token = ? AND campaign_id = ?")
        .run(characterId, ownerToken, campaignId);
    })();

    return { characterId, rosterStatus: "active" };
  }

  setDeviceReady(campaignId: number, token: string, ready: boolean) {
    this.db
      .prepare("UPDATE devices SET ready = ? WHERE token = ? AND campaign_id = ?")
      .run(ready ? 1 : 0, token, campaignId);
  }

  updateCharacter(campaignId: number, character: Character) {
    const a = character.abilities;
    const classId = character.classId || character.className.toLowerCase().replace(/[^a-z0-9_]/g, "");
    this.db
      .prepare(
        `UPDATE characters SET 
        name = ?, ancestry = ?, class_name = ?, level = ?, hp = ?, max_hp = ?, ac = ?, gold = ?, gear_slots = ?,
        str = ?, dex = ?, con = ?, int = ?, wis = ?, cha = ?, anchors_json = ?, talents_json = ?, xp = ?,
        fatigue = ?, class_id = ?, inventory_json = ?, spells_json = ?, conditions_json = ?, class_choices_json = ?,
        death_strikes = ?, stabilized = ?
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
        character.fatigue ?? 0,
        classId,
        JSON.stringify(character.inventory ?? []),
        JSON.stringify(character.spells ?? []),
        JSON.stringify(character.conditions ?? []),
        JSON.stringify(character.classChoices ?? {}),
        character.deathStrikes ?? 0,
        character.stabilized ? 1 : 0,
        character.id,
        campaignId,
      );
  }

  setCallerToken(campaignId: number, callerToken: string | null): void {
    this.db
      .prepare("UPDATE campaigns SET caller_token = ?, revision = revision + 1 WHERE id = ?")
      .run(callerToken, campaignId);
  }

  getCallerToken(campaignId: number): string | null {
    const row = this.db
      .prepare("SELECT caller_token FROM campaigns WHERE id = ?")
      .get(campaignId) as { caller_token: string | null } | undefined;
    return row?.caller_token ?? null;
  }

  getSliceRevisions(campaignId: number): Record<SliceName, number> {
    const rows = this.db
      .prepare("SELECT slice_name, revision FROM campaign_slice_revisions WHERE campaign_id = ?")
      .all(campaignId) as Array<{ slice_name: string; revision: number }>;
    const revisions: Partial<Record<SliceName, number>> = {};
    for (const r of rows) {
      revisions[r.slice_name as SliceName] = Number(r.revision);
    }
    for (const name of ALL_SLICE_NAMES) {
      if (revisions[name] === undefined) {
        revisions[name] = 1;
      }
    }
    return revisions as Record<SliceName, number>;
  }

  touchSlices(
    campaignId: number,
    sliceNames: readonly SliceName[],
  ): Record<SliceName, number> {
    const upsert = this.db.prepare(`
      INSERT INTO campaign_slice_revisions (campaign_id, slice_name, revision)
      VALUES (?, ?, 2)
      ON CONFLICT(campaign_id, slice_name) DO UPDATE SET revision = revision + 1
    `);
    for (const name of sliceNames) {
      upsert.run(campaignId, name);
    }
    return this.getSliceRevisions(campaignId);
  }

  executeMutation<T>(
    campaignId: number,
    actorToken: string,
    actionId: string,
    expectedRevision: number | undefined,
    mutate: () => T,
  ): { result: T; revision: number } {
    return this.db.transaction(() => {
      // 1. Idempotency receipt check
      const existingReceipt = this.db
        .prepare(
          "SELECT result_json, expected_revision FROM action_receipts WHERE campaign_id = ? AND actor_token = ? AND action_id = ?",
        )
        .get(campaignId, actorToken, actionId) as { result_json: string; expected_revision: number | null } | undefined;

      if (existingReceipt) {
        const campaignRow = this.db
          .prepare("SELECT revision FROM campaigns WHERE id = ?")
          .get(campaignId) as { revision: number } | undefined;
        return {
          result: JSON.parse(existingReceipt.result_json) as T,
          revision: campaignRow?.revision ?? 1,
        };
      }

      // 2. Revision check
      const campaignRow = this.db
        .prepare("SELECT revision FROM campaigns WHERE id = ?")
        .get(campaignId) as { revision: number } | undefined;
      const currentRevision = campaignRow?.revision ?? 1;

      if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
        throw new Error(
          `State revision conflict: expected revision ${expectedRevision} but current revision is ${currentRevision}`,
        );
      }

      // 3. Perform mutation
      const result = mutate();

      // 4. Increment campaign revision
      const newRevision = currentRevision + 1;
      this.db
        .prepare("UPDATE campaigns SET revision = ? WHERE id = ?")
        .run(newRevision, campaignId);

      // 5. Store action receipt
      this.db
        .prepare(
          `INSERT INTO action_receipts (campaign_id, actor_token, action_id, expected_revision, result_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          campaignId,
          actorToken,
          actionId,
          expectedRevision ?? null,
          JSON.stringify(result ?? {}),
          now(),
        );

      return { result, revision: newRevision };
    })();
  }

  getActiveSession(campaignId: number, kind?: string): ActivitySession | null {
    const row = kind
      ? (this.db
          .prepare("SELECT * FROM activity_sessions WHERE campaign_id = ? AND kind = ? AND status = 'open' ORDER BY rowid DESC LIMIT 1")
          .get(campaignId, kind) as Row | undefined)
      : (this.db
          .prepare("SELECT * FROM activity_sessions WHERE campaign_id = ? AND status = 'open' ORDER BY rowid DESC LIMIT 1")
          .get(campaignId) as Row | undefined);

    if (!row) return null;
    return {
      id: String(row.id),
      campaignId: Number(row.campaign_id),
      kind: String(row.kind) as "tavern" | "camp",
      status: String(row.status) as "open" | "resolved",
      revision: Number(row.revision),
      choices: row.choices_json ? JSON.parse(String(row.choices_json)) : {},
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      result: row.result_json ? JSON.parse(String(row.result_json)) : undefined,
    };
  }

  saveActivitySession(campaignId: number, session: ActivitySession): void {
    this.db
      .prepare(
        `INSERT INTO activity_sessions (id, campaign_id, kind, status, revision, choices_json, resolved_at, result_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           revision = excluded.revision,
           choices_json = excluded.choices_json,
           resolved_at = excluded.resolved_at,
           result_json = excluded.result_json`,
      )
      .run(
        session.id,
        campaignId,
        session.kind,
        session.status,
        session.revision,
        JSON.stringify(session.choices),
        session.resolvedAt ?? null,
        session.result ? JSON.stringify(session.result) : null,
      );
  }

  getDungeonGraph(campaignId: number, siteId?: string): DungeonGraphState | null {
    const targetSiteId = siteId || (this.db.prepare("SELECT active_site_id FROM campaigns WHERE id = ?").get(campaignId) as { active_site_id: string | null } | undefined)?.active_site_id;
    if (!targetSiteId) return null;

    const row = this.db
      .prepare("SELECT * FROM dungeon_graphs WHERE campaign_id = ? AND site_id = ?")
      .get(campaignId, targetSiteId) as Row | undefined;
    if (!row) return null;

    return {
      siteId: String(row.site_id),
      campaignId: Number(row.campaign_id),
      currentRoomId: Number(row.current_room_id),
      entryRoomId: Number(row.entry_room_id),
      nodes: JSON.parse(String(row.nodes_json)),
      edges: JSON.parse(String(row.edges_json)),
      explorationTurns: Number(row.exploration_turns),
      lightTurnsRemaining: Number(row.light_turns_remaining),
      siteStructure: row.site_structure_json ? JSON.parse(String(row.site_structure_json)) : undefined,
    };
  }

  saveDungeonGraph(campaignId: number, graph: DungeonGraphState): void {
    for (const room of graph.nodes) {
      const npc = room.objective?.completed ? room.objective.generated?.rescuedNpc : undefined;
      if (!npc) continue;
      const id = `rescued:${graph.siteId}:${room.id}`;
      if (!this.db.prepare("SELECT 1 FROM world_npcs WHERE campaign_id = ? AND id = ?").get(campaignId, id)) {
        this.addNpc(campaignId, { id, name: npc.name, role: npc.className, ancestry: npc.ancestry,
          locationType: "site_room", locationId: `${graph.siteId}:${room.id}`, locationName: `${room.title} (room ${room.id})`,
          disposition: "uncertain", notes: "Freed from captivity.", rescueState: "rescued" });
      }
    }

    this.db
      .prepare(
        `INSERT INTO dungeon_graphs (site_id, campaign_id, current_room_id, entry_room_id, nodes_json, edges_json, exploration_turns, light_turns_remaining, site_structure_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(site_id) DO UPDATE SET
           current_room_id = excluded.current_room_id,
           entry_room_id = excluded.entry_room_id,
           nodes_json = excluded.nodes_json,
           edges_json = excluded.edges_json,
           exploration_turns = excluded.exploration_turns,
           light_turns_remaining = excluded.light_turns_remaining,
           site_structure_json = excluded.site_structure_json`,
      )
      .run(
        graph.siteId,
        campaignId,
        graph.currentRoomId,
        graph.entryRoomId,
        JSON.stringify(graph.nodes),
        JSON.stringify(graph.edges),
        graph.explorationTurns,
        graph.lightTurnsRemaining,
        graph.siteStructure ? JSON.stringify(graph.siteStructure) : null,
      );
  }

  getCombatState(campaignId: number, encounterId?: number): CombatState | null {
    const row = encounterId
      ? (this.db
          .prepare("SELECT * FROM combat_states WHERE campaign_id = ? AND encounter_id = ?")
          .get(campaignId, encounterId) as Row | undefined)
      : (this.db
          .prepare(
            `SELECT cs.* FROM combat_states cs
             JOIN encounters e ON cs.encounter_id = e.id
             WHERE cs.campaign_id = ? AND cs.status = 'active'
             ORDER BY cs.encounter_id DESC LIMIT 1`,
          )
          .get(campaignId) as Row | undefined);
    if (!row) return null;

    const combatants: Combatant[] = JSON.parse(String(row.initiative_order_json));
    for (const c of combatants) {
      if (c.kind === "monster") {
        c.hpStatus = computeHpStatus(c.currentHp, c.maxHp);
        c.acRevealed = c.acRevealed ?? false;
        if (!c.acRevealed && !c.acHint) c.acHint = getMonsterAcHint(c.ac);
        if (c.acRevealed) c.acHint = undefined;
      }
    }

    const meta = row.conditions_json ? JSON.parse(String(row.conditions_json)) : {};

    return {
      encounterId: Number(row.encounter_id),
      campaignId: Number(row.campaign_id),
      round: Number(row.round),
      activeIndex: Number(row.active_index),
      combatants,
      status: String(row.status) as "active" | "resolved",
      moraleTriggerChecked: meta.moraleTriggerChecked,
      seatingOrder: meta.seatingOrder,
      winnerCombatantId: meta.winnerCombatantId,
    };
  }

  saveCombatState(campaignId: number, combat: CombatState): void {
    this.db
      .prepare(
        `INSERT INTO combat_states (encounter_id, campaign_id, round, active_index, initiative_order_json, conditions_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(encounter_id) DO UPDATE SET
           round = excluded.round,
           active_index = excluded.active_index,
           initiative_order_json = excluded.initiative_order_json,
           conditions_json = excluded.conditions_json,
           status = excluded.status`,
      )
      .run(
        combat.encounterId,
        campaignId,
        combat.round,
        combat.activeIndex,
        JSON.stringify(combat.combatants),
        JSON.stringify({
          moraleTriggerChecked: combat.moraleTriggerChecked,
          seatingOrder: combat.seatingOrder,
          winnerCombatantId: combat.winnerCombatantId,
        }),
        combat.status,
      );
  }

  revealCombatantAc(campaignId: number, combatantId: string): CombatState {
    const combat = this.getCombatState(campaignId);
    if (!combat || combat.status !== "active") throw new Error("No active combat");
    const target = combat.combatants.find((c) => c.id === combatantId);
    if (!target) throw new Error("Combatant not found");
    target.acRevealed = true;
    this.saveCombatState(campaignId, combat);
    return combat;
  }

  getTableSeating(campaignId: number): string[] {
    const row = this.db.prepare("SELECT seats_json FROM table_seating WHERE campaign_id = ?").get(campaignId) as { seats_json: string } | undefined;
    return row ? JSON.parse(row.seats_json) : [];
  }

  setCombatSeating(campaignId: number, seatingOrder: string[]): CombatState {
    const combat = this.getCombatState(campaignId);
    if (!combat || combat.status !== "active") throw new Error("No active combat");
    const seats = seatingOrder.map(id => combat.combatants.find(c => c.id === id)?.kind === "monster" ? "monsters" : id);
    const available = combatSeats(combat);
    if (new Set(seats).size !== seats.length || seats.length !== available.length || seats.some(id => !available.includes(id))) {
      throw new Error("Include every player and one monster group seat exactly once");
    }
    combat.seatingOrder = seats;
    this.db.prepare("INSERT INTO table_seating VALUES (?, ?) ON CONFLICT(campaign_id) DO UPDATE SET seats_json = excluded.seats_json").run(campaignId, JSON.stringify(seats));
    this.saveCombatState(campaignId, combat);
    return combat;
  }

  spotRoomTrap(campaignId: number, roomId: number): DungeonGraphState {
    const graph = this.getDungeonGraph(campaignId);
    if (!graph) throw new Error("No active dungeon");
    const node = graph.nodes.find((n) => n.id === roomId);
    if (!node || (!node.explored && node.id !== graph.currentRoomId)) throw new Error("Enter the room before searching it");
    if (!node.trap) throw new Error("No trap in room");
    node.trap.spotted = true;
    this.saveDungeonGraph(campaignId, graph);
    return graph;
  }

  getFacilities(campaignId: number): WorldFacility[] {
    const rows = this.db
      .prepare("SELECT * FROM world_facilities WHERE campaign_id = ? ORDER BY id")
      .all(campaignId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      campaignId: Number(r.campaign_id),
      name: String(r.name),
      kind: String(r.kind) as WorldFacility["kind"],
      locationType: String(r.location_type) as WorldFacility["locationType"],
      locationId: String(r.location_id) === "haven-00" ? "00" : String(r.location_id),
      keeperNpcId: r.keeper_npc_id ? String(r.keeper_npc_id) : undefined,
      keeperName: r.keeper_name ? String(r.keeper_name) : undefined,
      description: String(r.description),
      services: r.services_json ? JSON.parse(String(r.services_json)) : [],
    }));
  }

  getNpcs(campaignId: number): WorldNpc[] {
    const rows = this.db
      .prepare("SELECT * FROM world_npcs WHERE campaign_id = ? ORDER BY id")
      .all(campaignId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      campaignId: Number(r.campaign_id),
      name: String(r.name),
      role: String(r.role),
      ancestry: String(r.ancestry),
      locationType: String(r.location_type) as WorldNpc["locationType"],
      locationId: String(r.location_id),
      locationName: r.location_name ? String(r.location_name) : undefined,
      disposition: String(r.disposition) as WorldNpc["disposition"],
      notes: String(r.notes),
      rescueState: r.rescue_state ? (String(r.rescue_state) as WorldNpc["rescueState"]) : undefined,
    }));
  }

  getTavernLeads(campaignId: number): TavernLead[] {
    const row = this.db.prepare("SELECT tavern_establishment_json FROM campaigns WHERE id = ?").get(campaignId) as { tavern_establishment_json: string | null };
    const tavern: TavernEstablishment | null = row?.tavern_establishment_json ? JSON.parse(row.tavern_establishment_json) : null;
    return (tavern?.leads ?? []).map((lead, index) => ({ ...lead, campaignId,
      sourceNpc: lead.sourceNpc ?? lead.source,
      apparentDanger: lead.apparentDanger ?? lead.dangerHint,
      destinationSiteId: lead.targetSiteId,
      leadType: index === 0 ? "path_primary" : index === 1 ? "path_secondary" : "unrelated",
      isEmptySite: lead.destinationOutcome === "empty" || lead.destinationOutcome === "false",
    }));
  }

  updateNpcDisposition(
    campaignId: number,
    npcId: string,
    disposition: WorldNpc["disposition"],
    notes?: string,
  ): WorldNpc {
    const current = this.db
      .prepare("SELECT * FROM world_npcs WHERE campaign_id = ? AND id = ?")
      .get(campaignId, npcId) as Row | undefined;
    if (!current) throw new Error(`NPC ${npcId} not found`);
    const newNotes = notes !== undefined ? notes : String(current.notes);
    this.db
      .prepare("UPDATE world_npcs SET disposition = ?, notes = ? WHERE campaign_id = ? AND id = ?")
      .run(disposition, newNotes, campaignId, npcId);
    return {
      id: String(current.id),
      campaignId,
      name: String(current.name),
      role: String(current.role),
      ancestry: String(current.ancestry),
      locationType: String(current.location_type) as any,
      locationId: String(current.location_id),
      locationName: current.location_name ? String(current.location_name) : undefined,
      disposition,
      notes: newNotes,
    };
  }

  addNpc(campaignId: number, npc: Omit<WorldNpc, "campaignId">): WorldNpc {
    this.db
      .prepare(
        `INSERT INTO world_npcs (id, campaign_id, name, role, ancestry, location_type, location_id, location_name, disposition, notes, rescue_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        npc.id,
        campaignId,
        npc.name,
        npc.role,
        npc.ancestry,
        npc.locationType,
        npc.locationId,
        npc.locationName ?? null,
        npc.disposition,
        npc.notes,
        npc.rescueState ?? null,
      );
    return { ...npc, campaignId };
  }

  seedStartingWorld(campaignId: number): void {
    // Older campaigns have an atlas but no region-backed lead destinations.
    const campaign = this.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(campaignId) as any;
    if (!campaign.tavern_establishment_json) {
      const world = generateProceduralRegion(campaignId, { selection: { mode: "single", zoneId: "the_gloaming" }, seed: `table-${campaign.code}` });
      const region = world.region;
      this.db.prepare(`INSERT INTO regions (id,campaign_id,selection_json,seed,generator_version,content_version,rules_version,attempt,revision,active,created_at)
        VALUES (?,?,?,?,?,?,?,?,0,1,?)`).run(region.id,campaignId,JSON.stringify(region.selection),region.seed,region.generatorVersion,region.contentVersion,region.rulesVersion,region.attempt,region.createdAt);
      this.db.prepare("INSERT INTO region_layers (region_id,layer_id,kind,scale) VALUES (?, 'surface', 'surface', 6)").run(region.id);
      for (const hex of world.hexes.filter(h => h.layerId === "surface")) {
        this.db.prepare(`INSERT INTO region_hexes (canonical_key,region_id,layer_id,q,r,terrain,elevation,depth,moisture,primary_zone,threat_tier,name,landmark)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(hex.canonicalKey,region.id,hex.layerId,hex.q,hex.r,hex.terrain,hex.elevation,hex.depth,hex.moisture,hex.primaryZone,hex.threatTier,hex.name,hex.landmark ?? null);
        this.db.prepare("UPDATE hexes SET canonical_key = ? WHERE campaign_id = ? AND q = ? AND r = ?").run(hex.canonicalKey,campaignId,hex.q,hex.r);
      }
      const leadSites = new Set(world.tavernEstablishment!.leads.map(l => l.targetSiteId));
      for (const site of world.sites.filter(s => leadSites.has(s.id) || s.kind === "haven")) {
        this.db.prepare("INSERT INTO sites (id,region_id,canonical_key,kind,name,current_state,visibility) VALUES (?,?,?,?,?,?,?)").run(site.id,region.id,site.canonicalKey,site.kind,site.name,site.currentState,site.visibility);
      }
      this.db.prepare("UPDATE campaigns SET active_region_id = ?, tavern_establishment_json = ?, adventure_path_json = ?, home_location_json = ?, party_location_json = COALESCE(party_location_json, ?) WHERE id = ?")
        .run(region.id,JSON.stringify(world.tavernEstablishment),JSON.stringify(world.adventurePath),JSON.stringify({q:0,r:0,layerId:"surface"}),JSON.stringify({q:0,r:0,layerId:"surface"}),campaignId);
    }
    const existing = this.db
      .prepare("SELECT 1 FROM world_facilities WHERE campaign_id = ?")
      .get(campaignId);
    if (existing) return;

    const tavernRow = this.db.prepare("SELECT tavern_establishment_json FROM campaigns WHERE id = ?").get(campaignId) as any;
    const tavern: TavernEstablishment = JSON.parse(tavernRow.tavern_establishment_json);
    const facilities: WorldFacility[] = [
      {
        id: "fac-tavern-1",
        campaignId,
        name: tavern.name,
        kind: "tavern",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-gundren",
        keeperName: tavern.barkeep,
        description: "A warm stone tavern warmed by a sunken peat fire. Low timber beams and a bustling rumor board.",
        services: ["Warm Peat Fire Lodging (1 SP/night)", "Hearty Stew & Ale (2 CP)", "Rumor Gathering", "Carousing"],
      },
      {
        id: "fac-smith-1",
        campaignId,
        name: "Stonehand Forge",
        kind: "blacksmith",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-torvald",
        keeperName: "Torvald Stonehand",
        description: "Ringing anvil and coal smoke. Renowned for tempering iron weapons and refitting mail hauberks.",
        services: ["Weapon & Armor Forging", "Shield Reinforcement", "Cold-Iron Weapon Treatment (50 GP)"],
      },
      {
        id: "fac-apothecary-1",
        campaignId,
        name: "The Bitter Leaf",
        kind: "apothecary",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-alyssa",
        keeperName: "Sister Alyssa",
        description: "Bundles of dried nightshade and pungent herbs hang from low rafters. Calming herbal scent.",
        services: ["Healing Draughts (10 GP)", "Antitoxin Phials (15 GP)", "Wound Poultices (5 SP)"],
      },
      {
        id: "fac-provisioner-1",
        campaignId,
        name: "Oakhaven Outpost Supplies",
        kind: "provisioner",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-aldo",
        keeperName: "Aldo Marsh",
        description: "Shelves stacked with tallow torches, iron spikes, hemp rope, and sealed ration barrels.",
        services: ["Torches Bundle of 3 (5 SP)", "Rations 3-Day Pack (15 SP)", "Dungeoneering Spikes & Rope"],
      },
      {
        id: "fac-trainer-martial",
        campaignId,
        name: "Weaponmaster's Ring",
        kind: "trainer_martial",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-vance",
        keeperName: "Master Vance",
        description: "Sanded combat yard flanked by weapon racks and straw training pell targets.",
        services: ["Martial Class Advancement", "Weapon Mastery Training", "Sparring Adjudication"],
      },
      {
        id: "fac-trainer-arcane",
        campaignId,
        name: "The Arcane Scriptorium",
        kind: "trainer_arcane",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-corvus",
        keeperName: "Magister Corvus",
        description: "A tower study crammed with star charts, inkpots, and parchment scraps. Faint ozone smell.",
        services: ["Spellbook Transcription", "Scroll Identification", "Arcane Class Advancement"],
      },
      {
        id: "fac-trainer-divine",
        campaignId,
        name: "Shrine of the Dawn Sun",
        kind: "trainer_divine",
        locationType: "settlement",
        locationId: "00",
        keeperNpcId: "npc-mara",
        keeperName: "High Priestess Mara",
        description: "White stone sanctum lit by morning sunlight and burning sandalwood censers.",
        services: ["Divine Penance Adjudication", "Expedition Blessings", "Priest Advancement"],
      },
    ];

    const npcs: WorldNpc[] = [
      {
        id: "npc-gundren",
        campaignId,
        name: tavern.barkeep,
        role: "Innkeeper & Tavern Host",
        ancestry: "Dwarf",
        locationType: "facility",
        locationId: "fac-tavern-1",
        locationName: "The Ashen Tankard",
        disposition: "friendly",
        notes: "Knows all local travelers. Welcomes coin and clean boots; hates tavern brawlers.",
      },
      {
        id: "npc-torvald",
        campaignId,
        name: "Torvald Stonehand",
        role: "Master Blacksmith",
        ancestry: "Dwarf",
        locationType: "facility",
        locationId: "fac-smith-1",
        locationName: "Stonehand Forge",
        disposition: "neutral",
        notes: "Gruff and precise. Respects finely forged steel; will craft custom weapons for rare ore.",
      },
      {
        id: "npc-alyssa",
        campaignId,
        name: "Sister Alyssa",
        role: "Apothecary & Herbalist",
        ancestry: "Human",
        locationType: "facility",
        locationId: "fac-apothecary-1",
        locationName: "The Bitter Leaf",
        disposition: "friendly",
        notes: "Gentle and perceptive. Seeks rare marsh herbs and fungi from the wilderness.",
      },
      {
        id: "npc-aldo",
        campaignId,
        name: "Aldo Marsh",
        role: "Provisioner Merchant",
        ancestry: "Halfling",
        locationType: "facility",
        locationId: "fac-provisioner-1",
        locationName: "Oakhaven Outpost Supplies",
        disposition: "neutral",
        notes: "Shrewd trader with a cheerful smile. Offers fair rates on bulk torches and dried provisions.",
      },
      {
        id: "npc-vance",
        campaignId,
        name: "Master Vance",
        role: "Veteran Weaponmaster",
        ancestry: "Human",
        locationType: "facility",
        locationId: "fac-trainer-martial",
        locationName: "Weaponmaster's Ring",
        disposition: "neutral",
        notes: "Scarred frontier veteran. Stern mentor for Fighters and martial adventurers.",
      },
      {
        id: "npc-corvus",
        campaignId,
        name: "Magister Corvus",
        role: "Court Wizard & Sage",
        ancestry: "Elf",
        locationType: "facility",
        locationId: "fac-trainer-arcane",
        locationName: "The Arcane Scriptorium",
        disposition: "neutral",
        notes: "Secretive scholar of antiquity. Will translate ancient runes and decipher scrolls.",
      },
      {
        id: "npc-mara",
        campaignId,
        name: "High Priestess Mara",
        role: "Dawn Priestess",
        ancestry: "Human",
        locationType: "facility",
        locationId: "fac-trainer-divine",
        locationName: "Shrine of the Dawn Sun",
        disposition: "friendly",
        notes: "Devout sun priestess. Offers sanctuary penance to priests who suffer divine mishaps.",
      },
    ];

    const leads = this.getTavernLeads(campaignId);

    this.db.prepare("DELETE FROM world_facilities WHERE campaign_id = ?").run(campaignId);
    this.db.prepare("DELETE FROM world_npcs WHERE campaign_id = ?").run(campaignId);
    this.db.prepare("DELETE FROM tavern_leads WHERE campaign_id = ?").run(campaignId);

    const insertFac = this.db.prepare(
      `INSERT INTO world_facilities (id, campaign_id, name, kind, location_type, location_id, keeper_npc_id, keeper_name, description, services_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const f of facilities) {
      insertFac.run(
        f.id,
        f.campaignId,
        f.name,
        f.kind,
        f.locationType,
        f.locationId,
        f.keeperNpcId ?? null,
        f.keeperName ?? null,
        f.description,
        JSON.stringify(f.services),
      );
    }

    const insertNpc = this.db.prepare(
      `INSERT INTO world_npcs (id, campaign_id, name, role, ancestry, location_type, location_id, location_name, disposition, notes, rescue_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const n of npcs) {
      insertNpc.run(
        n.id,
        n.campaignId,
        n.name,
        n.role,
        n.ancestry,
        n.locationType,
        n.locationId,
        n.locationName ?? null,
        n.disposition,
        n.notes,
        n.rescueState ?? null,
      );
    }

    const insertLead = this.db.prepare(
      `INSERT INTO tavern_leads (id, campaign_id, source_npc, claim, direction_hint, apparent_danger, promised_reward, destination_site_id, lead_type, is_empty_site)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of leads) {
      insertLead.run(
        l.id,
        l.campaignId,
        l.sourceNpc,
        l.claim,
        l.directionHint,
        l.apparentDanger,
        l.promisedReward,
        l.destinationSiteId,
        l.leadType,
        l.isEmptySite ? 1 : 0,
      );
    }
  }



  getRewards(campaignId: number, claimed?: boolean): RewardRecord[] {
    const query = claimed !== undefined
      ? "SELECT * FROM rewards WHERE campaign_id = ? AND claimed = ? ORDER BY rowid DESC"
      : "SELECT * FROM rewards WHERE campaign_id = ? ORDER BY rowid DESC";
    const rows = claimed !== undefined
      ? (this.db.prepare(query).all(campaignId, claimed ? 1 : 0) as Row[])
      : (this.db.prepare(query).all(campaignId) as Row[]);

    return rows.map((r) => {
      const contents = JSON.parse(String(r.contents_json));
      return {
        id: String(r.id),
        campaignId: Number(r.campaign_id),
        sourceType: String(r.source_type) as "dungeon_room" | "encounter" | "situation_deed",
        sourceId: String(r.source_id),
        coins: contents.coins ?? { cp: 0, sp: 0, gp: 0 },
        items: contents.items ?? [],
        claimed: Boolean(r.claimed),
        allocations: JSON.parse(String(r.allocations_json)),
      };
    });
  }

  saveReward(campaignId: number, reward: RewardRecord): void {
    this.db
      .prepare(
        `INSERT INTO rewards (id, campaign_id, source_type, source_id, contents_json, claimed, allocations_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           contents_json = excluded.contents_json,
           claimed = excluded.claimed,
           allocations_json = excluded.allocations_json`,
      )
      .run(
        reward.id,
        campaignId,
        reward.sourceType,
        reward.sourceId,
        JSON.stringify({ coins: reward.coins, items: reward.items }),
        reward.claimed ? 1 : 0,
        JSON.stringify(reward.allocations),
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

  isXpAwarded(campaignId: number, sourceId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM xp_awards WHERE campaign_id = ? AND source_id = ?")
      .get(campaignId, sourceId);
    return Boolean(row);
  }

  recordXpAward(
    campaignId: number,
    sourceId: string,
    amount: number,
    reason: string,
    characterIds: number[],
  ): boolean {
    try {
      this.db
        .prepare(
          `INSERT INTO xp_awards (campaign_id, source_id, amount, reason, character_ids_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(campaignId, sourceId, amount, reason, JSON.stringify(characterIds), now());
      return true;
    } catch {
      return false;
    }
  }

  // --- Encounter Groups & Treasure Rolls ---
  saveEncounterGroup(group: EncounterGroup): void {
    this.db
      .prepare(
        `INSERT INTO encounter_groups (id, campaign_id, site_id, room_id, name, member_count, members_json, policy_type, guarding_source_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           member_count = excluded.member_count,
           members_json = excluded.members_json,
           status = excluded.status`,
      )
      .run(
        group.id,
        group.campaignId,
        group.siteId ?? null,
        group.roomId ?? null,
        group.name,
        group.memberCount,
        JSON.stringify(group.members),
        group.policyType,
        group.guardingSourceId ?? null,
        group.status,
        now(),
      );
  }

  getEncounterGroup(campaignId: number, groupId: string): EncounterGroup | null {
    const row = this.db
      .prepare("SELECT * FROM encounter_groups WHERE campaign_id = ? AND id = ?")
      .get(campaignId, groupId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      campaignId: Number(row.campaign_id),
      siteId: row.site_id ? String(row.site_id) : null,
      roomId: row.room_id !== null ? Number(row.room_id) : null,
      name: String(row.name),
      memberCount: Number(row.member_count),
      members: JSON.parse(String(row.members_json)),
      policyType: String(row.policy_type) as any,
      guardingSourceId: row.guarding_source_id ? String(row.guarding_source_id) : null,
      status: String(row.status) as any,
    };
  }

  saveTreasureRoll(roll: TreasureRollRecord): void {
    this.db
      .prepare(
        `INSERT INTO treasure_rolls (campaign_id, group_id, policy_slot, policy_version, seed, roll, present, source_id, table_basis, quality, coins_json, items_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(campaign_id, group_id, policy_slot) DO NOTHING`,
      )
      .run(
        roll.campaignId,
        roll.groupId,
        roll.policySlot,
        roll.policyVersion,
        roll.seed,
        roll.roll,
        roll.present ? 1 : 0,
        roll.sourceId,
        roll.tableBasis,
        roll.quality,
        JSON.stringify(roll.coins),
        JSON.stringify(roll.items),
        roll.createdAt || now(),
      );
  }

  getTreasureRoll(campaignId: number, groupId: string, policySlot: string = "carried_treasure"): TreasureRollRecord | null {
    const row = this.db
      .prepare("SELECT * FROM treasure_rolls WHERE campaign_id = ? AND group_id = ? AND policy_slot = ?")
      .get(campaignId, groupId, policySlot) as Row | undefined;
    if (!row) return null;
    return {
      id: Number(row.id),
      campaignId: Number(row.campaign_id),
      groupId: String(row.group_id),
      policySlot: String(row.policy_slot),
      policyVersion: String(row.policy_version),
      seed: String(row.seed),
      roll: Number(row.roll),
      present: Boolean(row.present),
      sourceId: row.source_id ? String(row.source_id) : null,
      tableBasis: String(row.table_basis),
      quality: String(row.quality) as any,
      coins: JSON.parse(String(row.coins_json)),
      items: JSON.parse(String(row.items_json)),
      createdAt: String(row.created_at),
    };
  }

  // --- Canonical Reward Sources ---
  saveRewardSource(source: RewardSource): void {
    this.db
      .prepare(
        `INSERT INTO reward_sources (id, campaign_id, source_type, source_id, quality, xp_value, coins_json, items_json, status, access_state, exclusion_group, group_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           access_state = excluded.access_state,
           coins_json = excluded.coins_json,
           items_json = excluded.items_json`,
      )
      .run(
        source.id,
        source.campaignId,
        source.sourceType,
        source.sourceId,
        source.quality,
        source.xpValue,
        JSON.stringify(source.coins),
        JSON.stringify(source.items),
        source.status,
        source.accessState,
        source.exclusionGroup ?? null,
        source.groupId ?? null,
        source.createdAt || now(),
      );
  }

  getRewardSource(campaignId: number, sourceId: string): RewardSource | null {
    const row = this.db
      .prepare("SELECT * FROM reward_sources WHERE campaign_id = ? AND (id = ? OR source_id = ?)")
      .get(campaignId, sourceId, sourceId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      campaignId: Number(row.campaign_id),
      sourceType: String(row.source_type) as any,
      sourceId: String(row.source_id),
      quality: String(row.quality) as any,
      xpValue: Number(row.xp_value),
      coins: JSON.parse(String(row.coins_json)),
      items: JSON.parse(String(row.items_json)),
      status: String(row.status) as any,
      accessState: String(row.access_state) as any,
      exclusionGroup: row.exclusion_group ? String(row.exclusion_group) : null,
      groupId: row.group_id ? String(row.group_id) : null,
      createdAt: String(row.created_at),
    };
  }

  getRewardSources(campaignId: number): RewardSource[] {
    const rows = this.db
      .prepare("SELECT * FROM reward_sources WHERE campaign_id = ? ORDER BY rowid ASC")
      .all(campaignId) as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      campaignId: Number(row.campaign_id),
      sourceType: String(row.source_type) as any,
      sourceId: String(row.source_id),
      quality: String(row.quality) as any,
      xpValue: Number(row.xp_value),
      coins: JSON.parse(String(row.coins_json)),
      items: JSON.parse(String(row.items_json)),
      status: String(row.status) as any,
      accessState: String(row.access_state) as any,
      exclusionGroup: row.exclusion_group ? String(row.exclusion_group) : null,
      groupId: row.group_id ? String(row.group_id) : null,
      createdAt: String(row.created_at),
    }));
  }

  // --- Campaign Acts ---
  saveCampaignActs(campaignId: number, acts: ActZoneAssignment[]): void {
    const insert = this.db.prepare(
      `INSERT INTO campaign_acts (campaign_id, act_number, zone_id, name, level_min, level_max, description, transition_route_json, content_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'v1', ?)
       ON CONFLICT(campaign_id, act_number) DO UPDATE SET
         zone_id = excluded.zone_id,
         name = excluded.name,
         level_min = excluded.level_min,
         level_max = excluded.level_max,
         description = excluded.description,
         transition_route_json = excluded.transition_route_json`,
    );
    this.db.transaction(() => {
      for (const act of acts) {
        insert.run(
          campaignId,
          act.act,
          act.zoneId,
          act.name,
          act.levelRange[0],
          act.levelRange[1],
          act.description,
          act.transitionRoute ? JSON.stringify(act.transitionRoute) : null,
          now(),
        );
      }
    })();
  }

  getCampaignActs(campaignId: number): ActZoneAssignment[] {
    const rows = this.db
      .prepare("SELECT * FROM campaign_acts WHERE campaign_id = ? ORDER BY act_number ASC")
      .all(campaignId) as Row[];
    return rows.map((r) => ({
      act: Number(r.act_number) as 1 | 2 | 3,
      zoneId: String(r.zone_id),
      name: String(r.name),
      levelRange: [Number(r.level_min), Number(r.level_max)] as [number, number],
      description: String(r.description),
      transitionRoute: r.transition_route_json ? JSON.parse(String(r.transition_route_json)) : undefined,
    }));
  }

  // --- Path Outcomes ---
  recordPathOutcome(campaignId: number, outcome: OutcomeResolution): boolean {
    try {
      this.db
        .prepare(
          `INSERT INTO path_outcomes (campaign_id, deed_id, outcome_type, approach, notes, story_xp_awarded, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          campaignId,
          outcome.deedId,
          outcome.outcomeType,
          outcome.approach,
          outcome.notes ?? null,
          outcome.storyXpAwarded,
          now(),
        );
      return true;
    } catch {
      return false;
    }
  }

  isDeedResolved(campaignId: number, deedId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM path_outcomes WHERE campaign_id = ? AND deed_id = ?")
      .get(campaignId, deedId);
    return Boolean(row);
  }

  recordXpAwardRecipient(recipient: XpAwardRecipient): void {
    this.db
      .prepare(
        `INSERT INTO xp_award_recipients (campaign_id, source_id, character_id, award_sequence, amount, level_before, xp_before, level_after, xp_after, reset_loss, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(campaign_id, source_id, character_id) DO NOTHING`,
      )
      .run(
        recipient.campaignId,
        recipient.sourceId,
        recipient.characterId,
        recipient.awardSequence,
        recipient.amount,
        recipient.levelBefore,
        recipient.xpBefore,
        recipient.levelAfter,
        recipient.xpAfter,
        recipient.resetLoss,
        recipient.status,
        recipient.createdAt || now(),
      );
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
    siteId?: string,
  ) {
    const row = this.db
      .prepare(
        siteId
          ? "SELECT COALESCE(MAX(sequence),0)+1 next FROM dungeon_rooms WHERE campaign_id = ? AND site_id = ?"
          : "SELECT COALESCE(MAX(sequence),0)+1 next FROM dungeon_rooms WHERE campaign_id = ?",
      )
      .get(...(siteId ? [campaignId, siteId] : [campaignId])) as Row;
    const sequence = Number(row.next);
    this.db
      .prepare(
        "INSERT INTO dungeon_rooms (campaign_id,site_id,sequence,geometry,contents,interaction,exits,trap_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(
        campaignId,
        siteId ?? null,
        sequence,
        room.geometry,
        room.contents,
        room.interaction,
        room.exits,
        room.trap ? JSON.stringify(room.trap) : null,
        now(),
      );
  }

  setExpeditionObjective(campaignId: number, objective: ExpeditionObjective | null) {
    this.db
      .prepare("UPDATE campaigns SET active_objective_json = ? WHERE id = ?")
      .run(objective ? JSON.stringify(objective) : null, campaignId);
  }

  setActiveSite(campaignId: number, siteId: string | null) {
    this.db
      .prepare("UPDATE campaigns SET active_site_id = ? WHERE id = ?")
      .run(siteId ?? null, campaignId);
  }

  updateSiteState(siteId: string, currentState: string) {
    this.db
      .prepare("UPDATE sites SET current_state = ? WHERE id = ?")
      .run(currentState, siteId);
  }

  updateCharacterFatigue(characterId: number, fatigue: number) {
    this.db
      .prepare("UPDATE characters SET fatigue = ? WHERE id = ?")
      .run(Math.max(0, fatigue), characterId);
  }

  consumePartyRations(campaignId: number, amount: number): number {
    const row = this.db
      .prepare("SELECT rations FROM campaigns WHERE id = ?")
      .get(campaignId) as { rations?: number } | undefined;
    const current = row?.rations ?? 12;
    const nextRations = Math.max(0, current - amount);
    this.db
      .prepare("UPDATE campaigns SET rations = ? WHERE id = ?")
      .run(nextRations, campaignId);
    return nextRations;
  }

  resupplyPartyRations(campaignId: number, amount: number): number {
    const row = this.db
      .prepare("SELECT rations FROM campaigns WHERE id = ?")
      .get(campaignId) as { rations?: number } | undefined;
    const current = row?.rations ?? 12;
    const nextRations = Math.min(30, current + amount);
    this.db
      .prepare("UPDATE campaigns SET rations = ? WHERE id = ?")
      .run(nextRations, campaignId);
    return nextRations;
  }

  advanceWatch(campaignId: number, count: number = 1) {
    const campaign = this.db
      .prepare("SELECT day, watch, watches_traveled_today, weather, rations FROM campaigns WHERE id = ?")
      .get(campaignId) as {
        day?: number;
        watch?: number;
        watches_traveled_today?: number;
        weather?: string;
        rations?: number;
      };

    let day = campaign.day ?? 1;
    let watch = (campaign.watch ?? 1) as 1 | 2 | 3 | 4;
    let watchesTraveledToday = campaign.watches_traveled_today ?? 0;
    let weather = campaign.weather ?? "Overcast / Mild Breeze";
    let rations = campaign.rations ?? 12;

    const chars = this.db
      .prepare("SELECT id FROM characters WHERE campaign_id = ? AND roster_status != 'reserve'")
      .all(campaignId) as { id: number }[];
    const partySize = Math.max(1, chars.length);

    for (let i = 0; i < count; i++) {
      if (watch === 4) {
        watch = 1;
        day += 1;
        watchesTraveledToday = 0;
        const d1 = randomInt(6) + 1;
        const d2 = randomInt(6) + 1;
        const roll = d1 + d2;
        if (roll <= 2) weather = "Cataclysmic Storm / Gale";
        else if (roll <= 4) weather = "Heavy Rain / Dense Fog";
        else if (roll <= 8) weather = "Overcast / Mild Breeze";
        else if (roll <= 10) weather = "Clear Skies & Bright Sun";
        else if (roll === 11) weather = "Unnatural Heat / Aridity";
        else weather = "Planar Aurora / Omen Sky";

        rations = Math.max(0, rations - partySize);
      } else {
        watch = (watch + 1) as 1 | 2 | 3 | 4;
        watchesTraveledToday += 1;
      }
    }

    this.db
      .prepare(
        "UPDATE campaigns SET day = ?, watch = ?, watches_traveled_today = ?, weather = ?, rations = ? WHERE id = ?",
      )
      .run(day, watch, watchesTraveledToday, weather, rations, campaignId);

    return { day, watch, watchesTraveledToday, weather, rations };
  }

  evaluatePartyForcedMarch(campaignId: number, conDcBase: number = 12) {
    const characters = this.db
      .prepare("SELECT * FROM characters WHERE campaign_id = ? AND roster_status != 'reserve'")
      .all(campaignId) as Row[];

    return characters.map((c) => {
      const charId = Number(c.id);
      const name = String(c.name);
      const conVal = Number(c.con);
      const conMod = abilityModifier(conVal);
      const currentFatigue = Number(c.fatigue ?? 0);
      const dc = conDcBase + currentFatigue;
      const rollD20 = randomInt(20) + 1;
      const total = rollD20 + conMod;
      const passed = total >= dc;
      const nextFatigue = passed ? currentFatigue : currentFatigue + 1;
      if (!passed) {
        this.updateCharacterFatigue(charId, nextFatigue);
      }
      return {
        characterId: charId,
        name,
        roll: total,
        dc,
        passed,
        fatigue: nextFatigue,
      };
    });
  }

  getAdventurePath(campaignId: number): AdventurePathRecord | null {
    const row = this.db
      .prepare("SELECT adventure_path_json FROM campaigns WHERE id = ?")
      .get(campaignId) as { adventure_path_json?: string } | undefined;
    if (!row?.adventure_path_json) return null;
    try {
      const path: AdventurePathRecord = JSON.parse(row.adventure_path_json);
      return { ...path, name: adventurePathDisplayName(path.pathId, path.name) };
    } catch {
      return null;
    }
  }

  saveAdventurePath(campaignId: number, path: AdventurePathRecord) {
    this.db
      .prepare("UPDATE campaigns SET adventure_path_json = ? WHERE id = ?")
      .run(JSON.stringify(path), campaignId);
  }

  resolveAdventurePathDeed(
    campaignId: number,
    deed: string,
    knowledgeDelta: number = 1,
    tollMessage?: string,
  ): { alreadyResolved: boolean; path: AdventurePathRecord | null } {
    const path = this.getAdventurePath(campaignId);
    if (!path) return { alreadyResolved: false, path: null };

    if (path.resolvedDeeds.includes(deed)) {
      return { alreadyResolved: true, path };
    }

    path.resolvedDeeds.push(deed);
    path.progress.knowledge = Math.min(6, Math.max(0, path.progress.knowledge + knowledgeDelta));
    if (tollMessage) {
      path.toll.push(tollMessage);
    }

    if (path.activeSituation && path.activeSituation.requiredDeed === deed) {
      path.activeSituation.status = "resolved";
    }

    this.saveAdventurePath(campaignId, path);

    // If surveyor was rescued, add follow-up lead to haven tavern
    if (deed === "rescue_surveyor") {
      const campRow = this.db
        .prepare("SELECT tavern_establishment_json FROM campaigns WHERE id = ?")
        .get(campaignId) as { tavern_establishment_json?: string } | undefined;
      if (campRow?.tavern_establishment_json) {
        try {
          const establishment: TavernEstablishment = JSON.parse(campRow.tavern_establishment_json);
          const followUpLead: TavernLead = {
            id: `lead_surveyor_followup_${campaignId}`,
            title: "Rescued Surveyor's Account: The Karst Siphons",
            claim: "Surveyor Jonathan Vane has recovered at the taproom. He warns that the pumping tunnels descend into subterranean living sandstone, where amphibious guards fear something far deeper.",
            source: "Jonathan Vane (Rescued Surveyor)",
            targetHexId: "00",
            targetSiteId: path.activeSituation?.siteId ?? "",
            directionHint: "Down through the waterworks overflow shaft",
            dangerHint: "Tier 3 Threat · Deep Karst pressure and mind-siphoning slimes",
            preparationHint: "Water-breathing draughts or kuo-toa gill charms",
            accuracy: "true",
            isPathLead: true,
            isFollowUp: true,
          };
          if (!establishment.leads.some((l) => l.id === followUpLead.id)) {
            establishment.leads.unshift(followUpLead);
            this.db
              .prepare("UPDATE campaigns SET tavern_establishment_json = ? WHERE id = ?")
              .run(JSON.stringify(establishment), campaignId);
          }
        } catch {}
      }
    }

    return { alreadyResolved: false, path };
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

  addRoll(campaignId: number, roll: Omit<RollRecord, "id" | "createdAt">): RollRecord {
    const createdAt = now();
    const result = this.db
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
        createdAt,
      );
    // Shaped exactly like rowToRoll, so an appended roll is indistinguishable
    // from the same roll read back through a page.
    const record: RollRecord = {
      id: Number(result.lastInsertRowid),
      actor: roll.actor,
      kind: roll.kind,
      label: roll.label,
      dice: roll.dice,
      total: roll.total,
      detail: roll.detail,
      createdAt,
    };
    this.onRollAdded?.(campaignId, record);
    return record;
  }

  getRollsPage(
    campaignId: number,
    options: { beforeId?: number; limit?: number } = {},
  ): RollRecord[] {
    const limit = Math.min(options.limit ?? 50, 100);
    const rows = options.beforeId
      ? (this.db
          .prepare(
            "SELECT * FROM rolls WHERE campaign_id = ? AND id < ? ORDER BY id DESC LIMIT ?",
          )
          .all(campaignId, options.beforeId, limit) as Row[])
      : (this.db
          .prepare(
            "SELECT * FROM rolls WHERE campaign_id = ? ORDER BY id DESC LIMIT ?",
          )
          .all(campaignId, limit) as Row[]);
    return rows.map(rowToRoll);
  }

  addNote(campaignId: number, section: string, title: string, body: string): WikiNote {
    const createdAt = now();
    const result = this.db
      .prepare(
        "INSERT INTO wiki_notes (campaign_id,section,title,body,created_at) VALUES (?,?,?,?,?)",
      )
      .run(campaignId, section, title, body, createdAt);
    const record: WikiNote = {
      id: Number(result.lastInsertRowid),
      section,
      title,
      body,
      createdAt,
    };
    this.onNoteAdded?.(campaignId, record);
    return record;
  }

  getWikiNotesPage(
    campaignId: number,
    options: { beforeId?: number; limit?: number } = {},
  ): WikiNote[] {
    const limit = Math.min(options.limit ?? 50, 100);
    const rows = options.beforeId
      ? (this.db
          .prepare(
            "SELECT * FROM wiki_notes WHERE campaign_id = ? AND id < ? ORDER BY id DESC LIMIT ?",
          )
          .all(campaignId, options.beforeId, limit) as Row[])
      : (this.db
          .prepare(
            "SELECT * FROM wiki_notes WHERE campaign_id = ? ORDER BY id DESC LIMIT ?",
          )
          .all(campaignId, limit) as Row[]);
    return rows.map((row): WikiNote => ({
      id: Number(row.id),
      section: String(row.section),
      title: String(row.title),
      body: String(row.body),
      createdAt: String(row.created_at),
    }));
  }

  /**
   * The viewer-specific `me` slice. Kept in one place because it is the only part
   * of a projection that differs between two sockets holding the same role.
   */
  getIdentityState(
    campaignId: number,
    role: Role,
    characterId: number | null,
    viewerToken: string | undefined,
    campaignCallerToken: string | null,
  ): CampaignState["me"] {
    let ready = false;
    let resolvedCharacterId = characterId;
    if (viewerToken) {
      const device = this.db
        .prepare("SELECT ready, character_id FROM devices WHERE campaign_id = ? AND token = ?")
        .get(campaignId, viewerToken) as { ready: number; character_id?: number } | undefined;
      ready = Boolean(device?.ready);
      if (device?.character_id != null) {
        resolvedCharacterId = device.character_id;
      }
    }
    const isCaller =
      role === "host" || (Boolean(campaignCallerToken) && campaignCallerToken === viewerToken);
    return { role, characterId: resolvedCharacterId, isCaller, ready, token: viewerToken };
  }

  getSlicedState(
    campaignId: number,
    role: Role,
    characterId: number | null,
    joinUrl: string,
    callerToken?: string,
    options: { isInitial?: boolean; rollLimit?: number; noteLimit?: number } = {},
  ): SlicesUpdate {
    const campaignRow = this.db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(campaignId) as Row | undefined;
    if (!campaignRow) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const campaignRevision = Number(campaignRow.revision ?? 1);
    const activeZoneId = campaignRow.active_zone_id ? String(campaignRow.active_zone_id) : "the_gloaming";
    const activeSiteId = campaignRow.active_site_id ? String(campaignRow.active_site_id) : undefined;
    const isSecretPath = Boolean(campaignRow.is_secret_path);
    const started = Boolean(campaignRow.started);
    const rawCallerToken = campaignRow.caller_token ? String(campaignRow.caller_token) : null;

    const slices: SlicesUpdate["slices"] = {};

    let cachedCharacters: Character[] | undefined;
    const getCharacters = () => {
      if (!cachedCharacters) {
        cachedCharacters = (
          this.db
            .prepare("SELECT * FROM characters WHERE campaign_id = ? ORDER BY id")
            .all(campaignId) as Row[]
        ).map(rowToCharacter);
      }
      return cachedCharacters;
    };

    {
      slices.characters = getCharacters();
    }

    {
      const discoveredSiteIds = this.getDiscoveredSiteIds(campaignId);
      const siteIndex = this.getSitesByHex(campaignId);
      slices.hexes = (
        this.db
          .prepare("SELECT * FROM hexes WHERE campaign_id = ? ORDER BY CAST(id AS INTEGER)")
          .all(campaignId) as Row[]
      ).map((r) => rowToHex(r, role, discoveredSiteIds, siteIndex));
    }

    {
      const roomRows = (
        activeSiteId
          ? (this.db
              .prepare("SELECT * FROM dungeon_rooms WHERE campaign_id = ? AND site_id = ? ORDER BY sequence")
              .all(campaignId, activeSiteId) as Row[])
          : (this.db
              .prepare("SELECT * FROM dungeon_rooms WHERE campaign_id = ? ORDER BY sequence")
              .all(campaignId) as Row[])
      ).map((r) => rowToRoom(r, role));

      let activeDungeon = this.getDungeonGraph(campaignId, activeSiteId);
      if (activeDungeon) {
        activeDungeon = {
          ...activeDungeon,
          siteStructure: activeDungeon.siteStructure
            ? {
                sections: activeDungeon.siteStructure.sections.filter((section) =>
                  section.roomIds.some((id) =>
                    activeDungeon!.nodes.some((n) => n.id === id && n.explored),
                  ),
                ),
              }
            : undefined,
          nodes: activeDungeon.nodes.map((node) => {
            if (node.explored || node.id === activeDungeon!.currentRoomId) {
              return {
                ...node,
                objective: node.objective
                  ? {
                      ...node.objective,
                      generated: node.objective.generated
                        ? {
                            ...node.objective.generated,
                            clue: node.objective.completed
                              ? node.objective.generated.clue
                              : undefined,
                            nextAction: node.objective.completed
                              ? node.objective.generated.nextAction
                              : undefined,
                          }
                        : undefined,
                    }
                  : undefined,
                feature: node.trap && !node.trap.spotted && !node.trap.disarmed ? undefined : node.feature,
                featureRoll: node.trap && !node.trap.spotted && !node.trap.disarmed ? undefined : node.featureRoll,
                contents: node.trap && !node.trap.spotted && !node.trap.disarmed ? (node.trap.sensoryTell ?? "Dust lies across the quiet floor.") : node.contents,
                sensoryTell: node.trap?.sensoryTell || node.sensoryTell,
                trap: node.trap
                  ? node.trap.spotted || node.trap.disarmed
                    ? node.trap
                    : undefined
                  : undefined,
              };
            }
            return {
              id: node.id,
              title: "Unknown Chamber",
              x: node.x,
              y: node.y,
              geometry: "Unexplored",
              contents: "Darkness and silence.",
              interaction: "",
              explored: false,
            };
          }),
          edges: activeDungeon.edges.filter((edge) => {
            if (
              edge.transition &&
              !activeDungeon!.nodes.some(
                (n) => (n.id === edge.fromRoomId || n.id === edge.toRoomId) && n.explored,
              )
            )
              return false;
            if (edge.doorType === "secret" && edge.state !== "open") {
              return false;
            }
            return true;
          }),
        };
      }

      slices.rooms = {
        rooms: roomRows,
        activeDungeon,
      };
    }

    {
      const encounterRows = this.db
        .prepare("SELECT * FROM encounters WHERE campaign_id = ? ORDER BY id DESC")
        .all(campaignId) as Row[];
      const encounters: Encounter[] = encounterRows.map((encounter) => ({
        id: Number(encounter.id),
        name: String(encounter.name),
        status: String(encounter.status) as "active" | "resolved",
        createdAt: String(encounter.created_at),
        monsters: (
          this.db
            .prepare("SELECT * FROM encounter_monsters WHERE encounter_id = ? ORDER BY id")
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

          const combatant = this.getCombatState(campaignId, Number(encounter.id))?.combatants.find(c => c.refId === Number(row.id) && c.kind === "monster");
          const hpVisible = Number(row.current_hp) < Number(row.max_hp) / 2;
          return {
            id: Number(row.id),
            monsterKey: key,
            name,
            hpStatus: computeHpStatus(Number(row.current_hp), Number(row.max_hp)),
            currentHp: hpVisible ? Number(row.current_hp) : 0,
            maxHp: hpVisible ? Number(row.max_hp) : 0,
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
            ...(tier >= 1 ? { lore: lore.slice(0, tier) } : {}),
            ...(combatant?.acRevealed ? { ac } : {}),
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

      slices.encounters = {
        encounters,
        pressures,
      };
    }

    {
      const combat = this.getCombatState(campaignId);
      slices.combat = projectCombat(combat);
    }

    {
      slices.rewards = this.getRewards(campaignId);
    }

    {
      const rollLimit = options.rollLimit ?? (options.isInitial ? 8 : 10);
      slices.rolls = this.getRollsPage(campaignId, { limit: rollLimit });
    }

    {
      const noteLimit = options.noteLimit ?? (options.isInitial ? 10 : 15);
      slices.notes = this.getWikiNotesPage(campaignId, { limit: noteLimit });
    }

    {
      slices.zones = { activeZoneId };
    }

    const deviceRows = this.db
      .prepare("SELECT token, ready, character_id FROM devices WHERE campaign_id = ?")
      .all(campaignId) as Array<{ token: string; ready: number; character_id?: number }>;

    {
      const chars = getCharacters();
      slices.tablePlayers = deviceRows.map((d) => {
        const ownedChars = chars.filter((c) => c.ownerToken === d.token);
        const activeChar = chars.find((c) => c.id === d.character_id);
        return {
          token: d.token,
          ready: Boolean(d.ready),
          characterCount: ownedChars.length,
          activeCharacterName: activeChar?.name,
        };
      });
    }

    {
      const totalPlayers = deviceRows.length;
      const readyPlayers = deviceRows.filter((p) => p.ready).length;
      const allReady = totalPlayers > 0 && readyPlayers === totalPlayers;
      const tableReadiness = { totalPlayers, readyPlayers, allReady };

      let callerCharacterName: string | null = null;
      if (rawCallerToken) {
        if (rawCallerToken === campaignRow.host_token) {
          callerCharacterName = "Table Host";
        } else {
          const callerCharRow = this.db
            .prepare(
              `SELECT c.name FROM characters c
               JOIN devices d ON d.character_id = c.id
               WHERE d.token = ? AND c.campaign_id = ?`,
            )
            .get(rawCallerToken, campaignId) as { name: string } | undefined;
          callerCharacterName = callerCharRow?.name ?? "Party Caller";
        }
      }

      let adventurePath: PublicAdventurePathSummary | null = null;
      if (campaignRow.adventure_path_json) {
        try {
          const rawAP: AdventurePathRecord = JSON.parse(String(campaignRow.adventure_path_json));
          const tells: string[] = [];
          if (rawAP.progress.reach >= 2) {
            tells.push("Locals report officials and couriers acting with strange, synchronized detachment.");
          } else {
            tells.push("Quiet rumors circulate of sleepwalkers and water-damaged records.");
          }
          if (rawAP.progress.awakening >= 2) {
            tells.push("Strange subterranean tides pulse through deep wells and cellars.");
          }
          if (rawAP.progress.knowledge >= 2) {
            tells.push("Evidence confirms a coordinated mind-traffic heading toward the deep waterways.");
          }

          if (isSecretPath) {
            adventurePath = {
              pathId: "secret",
              name: "Uncharted Omens",
              isSecret: true,
              narrativeTells: ["Strange omens stir the wilderness, their source yet hidden."],
              revealedMethods: [],
              activeSituation: rawAP.activeSituation
                ? {
                    title: "A Hidden Rumor in the Shadows",
                    premise: "Local whispers point toward unusual disturbances requiring investigation.",
                    status: rawAP.activeSituation.status,
                    knownClues: rawAP.activeSituation.clues,
                  }
                : null,
            };
          } else {
            adventurePath = {
              pathId: rawAP.pathId,
              name: adventurePathDisplayName(rawAP.pathId, rawAP.name),
              activeSituation: rawAP.activeSituation
                ? {
                    title: rawAP.activeSituation.title,
                    premise: rawAP.activeSituation.premise,
                    status: rawAP.activeSituation.status,
                    knownClues: rawAP.activeSituation.clues,
                  }
                : null,
              narrativeTells: tells,
              revealedMethods: rawAP.aquaticMethodsRevealed ?? [],
              ...(role === "host"
                ? {
                    hostDetails: {
                      startingZoneId: rawAP.startingZoneId,
                      caveZoneId: rawAP.caveZoneId,
                      endZoneId: rawAP.endZoneId,
                      progress: { ...rawAP.progress },
                      toll: [...rawAP.toll],
                      resolvedDeeds: [...rawAP.resolvedDeeds],
                    },
                  }
                : {}),
            };
          }
        } catch {}
      }

      let tavernEstablishment: TavernEstablishment | null = campaignRow.tavern_establishment_json
        ? JSON.parse(String(campaignRow.tavern_establishment_json))
        : null;
      if (tavernEstablishment) {
        tavernEstablishment = {
          ...tavernEstablishment,
          leads: tavernEstablishment.leads.map((lead) => ({
            ...lead,
            accuracy: "distorted",
            destinationOutcome: undefined,
            arrivalDiscovery: undefined,
            isEmptySite: undefined,
            isPathLead: undefined,
            leadType: undefined,
          })),
        };
      }

      const activeSession = this.getActiveSession(campaignId);

      slices.campaign = {
        id: campaignId,
        code: String(campaignRow.code),
        name: String(campaignRow.name),
        regionName: String(campaignRow.region_name),
        act: Number(campaignRow.act),
        phase: (campaignRow.current_phase ? String(campaignRow.current_phase) : "sanctuary") as CampaignPhase,
        activeZoneId,
        joinUrl,
        activeRegionId: campaignRow.active_region_id ? String(campaignRow.active_region_id) : undefined,
        partyLocation: campaignRow.party_location_json ? JSON.parse(String(campaignRow.party_location_json)) : undefined,
        homeLocation: campaignRow.home_location_json ? JSON.parse(String(campaignRow.home_location_json)) : undefined,
        day: Number(campaignRow.day ?? 1),
        watch: (Number(campaignRow.watch ?? 1) as 1 | 2 | 3 | 4),
        watchesTraveledToday: Number(campaignRow.watches_traveled_today ?? 0),
        weather: campaignRow.weather ? String(campaignRow.weather) : "Overcast / Mild Breeze",
        rations: Number(campaignRow.rations ?? 12),
        activeObjective: campaignRow.active_objective_json ? JSON.parse(String(campaignRow.active_objective_json)) : null,
        activeSiteId: activeSiteId ?? null,
        tavernEstablishment,
        adventurePath,
        callerToken: role === "host" ? rawCallerToken : null,
        callerCharacterName,
        revision: campaignRevision,
        activeSession,
        started,
        isSecretPath,
        tableReadiness,
        facilities: this.getFacilities(campaignId),
        worldNpcs: this.getNpcs(campaignId),
        // Tavern leads are transmitted once, within the establishment.
      };
    }

    slices.me = this.getIdentityState(campaignId, role, characterId, callerToken, rawCallerToken);

    return {
      campaignRevision,
      slices,
      sliceRevisions: this.getSliceRevisions(campaignId),
    };
  }

  getState(
    campaignId: number,
    role: Role,
    characterId: number | null,
    joinUrl: string,
    callerToken?: string,
  ): CampaignState {
    // Single projector: the full state is the union of every slice, so a fog rule
    // written once in getSlicedState cannot drift away from the snapshot readers.
    const { slices } = this.getSlicedState(campaignId, role, characterId, joinUrl, callerToken, {
      rollLimit: 60,
      noteLimit: 100,
    });
    const campaign = requireSlice(slices.campaign, "campaign");
    const rooms = requireSlice(slices.rooms, "rooms");
    const encounters = requireSlice(slices.encounters, "encounters");
    const zones = requireSlice(slices.zones, "zones");
    const activeCombat = requireCombatState(requireSlice(slices.combat, "combat"));

    return {
      campaign,
      me: requireSlice(slices.me, "me"),
      characters: requireSlice(slices.characters, "characters"),
      hexes: requireSlice(slices.hexes, "hexes"),
      rooms: rooms.rooms,
      encounters: encounters.encounters,
      pressures: encounters.pressures,
      rolls: requireSlice(slices.rolls, "rolls"),
      notes: requireSlice(slices.notes, "notes"),
      activeZone: this.getZoneManifest(zones.activeZoneId),
      availableZones: this.listZones(),
      activeSession: campaign.activeSession,
      activeDungeon: rooms.activeDungeon,
      activeCombat,
      rewards: requireSlice(slices.rewards, "rewards"),
      tablePlayers: requireSlice(slices.tablePlayers, "tablePlayers"),
      facilities: campaign.facilities,
      worldNpcs: campaign.worldNpcs,
      tavernLeads: campaign.tavernEstablishment?.leads,
    };
  }
}

function requireSlice<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Projection slice "${name}" was not built`);
  }
  return value;
}

function rowToCharacter(row: Row): Character {
  return {
    id: Number(row.id),
    name: String(row.name),
    ancestry: String(row.ancestry),
    className: String(row.class_name),
    classId: row.class_id ? String(row.class_id) : undefined,
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
    fatigue: row.fatigue != null ? Number(row.fatigue) : 0,
    ownerToken: row.owner_token ? String(row.owner_token) : undefined,
    inventory: row.inventory_json ? JSON.parse(String(row.inventory_json)) : [],
    spells: row.spells_json ? JSON.parse(String(row.spells_json)) : [],
    conditions: row.conditions_json ? JSON.parse(String(row.conditions_json)) : [],
    classChoices: row.class_choices_json ? JSON.parse(String(row.class_choices_json)) : {},
    deathStrikes: row.death_strikes != null ? Number(row.death_strikes) : 0,
    stabilized: Boolean(row.stabilized),
    rosterStatus: (row.roster_status ? String(row.roster_status) : "active") as "active" | "reserve",
    generationMethod: (row.generation_method ? String(row.generation_method) : undefined) as any,
    generationDice: row.generation_dice_json ? JSON.parse(String(row.generation_dice_json)) : undefined,
    originZoneId: row.origin_zone_id ? String(row.origin_zone_id) : undefined,
  };
}

function rowToHex(
  row: Row,
  role: Role = "player",
  discoveredSiteIds: Set<string> = new Set(),
  siteIndex: Map<string, PublicSiteSummary[]> = new Map(),
): PublicHex {
  const revealState = String(row.reveal_state) as PublicHex["revealState"];
  const connections: PublicConnectionSummary[] = row.connections_json
    ? JSON.parse(String(row.connections_json))
    : [];
  const rawSites: PublicSiteSummary[] = row.canonical_key
    ? siteIndex.get(String(row.canonical_key)) ?? []
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
    if (role === "host") {
      if (row.road) base.road = String(row.road);
      if (row.river) base.river = String(row.river);
      if (row.horizon_rumor) base.horizonRumor = String(row.horizon_rumor);
      if (row.exit_destination) base.exitDestination = String(row.exit_destination);
      if (row.elevation != null) base.elevation = Number(row.elevation);
      if (connections.length > 0) base.connections = connections;
    }
    return base;
  }

  if (revealState === "rumored") {
    if (row.horizon_rumor) base.horizonRumor = String(row.horizon_rumor);
    if (role === "host") {
      if (row.road) base.road = String(row.road);
      if (row.river) base.river = String(row.river);
      if (connections.length > 0) base.connections = connections;
    }
    return base;
  }

  // scouted, explored, fully_mapped
  const filteredSites = rawSites
    .filter((s) => {
      if (role === "host") return true;
      if (s.visibility === "visible" || (!s.visibility && !s.isSecret)) {
        return true;
      }
      return discoveredSiteIds.has(s.id);
    })
    .map((s) => ({
      ...s,
      isSecret: s.isSecret ?? s.visibility === "secret",
    }));

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
    sites: filteredSites,
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

function rowToRoom(row: Row, _role: Role = "player"): DungeonRoom {
  return {
    id: Number(row.id),
    sequence: Number(row.sequence),
    geometry: String(row.geometry),
    contents: String(row.contents),
    interaction: String(row.interaction),
    exits: Number(row.exits),
    trap: undefined,
    siteId: row.site_id ? String(row.site_id) : undefined,
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
