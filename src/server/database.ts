import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import Database from "better-sqlite3";
import {
  HEX_DEFINITIONS,
  MONSTERS,
  THREAT_VECTORS,
} from "../shared/content.js";
import type {
  CampaignState,
  Character,
  DungeonRoom,
  Encounter,
  PublicHex,
  Role,
  RollRecord,
  ThreatVector,
  WikiNote,
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

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.exec(
      "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
    );
    this.migrate();
  }

  close() {
    this.db.close();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, region_name TEXT NOT NULL,
        act INTEGER NOT NULL DEFAULT 1, pin_hash TEXT NOT NULL, host_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
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
        anchors_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hexes (
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, id TEXT NOT NULL, ring INTEGER NOT NULL,
        q INTEGER NOT NULL, r INTEGER NOT NULL, name TEXT NOT NULL, biome TEXT NOT NULL, threat_tier INTEGER NOT NULL,
        landmark TEXT NOT NULL, reveal_state TEXT NOT NULL DEFAULT 'unexplored', PRIMARY KEY (campaign_id, id)
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
        monster_key TEXT NOT NULL, current_hp INTEGER NOT NULL, max_hp INTEGER NOT NULL, lore_tier INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS threat_vectors (
        id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        vector_key TEXT NOT NULL, name TEXT NOT NULL, shards INTEGER NOT NULL DEFAULT 0, confirmed INTEGER NOT NULL DEFAULT 0,
        UNIQUE(campaign_id, vector_key)
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
      PRAGMA optimize;
    `);
  }

  createCampaign(name: string, regionName: string, pin: string) {
    let code = campaignCode();
    while (this.db.prepare("SELECT 1 FROM campaigns WHERE code = ?").get(code))
      code = campaignCode();
    const hostToken = token();
    const result = this.db
      .prepare(
        "INSERT INTO campaigns (code,name,region_name,pin_hash,host_token,created_at) VALUES (?,?,?,?,?,?)",
      )
      .run(code, name, regionName, hashPin(pin), hostToken, now());
    const campaignId = Number(result.lastInsertRowid);
    const insertHex = this.db.prepare(
      "INSERT INTO hexes (campaign_id,id,ring,q,r,name,biome,threat_tier,landmark,reveal_state) VALUES (?,?,?,?,?,?,?,?,?,?)",
    );
    for (const [
      id,
      ring,
      q,
      r,
      hexName,
      biome,
      tier,
      landmark,
    ] of HEX_DEFINITIONS) {
      insertHex.run(
        campaignId,
        id,
        ring,
        q,
        r,
        hexName,
        biome,
        tier,
        landmark,
        id === "00" ? "fully_mapped" : "unexplored",
      );
    }
    const insertThreat = this.db.prepare(
      "INSERT INTO threat_vectors (campaign_id,vector_key,name) VALUES (?,?,?)",
    );
    for (const [key, threatName] of THREAT_VECTORS)
      insertThreat.run(campaignId, key, threatName);
    return { code, hostToken, campaignId };
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
      (campaign_id,owner_token,name,ancestry,class_name,level,hp,max_hp,ac,gold,gear_slots,str,dex,con,int,wis,cha,anchors_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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

  updateCharacterHp(campaignId: number, characterId: number, hp: number) {
    this.db
      .prepare(
        "UPDATE characters SET hp = MAX(0, MIN(max_hp, ?)) WHERE id = ? AND campaign_id = ?",
      )
      .run(hp, characterId, campaignId);
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

  addEncounter(
    campaignId: number,
    monsterKey: keyof typeof MONSTERS,
    count: number,
  ) {
    const monster = MONSTERS[monsterKey];
    const result = this.db
      .prepare(
        "INSERT INTO encounters (campaign_id,name,created_at) VALUES (?,?,?)",
      )
      .run(campaignId, monster.name, now());
    const encounterId = Number(result.lastInsertRowid);
    const insert = this.db.prepare(
      "INSERT INTO encounter_monsters (encounter_id,monster_key,current_hp,max_hp) VALUES (?,?,?,?)",
    );
    for (let i = 0; i < count; i++)
      insert.run(encounterId, monsterKey, monster.hp, monster.hp);
    return encounterId;
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

  addThreatShard(campaignId: number, vectorKey: string) {
    this.db
      .prepare(
        "UPDATE threat_vectors SET shards = shards + 1 WHERE campaign_id = ? AND vector_key = ? AND NOT EXISTS (SELECT 1 FROM threat_vectors WHERE campaign_id = ? AND confirmed = 1)",
      )
      .run(campaignId, vectorKey, campaignId);
    const vector = this.db
      .prepare(
        "SELECT shards FROM threat_vectors WHERE campaign_id = ? AND vector_key = ?",
      )
      .get(campaignId, vectorKey) as Row;
    if (Number(vector.shards) >= 3)
      this.db
        .prepare(
          "UPDATE threat_vectors SET confirmed = CASE WHEN vector_key = ? THEN 1 ELSE 0 END WHERE campaign_id = ?",
        )
        .run(vectorKey, campaignId);
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
    ).map(rowToHex);
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
        const monster =
          MONSTERS[String(row.monster_key) as keyof typeof MONSTERS];
        const tier = Number(row.lore_tier);
        return {
          id: Number(row.id),
          monsterKey: String(row.monster_key),
          name: monster.name,
          currentHp: Number(row.current_hp),
          maxHp: Number(row.max_hp),
          loreTier: tier,
          ...(tier >= 1
            ? { ac: monster.ac, lore: monster.lore.slice(0, tier) }
            : {}),
          ...(tier >= 2
            ? { morale: monster.morale, attacks: [...monster.attacks] }
            : {}),
          ...(tier >= 3 ? { traits: [...monster.traits] } : {}),
        };
      }),
    }));
    const threats = (
      this.db
        .prepare(
          "SELECT * FROM threat_vectors WHERE campaign_id = ? ORDER BY id",
        )
        .all(campaignId) as Row[]
    ).map(
      (row): ThreatVector => ({
        id: Number(row.id),
        key: String(row.vector_key),
        name: String(row.name),
        shards: Number(row.shards),
        confirmed: Boolean(row.confirmed),
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
    return {
      campaign: {
        id: campaignId,
        code: String(campaign.code),
        name: String(campaign.name),
        regionName: String(campaign.region_name),
        act: Number(campaign.act),
        joinUrl,
      },
      me: { role, characterId },
      characters,
      hexes,
      rooms,
      encounters,
      threats,
      rolls,
      notes,
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
  };
}

function rowToHex(row: Row): PublicHex {
  const revealState = String(row.reveal_state) as PublicHex["revealState"];
  const base = {
    id: String(row.id),
    ring: Number(row.ring),
    q: Number(row.q),
    r: Number(row.r),
    revealState,
  };
  return revealState === "unexplored"
    ? base
    : {
        ...base,
        name: String(row.name),
        biome: String(row.biome),
        threatTier: Number(row.threat_tier),
        landmark: String(row.landmark),
      };
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
