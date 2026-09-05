import express from "express";
import { randomInt } from "node:crypto";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import QRCode from "qrcode";
import { Server as SocketServer, type Socket } from "socket.io";
import { z } from "zod";
import { ANCESTRIES, CLASSES } from "../shared/content.js";
import { BORDER_PAIRINGS, validateBorderPairing, ZONE_PROFILES } from "../shared/zone-profiles.js";
import type {
  CampaignPhase,
  EncounterMonster,
  ExpeditionObjective,
  PublicConnectionSummary,
  RegionGenerationConfig,
  Role,
} from "../shared/types.js";
import { AshDatabase } from "./database.js";
import { generateCampaignComplication } from "./generators/campaign.js";
import { AQUATIC_METHODS, evaluateAquaticAccess } from "./generators/mind-below.js";
import { generateNpc } from "./generators/npc.js";
import { generateSettlement } from "./generators/settlement.js";
import {
  abilityModifier,
  binaryOracle,
  calculateTravelWatches,
  evaluateWatchFatigue,
  generateDungeonRoom,
  generateMonsterVariant,
  levelUpCharacter,
  loreTier,
  moraleRoll,
  reactionRoll,
  rollAbilities,
  rollClassTalent,
  rollDice,
  rollDie,
  wildernessWatch,
  type Likelihood,
} from "./rules.js";

const cleanText = z.string().trim().min(1).max(500);

const cursedZoneIds = [
  "the_gloaming",
  "red_sands",
  "midnight_sun",
  "river_of_night",
  "dwellers_in_the_deep",
  "city_of_masks",
] as const;

const singleSelectionSchema = z.object({
  mode: z.literal("single"),
  zoneId: z.enum(cursedZoneIds),
});

const borderSelectionSchema = z.object({
  mode: z.literal("border"),
  zoneIds: z.tuple([z.enum(cursedZoneIds), z.enum(cursedZoneIds)]),
  connection: z.enum(["surface", "vertical", "urban", "distant"]),
  borderProfileId: z.string().optional(),
}).refine(
  (sel) => sel.zoneIds[0] !== sel.zoneIds[1],
  { message: "Border mode requires two distinct zones" },
).refine(
  (sel) => {
    const res = validateBorderPairing(sel.zoneIds[0], sel.zoneIds[1], sel.connection);
    return res.valid;
  },
  { message: "Unsupported border pairing or connection mode" },
);

const regionSelectionSchema = z.discriminatedUnion("mode", [
  singleSelectionSchema,
  borderSelectionSchema,
]);

export const regionGenerationConfigSchema = z.object({
  selection: regionSelectionSchema,
  initialRadius: z.number().int().min(1).max(4).optional(),
  structuralRadius: z.number().int().min(2).max(12).optional(),
  regionalHexMiles: z.number().int().min(1).max(30).optional(),
  seed: z.string().trim().min(1).max(100).optional(),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  sourceContent: z.enum(["adapted", "named"]).optional(),
  rulesProfileId: z.string().optional(),
  legacy: z.boolean().optional(),
});

const createCampaignSchema = z.object({
  name: cleanText.max(80),
  regionName: cleanText.max(80),
  pin: z.string().regex(/^\d{4,8}$/),
  generationConfig: regionGenerationConfigSchema.optional(),
});
const joinSchema = z.object({
  code: z.string().trim().length(6),
  token: z.string().optional(),
});
const hostSchema = z.object({
  code: z.string().trim().length(6),
  pin: z.string().min(4).max(8),
});
const abilitySchema = z.object({
  str: z.number().int().min(3).max(20),
  dex: z.number().int().min(3).max(20),
  con: z.number().int().min(3).max(20),
  int: z.number().int().min(3).max(20),
  wis: z.number().int().min(3).max(20),
  cha: z.number().int().min(3).max(20),
});
const characterSchema = z.object({
  name: cleanText.max(50),
  ancestry: z.enum(ANCESTRIES as unknown as [string, ...string[]]),
  className: z
    .string()
    .refine((value) => CLASSES.some((item) => item.name === value)),
  abilities: abilitySchema,
  anchors: z.object({
    homeland: z.string().trim().max(500),
    landmark: z.string().trim().max(500),
    nemesis: z.string().trim().max(500),
  }),
});

type Identity = {
  code: string;
  role: Role;
  token: string;
  campaignId: number;
  characterId: number | null;
};
type Ack = (response: {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}) => void;

function localAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? [])
      if (address.family === "IPv4" && !address.internal)
        return address.address;
  }
  return "localhost";
}

function actorName(db: AshDatabase, identity: Identity, baseUrl: string) {
  if (identity.role === "host") return "Table";
  const state = db.getState(
    identity.campaignId,
    identity.role,
    identity.characterId,
    baseUrl,
  );
  return (
    state.characters.find((character) => character.id === identity.characterId)
      ?.name ?? "Player"
  );
}

export interface AshServerOptions {
  dbPath?: string;
  port?: number;
  frontend?: boolean;
  devFrontend?: boolean;
}

export async function createAshServer(options: AshServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const db = new AshDatabase(
    options.dbPath ?? resolve("data/local/ash.sqlite"),
  );
  const app = express();
  const httpServer: HttpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
  });
  const baseUrl = `http://${localAddress()}:${port}`;

  app.use(express.json({ limit: "100kb" }));
  app.get("/api/health", (_request, response) =>
    response.json({ ok: true, service: "ASH Table Companion" }),
  );
  app.get("/api/content", (_request, response) =>
    response.json({
      ancestries: ANCESTRIES,
      classes: CLASSES,
      monsters: db.listMonsters().map((m) => ({
        key: m.monsterKey,
        name: m.name,
        level: m.level,
        family: m.family,
      })),
      zones: db.listZones(),
      zoneProfiles: Object.values(ZONE_PROFILES),
      borderPairings: BORDER_PAIRINGS,
    }),
  );

  app.post("/api/regions/preview", (request, response) => {
    const parsed = regionGenerationConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: "Invalid region configuration: " + parsed.error.issues.map((i) => i.message).join("; "),
      });
    }
    try {
      const preview = db.previewRegion(parsed.data);
      return response.json(preview);
    } catch (err: any) {
      return response.status(422).json({
        error: err.message || "Failed to generate region preview.",
      });
    }
  });

  app.post("/api/campaigns", (request, response) => {
    const parsed = createCampaignSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({
        error: "Campaign name, region, and a 4–8 digit PIN are required.",
        details: parsed.error.issues,
      });
    try {
      const created = db.createCampaign(
        parsed.data.name,
        parsed.data.regionName,
        parsed.data.pin,
        parsed.data.generationConfig,
      );
      return response.status(201).json({
        code: created.code,
        token: created.hostToken,
        role: "host",
        joinUrl: `${baseUrl}/play?code=${created.code}`,
      });
    } catch (err: any) {
      return response.status(422).json({
        error: err.message || "Failed to generate campaign world.",
      });
    }
  });

  app.post("/api/campaigns/join", (request, response) => {
    const parsed = joinSchema.safeParse(request.body);
    if (!parsed.success)
      return response
        .status(400)
        .json({ error: "Enter a valid six-character campaign code." });
    const joined = db.joinCampaign(
      parsed.data.code.toUpperCase(),
      parsed.data.token,
    );
    if (!joined)
      return response.status(404).json({ error: "Campaign not found." });
    return response.json({
      code: String(joined.campaign.code),
      token: joined.token,
      role: "player",
    });
  });

  app.post("/api/campaigns/host", (request, response) => {
    const parsed = hostSchema.safeParse(request.body);
    if (!parsed.success)
      return response
        .status(400)
        .json({ error: "Campaign code and PIN are required." });
    const authenticated = db.authenticatePin(
      parsed.data.code.toUpperCase(),
      parsed.data.pin,
    );
    if (!authenticated)
      return response
        .status(401)
        .json({ error: "That campaign code or PIN is not valid." });
    return response.json({
      code: parsed.data.code.toUpperCase(),
      token: authenticated.token,
      role: "host",
    });
  });

  app.get("/api/campaigns/:code/qr", async (request, response) => {
    const campaign = db.getCampaign(request.params.code.toUpperCase());
    if (!campaign) return response.status(404).end();
    response.type("png");
    return response.send(
      await QRCode.toBuffer(`${baseUrl}/play?code=${String(campaign.code)}`, {
        margin: 1,
        width: 480,
        color: { dark: "#11130fff", light: "#ece7d5ff" },
      }),
    );
  });

  io.use((socket, next) => {
    const auth = socket.handshake.auth as Partial<{
      code: string;
      role: Role;
      token: string;
    }>;
    if (
      !auth.code ||
      !auth.role ||
      !auth.token ||
      !["host", "player"].includes(auth.role)
    )
      return next(new Error("Missing session credentials"));
    const valid = db.authenticate(
      auth.code.toUpperCase(),
      auth.role,
      auth.token,
    );
    if (!valid) return next(new Error("Session credentials are not valid"));
    socket.data.identity = {
      code: auth.code.toUpperCase(),
      role: auth.role,
      token: auth.token,
      ...valid,
    } satisfies Identity;
    next();
  });

  async function broadcast(campaignId: number) {
    const room = `campaign:${campaignId}`;
    const sockets = await io.in(room).fetchSockets();
    for (const socket of sockets) {
      const identity = socket.data.identity as Identity;
      const refreshed = db.authenticate(
        identity.code,
        identity.role,
        identity.token,
      );
      if (!refreshed) continue;
      identity.characterId = refreshed.characterId;
      socket.emit(
        "state",
        db.getState(
          campaignId,
          identity.role,
          identity.characterId,
          `${baseUrl}/play?code=${identity.code}`,
        ),
      );
    }
  }

  io.on("connection", (socket: Socket) => {
    const identity = socket.data.identity as Identity;
    socket.join(`campaign:${identity.campaignId}`);
    socket.emit(
      "state",
      db.getState(
        identity.campaignId,
        identity.role,
        identity.characterId,
        `${baseUrl}/play?code=${identity.code}`,
      ),
    );

    const action =
      <T>(
        handler: (
          payload: T,
        ) =>
          | Promise<Record<string, unknown> | void>
          | Record<string, unknown>
          | void,
      ) =>
      async (payload: T, ack?: Ack) => {
        try {
          const result = await handler(payload);
          await broadcast(identity.campaignId);
          ack?.({ ok: true, ...result });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Action failed",
          });
        }
      };
    const hostOnly = () => {
      if (identity.role !== "host")
        throw new Error("Only the table host can do that");
    };
    const actor = () =>
      actorName(db, identity, `${baseUrl}/play?code=${identity.code}`);

    // --- Phase & Zone State Machine Events ---

    socket.on(
      "phase:transition",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({ phase: z.enum(["sanctuary", "hexcrawl", "dungeon"]) })
          .parse(raw);
        db.setCampaignPhase(identity.campaignId, payload.phase as CampaignPhase);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "campaign",
          label: `Phase Transition: ${payload.phase.toUpperCase()}`,
          dice: "—",
          total: 0,
          detail: `The campaign phase is now set to ${payload.phase}.`,
        });
      }),
    );

    socket.on(
      "zone:enter",
      action((raw: unknown) => {
        hostOnly();
        const payload = z.object({ zoneId: z.string().min(1) }).parse(raw);
        const zone = db.getZoneManifest(payload.zoneId);
        if (!zone) throw new Error("Zone not found");
        db.setActiveZone(identity.campaignId, payload.zoneId);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "zone",
          label: `Entered Zone: ${zone.name}`,
          dice: "—",
          total: 0,
          detail: `${zone.theme} (${zone.biomePalette.join(", ")})`,
        });
      }),
    );

    socket.on(
      "zone:exit",
      action((_raw: unknown) => {
        hostOnly();
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const homeLoc = (state.campaign as any).homeLocation ?? { q: 0, r: 0, layerId: "surface" };
        const regRow = db.db
          .prepare("SELECT selection_json FROM regions WHERE campaign_id = ? AND active = 1")
          .get(identity.campaignId) as { selection_json?: string } | undefined;
        let primaryZone = "the_gloaming";
        if (regRow?.selection_json) {
          try {
            const sel = JSON.parse(regRow.selection_json);
            primaryZone = sel.mode === "single" ? sel.zoneId : sel.zoneIds[0];
          } catch {}
        } else if (state.campaign.activeZoneId) {
          primaryZone = state.campaign.activeZoneId;
        }

        db.setActiveZone(identity.campaignId, primaryZone);
        db.setCampaignPhase(identity.campaignId, "sanctuary");
        db.setPartyLocation(identity.campaignId, homeLoc);

        const sanctuaryHex = state.hexes.find((h) => h.id === "00");
        const sanctuaryName = sanctuaryHex?.name || "Sanctuary";
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "zone",
          label: "Returned to Sanctuary",
          dice: "—",
          total: 0,
          detail: `Returned safely to ${sanctuaryName} in ${primaryZone.replace(/_/g, " ")}.`,
        });
      }),
    );

    // --- Generators (Settlement, NPC, Campaign) ---

    socket.on(
      "settlement:generate",
      action((_raw: unknown) => {
        const result = generateSettlement();
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "settlement",
          label: `Settlement: ${result.scale.name}`,
          dice: "1d6 + 2d10 + 1d8",
          total: 0,
          detail: `${result.tavern.name} (${result.tavern.vibe}) · Rumor: "${result.rumor.rumor}"`,
        });
        return { result };
      }),
    );

    socket.on(
      "npc:generate",
      action((raw: unknown) => {
        const payload = z
          .object({ zoneId: z.string().optional() })
          .optional()
          .parse(raw);
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const zoneId = payload?.zoneId ?? state.campaign.activeZoneId ?? "the_gloaming";
        const result = generateNpc(state.characters, zoneId);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "npc",
          label: `NPC: ${result.ancestry} ${result.className}`,
          dice: "1d100 + 1d12 + 1d12",
          total: result.retainerStats.level,
          detail: `${result.demeanor} (${result.quirk}) · Motive: ${result.motive}`,
        });
        return { result };
      }),
    );

    socket.on(
      "campaign:complication",
      action((_raw: unknown) => {
        hostOnly();
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const result = generateCampaignComplication(state.pressures);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "campaign",
          label: "Campaign Complication",
          dice: "1d8",
          total: 0,
          detail: result.complication,
        });
        return { result };
      }),
    );

    socket.on(
      "retainer:hire",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            name: cleanText.max(50),
            ancestry: z.string().max(50),
            className: z.string().max(50),
            level: z.number().int().min(1).max(10),
            hp: z.number().int().min(1).max(100),
            morale: z.number().int().min(2).max(12),
            dailyWage: z.string().max(50),
            notes: z.string().max(500),
          })
          .parse(raw);

        const characterId = db.addCharacter(identity.campaignId, null, {
          name: `[Retainer] ${payload.name}`,
          ancestry: payload.ancestry,
          className: payload.className,
          level: payload.level,
          hp: payload.hp,
          maxHp: payload.hp,
          ac: 10,
          gold: 0,
          gearSlots: 10,
          abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          anchors: {
            homeland: `Wage: ${payload.dailyWage}`,
            landmark: `Morale: ${payload.morale}`,
            nemesis: payload.notes,
          },
          talents: [`Retainer Morale: ${payload.morale}`, `Daily Wage: ${payload.dailyWage}`],
          xp: 0,
        });

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "character",
          label: `Hired Retainer: ${payload.name}`,
          dice: "—",
          total: payload.level,
          detail: `${payload.ancestry} ${payload.className} · Level ${payload.level}, ${payload.hp} HP · Daily Wage: ${payload.dailyWage}`,
        });

        return { characterId };
      }),
    );

    socket.on(
      "party:rest",
      action((_raw: unknown) => {
        hostOnly();
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const loc = state.campaign.partyLocation ?? { q: 0, r: 0 };
        const isSanctuary = state.campaign.phase === "sanctuary" || (loc.q === 0 && loc.r === 0);
        if (!isSanctuary) {
          throw new Error("Cannot take full sanctuary rest in the wild. Pitch camp or return to haven.");
        }

        for (const c of state.characters) {
          db.updateCharacterHp(identity.campaignId, c.id, c.maxHp);
          db.updateCharacterFatigue(c.id, 0);
        }
        db.resupplyPartyRations(identity.campaignId, 12);

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "party",
          label: "Sanctuary Rest & Full Recovery",
          dice: "—",
          total: 0,
          detail: "The company rested in sanctuary. All hit points restored, travel fatigue cleared, and travel rations replenished.",
        });
      }),
    );

    // --- Dice & Oracles ---

    socket.on(
      "dice:roll",
      action((raw: unknown) => {
        const payload = z
          .object({
            expression: z.string().max(20),
            label: z.string().trim().max(80).default("Manual roll"),
          })
          .parse(raw);
        const result = rollDice(payload.expression);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "dice",
          label: payload.label || "Manual roll",
          dice: result.expression,
          total: result.total,
          detail: `Rolled ${result.rolls.join(", ")}${result.modifier ? `; modifier ${result.modifier}` : ""}`,
        });
        return { result };
      }),
    );

    socket.on(
      "oracle:binary",
      action((raw: unknown) => {
        const payload = z
          .object({
            question: cleanText,
            likelihood: z.enum([
              "certain",
              "likely",
              "even",
              "unlikely",
              "impossible",
            ]),
          })
          .parse(raw);
        const result = binaryOracle(payload.likelihood as Likelihood);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "oracle",
          label: payload.question,
          dice: "1d20",
          total: result.roll,
          detail: `${result.answer} · target ${result.target}+`,
        });
        return { result };
      }),
    );

    socket.on(
      "oracle:reaction",
      action((raw: unknown) => {
        const payload = z
          .object({ chaModifier: z.number().int().min(-5).max(10).default(0) })
          .parse(raw);
        const result = reactionRoll(payload.chaModifier);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "reaction",
          label: "Encounter reaction",
          dice: `2d6${payload.chaModifier >= 0 ? "+" : ""}${payload.chaModifier}`,
          total: result.total,
          detail: result.reaction,
        });
        return { result };
      }),
    );

    // --- Characters, Progression & Leveling (1-36) ---

    socket.on(
      "character:roll-abilities",
      action((_raw: unknown) => {
        const scores = rollAbilities();
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "character",
          label: "Ability array",
          dice: "6 × 3d6",
          total: Math.max(...scores),
          detail: scores.join(" / "),
        });
        return { scores };
      }),
    );

    socket.on(
      "character:create",
      action((raw: unknown) => {
        const input = characterSchema.parse(raw);
        if (identity.role === "player" && identity.characterId)
          throw new Error("This device already owns a character");
        const classInfo = CLASSES.find(
          (item) => item.name === input.className,
        )!;
        const conMod = abilityModifier(input.abilities.con);
        const strMod = abilityModifier(input.abilities.str);
        const dexMod = abilityModifier(input.abilities.dex);
        const ancestryHp = input.ancestry === "Dwarf" ? 2 : 0;
        const maxHp = Math.max(
          1,
          rollDie(classInfo.hitDie) + conMod + ancestryHp,
        );

        // Roll Level 1 Talent for odd level
        const level1Talent = rollClassTalent(input.className);

        const characterId = db.addCharacter(
          identity.campaignId,
          identity.role === "player" ? identity.token : null,
          {
            ...input,
            level: 1,
            hp: maxHp,
            maxHp,
            ac: 10 + dexMod,
            gold: (rollDie(6) + rollDie(6)) * 10,
            gearSlots: 10 + strMod + (input.ancestry === "Half-Ogre" ? 4 : 0),
            talents: [`[Lvl 1] ${level1Talent.effect}`],
            xp: 0,
          },
        );
        identity.characterId =
          identity.role === "player" ? characterId : identity.characterId;
        db.addRoll(identity.campaignId, {
          actor: input.name,
          kind: "character",
          label: "Joined the expedition",
          dice: `1d${classInfo.hitDie}`,
          total: maxHp,
          detail: `${input.ancestry} ${input.className} · ${maxHp} HP · Talent: ${level1Talent.effect}`,
        });
        return { characterId };
      }),
    );

    socket.on(
      "character:level_up",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int() }).parse(raw);
        if (
          identity.role !== "host" &&
          payload.characterId !== identity.characterId
        )
          throw new Error("You can only level up your own character");

        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const character = state.characters.find(
          (c) => c.id === payload.characterId,
        );
        if (!character) throw new Error("Character not found");
        if (character.level >= 36) throw new Error("Character is already at max level (36)");

        const levelUpResult = levelUpCharacter(character);
        db.updateCharacter(identity.campaignId, levelUpResult.character);

        db.addRoll(identity.campaignId, {
          actor: character.name,
          kind: "character",
          label: `Advanced to Level ${levelUpResult.character.level}`,
          dice: levelUpResult.character.level <= 10 ? "1dHD + CON" : "Flat +1 (Grit)",
          total: levelUpResult.gainedHp,
          detail: levelUpResult.log,
        });

        return { result: levelUpResult };
      }),
    );

    socket.on(
      "character:talent_roll",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int() }).parse(raw);
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const character = state.characters.find(
          (c) => c.id === payload.characterId,
        );
        if (!character) throw new Error("Character not found");

        const rolled = rollClassTalent(character.className);
        const updatedTalents = [...(character.talents ?? []), `[Talent Roll] ${rolled.effect}`];
        db.updateCharacter(identity.campaignId, {
          ...character,
          talents: updatedTalents,
        });

        db.addRoll(identity.campaignId, {
          actor: character.name,
          kind: "character",
          label: `Rolled ${character.className} Talent`,
          dice: "2d6",
          total: rolled.roll,
          detail: rolled.effect,
        });

        return { roll: rolled };
      }),
    );

    socket.on(
      "character:hp",
      action((raw: unknown) => {
        const payload = z
          .object({ characterId: z.number().int(), hp: z.number().int() })
          .parse(raw);
        if (
          identity.role !== "host" &&
          payload.characterId !== identity.characterId
        )
          throw new Error("You can only change your own HP");
        db.updateCharacterHp(
          identity.campaignId,
          payload.characterId,
          payload.hp,
        );
      }),
    );

    socket.on(
      "character:xp",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({ characterId: z.number().int(), amount: z.number().int() })
          .parse(raw);
        db.addCharacterXp(identity.campaignId, payload.characterId, payload.amount);
      }),
    );

    socket.on(
      "hex:reveal",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            id: z.string().regex(/^\d{2}$/),
            revealState: z.enum([
              "rumored",
              "scouted",
              "explored",
              "fully_mapped",
            ]),
          })
          .parse(raw);
        db.revealHex(identity.campaignId, payload.id, payload.revealState);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "exploration",
          label: `Hex ${payload.id} revealed`,
          dice: "—",
          total: Number(payload.id),
          detail: payload.revealState.replace("_", " "),
        });
      }),
    );

    socket.on(
      "hex:regenerate",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            theme: z.string().optional(),
            config: z.any().optional(),
          })
          .optional()
          .parse(raw);
        db.regenerateHexMap(identity.campaignId, payload?.config ?? payload?.theme);
        db.addRoll(identity.campaignId, {
          actor: "Host",
          kind: "exploration",
          label: "Regional frontier regenerated",
          dice: "—",
          total: 19,
          detail: "Frontier re-seeded with coherent river courses, trade routes, and horizon rumors.",
        });
      }),
    );

    socket.on(
      "wilderness:watch",
      action((raw: unknown) => {
        const payload = z
          .object({ biome: z.enum(["forest", "marsh", "mountain"]) })
          .parse(raw);
        const result = wildernessWatch(payload.biome);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "wilderness",
          label: `${payload.biome} travel watch`,
          dice: "2d6 + 1d6",
          total: result.weatherTotal,
          detail: `${result.weather}; ${result.encounter}`,
        });
        return { result };
      }),
    );

    socket.on(
      "travel:move",
      action((raw: unknown) => {
        const payload = z
          .object({
            toHexId: z.string().min(1),
            mode: z.enum(["foot", "cart", "boat", "climb"]).default("foot"),
          })
          .parse(raw);

        // 1. Authoritative origin from DB
        const camp = db.db
          .prepare(
            "SELECT party_location_json, active_region_id, active_zone_id, day, watch, watches_traveled_today FROM campaigns WHERE id = ?",
          )
          .get(identity.campaignId) as any;
        const currentLoc = camp?.party_location_json
          ? JSON.parse(camp.party_location_json)
          : { q: 0, r: 0, layerId: "surface" };

        // 2. Authoritative target hex from DB
        const targetHexRow = db.db
          .prepare("SELECT * FROM hexes WHERE campaign_id = ? AND id = ?")
          .get(identity.campaignId, payload.toHexId) as any;
        if (!targetHexRow) throw new Error(`Target hex ${payload.toHexId} not found`);

        const fromQ = currentLoc.q;
        const fromR = currentLoc.r;
        const toQ = Number(targetHexRow.q);
        const toR = Number(targetHexRow.r);

        // 3. Adjacency check
        const axialDist =
          (Math.abs(fromQ - toQ) +
            Math.abs(fromQ + fromR - toQ - toR) +
            Math.abs(fromR - toR)) /
          2;

        let travelConnection: any = null;
        if (camp?.active_region_id) {
          const fromKey = `${camp.active_region_id}:${currentLoc.layerId || "surface"}:${fromQ}:${fromR}`;
          const toKey = `${camp.active_region_id}:${currentLoc.layerId || "surface"}:${toQ}:${toR}`;
          const connRow = db.db
            .prepare(
              "SELECT * FROM connections WHERE region_id = ? AND ((from_key = ? AND to_key = ?) OR (to_key = ? AND from_key = ?))",
            )
            .get(camp.active_region_id, fromKey, toKey, fromKey, toKey) as any;
          if (connRow) {
            travelConnection = connRow;
          }
        }
        if (!travelConnection && targetHexRow.connections_json) {
          const conns = JSON.parse(targetHexRow.connections_json);
          const originHexRow = db.db
            .prepare("SELECT id FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
            .get(identity.campaignId, fromQ, fromR) as any;
          if (originHexRow) {
            travelConnection = conns.find(
              (c: any) =>
                (c.fromId === originHexRow.id && c.toId === targetHexRow.id) ||
                (c.toId === originHexRow.id && c.fromId === targetHexRow.id),
            );
          }
        }

        if (axialDist > 1 && !travelConnection) {
          throw new Error(
            `Cannot travel directly from (${fromQ}, ${fromR}) to non-adjacent hex ${payload.toHexId} at (${toQ}, ${toR}) without a connecting route`,
          );
        }

        // 4. Validate Travel Mode & Requirements
        if (travelConnection) {
          const connModes: string[] = travelConnection.modes_json
            ? JSON.parse(travelConnection.modes_json)
            : travelConnection.modes ?? ["foot"];
          const connReqs: string[] = travelConnection.requirements_json
            ? JSON.parse(travelConnection.requirements_json)
            : travelConnection.requirements ?? [];

          if (travelConnection.kind === "shaft" && payload.mode !== "climb") {
            throw new Error("Ascending or descending a vertical shaft requires climbing mode and gear.");
          }
          if ((connReqs.includes("rope") || connReqs.includes("climbing_gear")) && payload.mode !== "climb") {
            throw new Error("This passage requires climbing mode and gear.");
          }
          if (payload.mode === "boat") {
            const isWaterway =
              ["river", "sea_lane", "canal", "ferry", "voyage"].includes(travelConnection.kind) ||
              targetHexRow.river;
            if (!isWaterway) {
              throw new Error("Boat travel requires a navigable waterway, canal, or sea lane.");
            }
          }
          if (payload.mode === "cart" && travelConnection.kind === "shaft") {
            throw new Error("Carts cannot traverse vertical shafts.");
          }
        } else {
          if (payload.mode === "boat" && !targetHexRow.river) {
            throw new Error("Boat travel requires a navigable river or water feature.");
          }
        }

        // 5. Cost calculation from saved world truth
        const hasRoad =
          !!travelConnection &&
          (travelConnection.kind === "road" || travelConnection.kind === "trail");
        const crossingMethod =
          travelConnection?.crossing_method || travelConnection?.crossingMethod;
        const calculatedWatches = calculateTravelWatches(
          targetHexRow.biome || "Wilderness",
          hasRoad,
          crossingMethod,
        );
        const watches =
          travelConnection?.cost_watches ||
          travelConnection?.costWatches ||
          calculatedWatches;

        // 6. Advance watch clock
        const clockResult = db.advanceWatch(identity.campaignId, watches);

        // 7. Check Forced March if Night travel occurred
        const fatigueResults =
          clockResult.watch === 1 || clockResult.watchesTraveledToday > 3
            ? db.evaluatePartyForcedMarch(identity.campaignId)
            : [];

        // 8. Wilderness Encounter Check (1d6 -> 1 triggers encounter)
        let encounterTriggered = false;
        let encounterName = "";
        const encRoll = rollDie(6);
        if (encRoll === 1) {
          encounterTriggered = true;
          const manifest = db.getZoneManifest(
            camp.active_zone_id || "the_gloaming",
          );
          const table =
            manifest?.wanderingMonsterTable && manifest.wanderingMonsterTable.length > 0
              ? manifest.wanderingMonsterTable
              : ["wolf", "bandit", "giant_spider"];
          const monsterKey = table[randomInt(table.length)];
          const monster = db.getMonster(monsterKey) ?? {
            id: 0,
            monsterKey,
            name: monsterKey,
            currentHp: 8,
            maxHp: 8,
            loreTier: 0,
            ac: 12,
            morale: 7,
            attacks: ["Strike +2 (1d6)"],
            traits: [],
            lore: [],
          };
          encounterName = `Wilderness Encounter: ${monster.name}`;
          db.addEncounterWithMonsters(identity.campaignId, encounterName, [monster]);
        }

        // 9. Update location and reveal target hex
        db.setPartyLocation(identity.campaignId, {
          q: toQ,
          r: toR,
          layerId: currentLoc.layerId || "surface",
        });

        if (
          targetHexRow.reveal_state === "unexplored" ||
          targetHexRow.reveal_state === "rumored"
        ) {
          db.revealHex(identity.campaignId, targetHexRow.id, "scouted");
        }

        if (
          targetHexRow.primary_zone &&
          targetHexRow.primary_zone !== camp.active_zone_id
        ) {
          db.setActiveZone(identity.campaignId, targetHexRow.primary_zone);
        }

        // 10. Log roll
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: `Traveled to Hex ${targetHexRow.id} (${targetHexRow.name || targetHexRow.biome || "Wilderness"})`,
          dice: `${watches} watch${watches > 1 ? "es" : ""}`,
          total: watches,
          detail: `Mode: ${payload.mode} · Cost: ${watches} watch(es) · Day ${clockResult.day}, Watch ${clockResult.watch} (${clockResult.weather}) · ${
            fatigueResults.length > 0
              ? fatigueResults.some((f) => !f.passed)
                ? `Forced march: fatigue incurred (${fatigueResults.filter((f) => !f.passed).map((f) => f.name).join(", ")})`
                : "Forced march CON check passed"
              : "Standard watch"
          }${encounterTriggered ? ` · [INTERRUPTED: ${encounterName}]` : ""}`,
        });

        return {
          watches,
          clock: clockResult,
          fatigueResults,
          encounterTriggered,
          newPartyLocation: { q: toQ, r: toR },
        };
      }),
    );

    socket.on(
      "site:discover",
      action((raw: unknown) => {
        const payload = z.object({ siteId: z.string().min(1) }).parse(raw);
        const camp = db.db
          .prepare("SELECT party_location_json, active_region_id FROM campaigns WHERE id = ?")
          .get(identity.campaignId) as any;
        const currentLoc = camp?.party_location_json
          ? JSON.parse(camp.party_location_json)
          : { q: 0, r: 0, layerId: "surface" };

        const site = db.db.prepare("SELECT * FROM sites WHERE id = ?").get(payload.siteId) as any;
        if (!site) throw new Error(`Site ${payload.siteId} not found`);

        const parts = site.canonical_key.split(":");
        const sq = Number(parts[2]);
        const sr = Number(parts[3]);
        if (sq !== currentLoc.q || sr !== currentLoc.r) {
          throw new Error(`Cannot discover remote site ${site.name} without being present in that hex.`);
        }

        db.discoverSite(identity.campaignId, payload.siteId);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: "Site Discovered",
          dice: "—",
          total: 0,
          detail: `Party discovered hidden site: ${site.name}`,
        });
        return { ok: true, site };
      }),
    );

    socket.on(
      "expedition:select_objective",
      action((raw: unknown) => {
        const payload = z
          .object({
            leadId: z.string().optional(),
            title: z.string().min(1),
            targetHexId: z.string().optional(),
            targetSiteId: z.string().optional(),
            directionHint: z.string().optional(),
            notes: z.string().optional(),
          })
          .parse(raw);

        db.setExpeditionObjective(identity.campaignId, payload);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "expedition",
          label: `Objective Selected: ${payload.title}`,
          dice: "—",
          total: 0,
          detail: `Company established expedition objective: "${payload.title}". Known direction: ${payload.directionHint || "Undisclosed"}.`,
        });

        return { ok: true };
      }),
    );

    socket.on(
      "hex:search",
      action((_raw: unknown) => {
        const camp = db.db
          .prepare("SELECT party_location_json, active_region_id FROM campaigns WHERE id = ?")
          .get(identity.campaignId) as any;
        const currentLoc = camp?.party_location_json
          ? JSON.parse(camp.party_location_json)
          : { q: 0, r: 0, layerId: "surface" };
        const regionId = camp?.active_region_id;

        const clock = db.advanceWatch(identity.campaignId, 1);

        const targetKey = `${regionId}:${currentLoc.layerId || "surface"}:${currentLoc.q}:${currentLoc.r}`;
        const sitesInHex = db.db
          .prepare("SELECT * FROM sites WHERE region_id = ? AND canonical_key = ?")
          .all(regionId, targetKey) as any[];

        const newlyDiscovered: string[] = [];
        for (const s of sitesInHex) {
          if (!db.isSiteDiscovered(identity.campaignId, s.id)) {
            db.discoverSite(identity.campaignId, s.id);
            newlyDiscovered.push(s.name);
          }
        }

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: "Hex Thoroughly Searched",
          dice: "1 watch",
          total: clock.watch,
          detail:
            newlyDiscovered.length > 0
              ? `Search revealed hidden sites: ${newlyDiscovered.join(", ")}!`
              : "Search complete: no new secret entrances or hidden features observed.",
        });

        return { newlyDiscovered, clock };
      }),
    );

    socket.on(
      "expedition:forage",
      action((_raw: unknown) => {
        const clock = db.advanceWatch(identity.campaignId, 1);
        const roll = rollDice("1d20");
        const success = roll.total >= 10;
        const rationsFound = success ? rollDie(4) : 0;
        if (rationsFound > 0) {
          db.resupplyPartyRations(identity.campaignId, rationsFound);
        }

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "wilderness",
          label: `Wilderness Forage Check: ${success ? "Success" : "Failure"}`,
          dice: "1d20",
          total: roll.total,
          detail: success
            ? `Foraging gathered ${rationsFound} fresh ration(s) from wild roots and game.`
            : "Scoured the surrounding brush but found no potable water or edible forage.",
        });

        return { success, rationsFound, clock };
      }),
    );

    socket.on(
      "expedition:camp",
      action((_raw: unknown) => {
        const camp = db.db.prepare("SELECT watch FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const clockBefore = camp?.watch ?? 1;

        if (clockBefore === 4) {
          const chars = db.getState(identity.campaignId, "host", null, "").characters;
          for (const c of chars) {
            db.updateCharacterFatigue(c.id, Math.max(0, (c.fatigue ?? 0) - 1));
          }
          const clock = db.advanceWatch(identity.campaignId, 1);
          db.addRoll(identity.campaignId, {
            actor: actor(),
            kind: "wilderness",
            label: "Camp Long Rest (Night)",
            dice: "Watch 4 Rest",
            total: 0,
            detail: "Camp pitched through the night watch. Cleared 1 fatigue level. Rations consumed at dawn.",
          });
          return { rested: true, clock };
        } else {
          const chars = db.getState(identity.campaignId, "host", null, "").characters;
          for (const c of chars) {
            const heal = rollDie(4);
            db.updateCharacterHp(identity.campaignId, c.id, c.hp + heal);
          }
          const clock = db.advanceWatch(identity.campaignId, 1);
          db.addRoll(identity.campaignId, {
            actor: actor(),
            kind: "wilderness",
            label: "Daytime Breather & Rest",
            dice: "1d4 HP",
            total: clock.watch,
            detail: "Party took a short rest watch to bandage wounds and catch breath (regained 1d4 HP).",
          });
          return { rested: true, clock };
        }
      }),
    );

    socket.on(
      "expedition:camp_night",
      action((raw: unknown) => {
        const payload = z
          .object({
            tasks: z
              .array(
                z.object({
                  characterId: z.number(),
                  task: z.enum([
                    "watch",
                    "cook",
                    "hunt",
                    "firewood",
                    "bed_down",
                    "entertain",
                    "craft",
                    "predict",
                  ]),
                }),
              )
              .optional(),
          })
          .parse(raw ?? {});

        const campaignId = identity.campaignId;
        const camp = db.db
          .prepare(
            "SELECT watch, day, rations, weather, party_location_json, active_region_id FROM campaigns WHERE id = ?",
          )
          .get(campaignId) as any;
        const currentLoc = camp?.party_location_json
          ? JSON.parse(camp.party_location_json)
          : { q: 0, r: 0 };
        const chars = db.getState(campaignId, "host", null, "").characters;

        // 1. Process tasks per PG to Western Reaches pg. 230
        const taskResults: Array<{
          characterName: string;
          task: string;
          roll: number;
          dc: number;
          passed: boolean;
          detail: string;
        }> = [];

        let campfireSuccess = true;
        let watchAlert = false;
        let cookedBonus = false;
        let rationsGathered = 0;

        const tasksToRun =
          payload.tasks && payload.tasks.length > 0
            ? payload.tasks
            : chars.map((c, idx) => ({
                characterId: c.id,
                task:
                  idx === 0
                    ? ("watch" as const)
                    : idx === 1
                      ? ("cook" as const)
                      : idx === 2
                        ? ("firewood" as const)
                        : ("bed_down" as const),
              }));

        for (const t of tasksToRun) {
          const char = chars.find((c) => c.id === t.characterId);
          if (!char) continue;
          let statMod = 0;
          switch (t.task) {
            case "watch":
              statMod = abilityModifier(char.abilities.wis);
              break;
            case "cook":
              statMod = Math.max(
                abilityModifier(char.abilities.int),
                abilityModifier(char.abilities.wis),
              );
              break;
            case "hunt":
              statMod = Math.max(
                abilityModifier(char.abilities.str),
                abilityModifier(char.abilities.dex),
              );
              break;
            case "firewood":
              statMod = Math.max(
                abilityModifier(char.abilities.str),
                abilityModifier(char.abilities.con),
              );
              break;
            case "bed_down":
              statMod = Math.max(
                abilityModifier(char.abilities.wis),
                abilityModifier(char.abilities.con),
              );
              break;
            case "entertain":
              statMod = abilityModifier(char.abilities.cha);
              break;
            case "craft":
              statMod = abilityModifier(char.abilities.dex);
              break;
            case "predict":
              statMod = Math.max(
                abilityModifier(char.abilities.int),
                abilityModifier(char.abilities.wis),
              );
              break;
          }

          const roll = rollDie(20);
          const total = roll + statMod;
          const dc = 12;
          const passed = total >= dc;

          let detail = "";
          if (t.task === "watch") {
            if (passed) {
              detail = "Kept vigilant watch (guards one half of the night).";
            } else {
              detail = "Dozed off during their watch shift.";
            }
          } else if (t.task === "cook") {
            if (passed) {
              cookedBonus = true;
              detail = "Cooked a hearty hot meal (+2 temporary HP to party).";
            } else {
              detail = "Burned the meal; meager sustenance.";
            }
          } else if (t.task === "hunt") {
            if (passed) {
              const found = rollDie(4);
              rationsGathered += found;
              detail = `Tracked and dressed wild game (+${found} rations).`;
            } else {
              detail = "Game trails were barren.";
            }
          } else if (t.task === "firewood") {
            if (passed) {
              campfireSuccess = true;
              detail = "Gathered dry fallen logs for a crackling blaze.";
            } else {
              campfireSuccess = false;
              detail = "Only wet peat found; smoky campfire.";
            }
          } else if (t.task === "bed_down") {
            detail = passed ? "Deep, undisturbed slumber." : "Restless sleep on stony ground.";
          } else {
            detail = passed ? "Task completed successfully." : "Inconclusive results.";
          }

          taskResults.push({
            characterName: char.name,
            task: t.task,
            roll: total,
            dc,
            passed,
            detail,
          });
        }

        // 2. Apply cooked bonus
        if (cookedBonus) {
          for (const c of chars) {
            db.updateCharacterHp(campaignId, c.id, c.hp + 2);
          }
        }

        // 3. Apply rations gathered
        if (rationsGathered > 0) {
          db.resupplyPartyRations(campaignId, rationsGathered);
        }

        // 4. Clear 1 level of fatigue
        for (const c of chars) {
          db.updateCharacterFatigue(c.id, Math.max(0, (c.fatigue ?? 0) - 1));
        }

        // 5. Advance clock to next dawn (Day + 1, Watch 1)
        const currentWatch = (camp?.watch ?? 1) as 1 | 2 | 3 | 4;
        const watchesToDawn = (5 - currentWatch) % 4 || 4;
        const clock = db.advanceWatch(campaignId, watchesToDawn);

        // Evaluate watch coverage (PG to Western Reaches pg. 230: 1 sentry covers 1/2 night)
        const watchTasks = tasksToRun.filter((t) => t.task === "watch");
        const watchSuccesses = taskResults.filter(
          (t) => t.task === "watch" && t.passed,
        ).length;

        if (watchTasks.length === 0) {
          watchAlert = false; // No sentry: surprised!
        } else if (watchSuccesses >= 2) {
          watchAlert = true; // 2+ sentries cover both halves of the night!
        } else if (watchSuccesses === 1) {
          // 1 sentry covers half the night (50% chance encounter occurs during their watch)
          const shiftRoll = rollDie(2);
          watchAlert = shiftRoll === 1;
        } else {
          watchAlert = false; // Sentry failed check
        }

        // 6. Night encounter check (1 on 1d6)
        const encRoll = rollDie(6);
        let encounterTriggered = false;
        let encounterName = "";
        if (encRoll === 1) {
          encounterTriggered = true;
          const reg = db.db
            .prepare("SELECT selection_json FROM regions WHERE id = ?")
            .get(camp.active_region_id) as any;
          let zoneKey = "the_gloaming";
          if (reg?.selection_json) {
            try {
              const s = JSON.parse(reg.selection_json);
              if (s.zoneId) zoneKey = s.zoneId;
            } catch {}
          }
          const zoneProfile =
            (ZONE_PROFILES as any)[zoneKey] || (ZONE_PROFILES as any)["the_gloaming"];
          const table =
            zoneProfile?.wanderingMonsterTable && zoneProfile.wanderingMonsterTable.length > 0
              ? zoneProfile.wanderingMonsterTable
              : ["wolf", "bandit", "giant_spider"];
          const monsterKey = table[randomInt(table.length)];
          encounterName = `Midnight Stalkers: ${monsterKey.replace("_", " ")}`;
          db.addEncounterWithMonsters(campaignId, encounterName, [
            {
              id: 0,
              monsterKey,
              name:
                monsterKey.charAt(0).toUpperCase() +
                monsterKey.slice(1).replace("_", " "),
              currentHp: 10,
              maxHp: 10,
              loreTier: 1,
            },
          ]);
        }

        // 7. Chronicle roll entry
        const taskSummary = taskResults
          .map((t) => `${t.characterName} (${t.task}: ${t.passed ? "Pass" : "Fail"})`)
          .join(", ");
        db.addRoll(campaignId, {
          actor: actor(),
          kind: "wilderness",
          label: "Evening Camp Resolved",
          dice: "Camping Procedure",
          total: taskResults.filter((t) => t.passed).length,
          detail: `Camp pitched in Hex (${currentLoc.q}, ${currentLoc.r}). Tasks: ${taskSummary}. Fatigue cleared (-1). Supplies consumed at dawn. Dawn arrives: Day ${clock.day}, Watch ${clock.watch} (${clock.weather}).${
            encounterTriggered
              ? ` ⚠️ NIGHT ENCOUNTER: ${encounterName} (${watchAlert ? "Party Alert" : "Party Surprised!"})`
              : " Night passed peacefully under the stars."
          }`,
        });

        return {
          rested: true,
          clock,
          taskResults,
          encounterTriggered,
          encounterName: encounterTriggered ? encounterName : null,
          watchAlert,
          cookedBonus,
          rationsGathered,
        };
      }),
    );

    socket.on(
      "expedition:force_march",
      action((_raw: unknown) => {
        const campaignId = identity.campaignId;
        const camp = db.db
          .prepare(
            "SELECT watch, day, watches_traveled_today, weather, rations FROM campaigns WHERE id = ?",
          )
          .get(campaignId) as any;
        const currentWatch = camp?.watch ?? 1;

        let clock = {
          day: camp?.day ?? 1,
          watch: currentWatch,
          weather: camp?.weather ?? "Overcast / Mild Breeze",
          rations: camp?.rations ?? 12,
        };
        // If at watch 3, advance into watch 4
        if (currentWatch === 3) {
          clock = db.advanceWatch(campaignId, 1);
        }

        // Evaluate forced march CON DC 12 + fatigue
        const fatigueResults = db.evaluatePartyForcedMarch(campaignId, 12);
        const failedNames = fatigueResults.filter((f) => !f.passed).map((f) => f.name);

        db.addRoll(campaignId, {
          actor: actor(),
          kind: "wilderness",
          label: "Forced March Into Darkness (Watch 4)",
          dice: "CON DC 12+Fatigue",
          total: fatigueResults.filter((f) => f.passed).length,
          detail: `Party pushed past the daily allowance into the freezing dark of Watch 4. Saves: ${fatigueResults
            .map((f) => `${f.name}: ${f.roll} vs DC ${f.dc} (${f.passed ? "Pass" : "Fail, +1 Fatigue"})`)
            .join(", ")}.${failedNames.length > 0 ? ` Exhausted: ${failedNames.join(", ")}.` : " All pushed through successfully."}`,
        });

        return {
          forcedMarch: true,
          clock,
          fatigueResults,
        };
      }),
    );

    socket.on(
      "encounter:flee",
      action((_raw: unknown) => {
        const enc = db.db
          .prepare("SELECT * FROM encounters WHERE campaign_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
          .get(identity.campaignId) as any;
        if (enc) {
          db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE id = ?").run(enc.id);
        }

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "encounter",
          label: "Tactical Retreat",
          dice: "—",
          total: 0,
          detail: "Company beat a hasty tactical retreat from hostile engagement back into safety.",
        });

        return { retreated: true };
      }),
    );

    socket.on(
      "site:enter",
      action((raw: unknown) => {
        const payload = z.object({ siteId: z.string().min(1) }).parse(raw);
        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const currentLoc = camp?.party_location_json ? JSON.parse(camp.party_location_json) : { q: 0, r: 0 };

        const site = db.db.prepare("SELECT * FROM sites WHERE id = ?").get(payload.siteId) as any;
        if (!site) throw new Error(`Site ${payload.siteId} not found`);

        const siteParts = site.canonical_key.split(":");
        const siteQ = Number(siteParts[2]);
        const siteR = Number(siteParts[3]);

        if (siteQ !== currentLoc.q || siteR !== currentLoc.r) {
          throw new Error(`Party is at (${currentLoc.q}, ${currentLoc.r}), not at site location (${siteQ}, ${siteR})`);
        }

        if (
          site.currentState?.toLowerCase().includes("aquatic") ||
          site.id.includes("faerzress") ||
          site.id.includes("abyss") ||
          site.id.includes("mireforge")
        ) {
          const ap = db.getAdventurePath(identity.campaignId);
          if (ap && ap.endZoneId) {
            const chars = db.getState(identity.campaignId, "host", null, "").characters;
            const access = evaluateAquaticAccess({
              endZone: ap.endZoneId as any,
              characters: chars.map((c) => ({
                characterId: String(c.id),
                personalMethods: (c.talents ?? []).filter((t: string) => t in AQUATIC_METHODS) as any[],
              })),
            });
            if (!access.canEnter) {
              throw new Error(
                "Cannot enter submerged depths: party lacks required aquatic capabilities (water breathing/pressure).",
              );
            }
          }
        }

        db.setActiveSite(identity.campaignId, site.id);
        db.setCampaignPhase(identity.campaignId, "dungeon");

        const existingRoom = db.db
          .prepare("SELECT 1 FROM dungeon_rooms WHERE campaign_id = ? AND site_id = ?")
          .get(identity.campaignId, site.id);
        if (!existingRoom) {
          const room = generateDungeonRoom();
          db.addRoom(identity.campaignId, room, site.id);
        }

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: `Entered Site: ${site.name}`,
          dice: "—",
          total: 0,
          detail: `Party crossed threshold into ${site.name} (${site.kind}). Phase transitioned to dungeon.`,
        });

        return { ok: true, activeSiteId: site.id };
      }),
    );

    socket.on(
      "site:resolve_deed",
      action((raw: unknown) => {
        const payload = z
          .object({
            siteId: z.string().min(1),
            deed: z.string().min(1),
            details: z.string().optional(),
          })
          .parse(raw);

        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const currentSiteId = camp?.active_site_id;
        if (currentSiteId !== payload.siteId) {
          throw new Error(`Party is not currently inside site ${payload.siteId}`);
        }

        const res = db.resolveAdventurePathDeed(
          identity.campaignId,
          payload.deed,
          1,
          payload.details || `Resolved deed ${payload.deed} at site ${payload.siteId}`,
        );

        db.updateSiteState(payload.siteId, `Deed Resolved: ${payload.deed}`);

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "adventure_path",
          label: `Deed Resolved: ${payload.deed}`,
          dice: "—",
          total: 0,
          detail: res.alreadyResolved
            ? `Deed ${payload.deed} was already completed earlier; no duplicate progress awarded.`
            : `Deed ${payload.deed} accomplished! Path knowledge increased and world state permanently updated.`,
        });

        return { ok: true, alreadyResolved: res.alreadyResolved };
      }),
    );

    socket.on(
      "site:exit",
      action((_raw: unknown) => {
        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const currentLoc = camp?.party_location_json ? JSON.parse(camp.party_location_json) : { q: 0, r: 0 };
        const isAtHaven = currentLoc.q === 0 && currentLoc.r === 0;

        db.setActiveSite(identity.campaignId, null);
        db.setCampaignPhase(identity.campaignId, isAtHaven ? "sanctuary" : "hexcrawl");

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: "Exited Site to Surface",
          dice: "—",
          total: 0,
          detail: `Party emerged at overworld coordinates (${currentLoc.q}, ${currentLoc.r}). Phase restored to ${isAtHaven ? "sanctuary" : "hexcrawl"}.`,
        });

        return { ok: true, phase: isAtHaven ? "sanctuary" : "hexcrawl" };
      }),
    );

    socket.on(
      "dungeon:generate",
      action((_raw: unknown) => {
        hostOnly();
        const camp = db.db
          .prepare("SELECT active_site_id FROM campaigns WHERE id = ?")
          .get(identity.campaignId) as any;
        const siteId = camp?.active_site_id || undefined;
        const room = generateDungeonRoom();
        db.addRoom(identity.campaignId, room, siteId);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "dungeon",
          label: "Generated next chamber",
          dice: "1d6 + 1d6",
          total: room.contentRoll,
          detail: `${room.geometry}; ${room.contents}${siteId ? ` [Bound to ${siteId}]` : ""}`,
        });
        return { room };
      }),
    );

    // --- Encounter Generator with 50% Monster Variant Coin-Flip ---

    socket.on(
      "encounter:start",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            monsterKey: z.string().min(1),
            count: z.number().int().min(1).max(12),
            forceVariant: z.boolean().optional(),
          })
          .parse(raw);

        const baseMonster = db.getMonster(payload.monsterKey) ?? {
          id: 0,
          monsterKey: payload.monsterKey,
          name: payload.monsterKey,
          currentHp: 10,
          maxHp: 10,
          loreTier: 0,
          ac: 12,
          morale: 7,
          attacks: ["Strike +2 (1d6)"],
          traits: [],
          lore: [],
        };

        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const avgLevel = Math.max(
          1,
          Math.round(
            state.characters.reduce((acc, c) => acc + c.level, 0) /
              Math.max(1, state.characters.length),
          ),
        );

        // 50% variant coin flip (or forceVariant)
        const isVariantRoll = payload.forceVariant ?? rollDie(2) === 1;

        const resolvedMonster: EncounterMonster = isVariantRoll
          ? generateMonsterVariant(baseMonster, avgLevel)
          : { ...baseMonster };

        const monstersList: EncounterMonster[] = Array.from(
          { length: payload.count },
          () => ({ ...resolvedMonster }),
        );

        db.addEncounterWithMonsters(
          identity.campaignId,
          resolvedMonster.name,
          monstersList,
        );

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "encounter",
          label: `${resolvedMonster.name} encountered`,
          dice: isVariantRoll ? "Coin flip (Variant!)" : "Coin flip (Standard)",
          total: payload.count,
          detail: `${payload.count} appearing · ${isVariantRoll ? `Variant Quality: ${resolvedMonster.variantQuality}` : "Standard creature"}`,
        });
      }),
    );

    socket.on(
      "encounter:hp",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            monsterId: z.number().int(),
            delta: z.number().int().min(-999).max(999),
          })
          .parse(raw);
        db.damageEncounterMonster(
          identity.campaignId,
          payload.monsterId,
          payload.delta,
        );
      }),
    );

    socket.on(
      "encounter:lore",
      action((raw: unknown) => {
        const payload = z
          .object({
            monsterId: z.number().int(),
            characterId: z.number().int().nullable().optional(),
            modifier: z.number().int().min(-5).max(10).optional(),
          })
          .parse(raw);
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const characterId =
          identity.role === "player"
            ? identity.characterId
            : payload.characterId;
        const character = state.characters.find(
          (item) => item.id === characterId,
        );
        const modifier = character
          ? abilityModifier(character.abilities.int)
          : (payload.modifier ?? 0);
        const natural = rollDie(20);
        const total = natural + modifier;
        const tier = loreTier(total);
        db.revealMonsterLore(identity.campaignId, payload.monsterId, tier);
        db.addRoll(identity.campaignId, {
          actor: character?.name ?? actor(),
          kind: "lore",
          label: "Monsternomicon lore",
          dice: `1d20${modifier >= 0 ? "+" : ""}${modifier}`,
          total,
          detail: tier ? `Lore tier ${tier} unlocked` : "No new lore unlocked",
        });
        return { total, tier };
      }),
    );

    socket.on(
      "encounter:morale",
      action((raw: unknown) => {
        const payload = z.object({ monsterId: z.number().int() }).parse(raw);
        const row = db.getEncounterMonster(
          identity.campaignId,
          payload.monsterId,
        );
        if (!row) throw new Error("Monster not found");
        const monster = db.getMonster(String(row.monster_key));
        const morale = row.morale != null ? Number(row.morale) : monster?.morale ?? 7;
        const result = moraleRoll(morale);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "morale",
          label: `${row.name ?? monster?.name ?? row.monster_key} morale`,
          dice: "2d6",
          total: result.total,
          detail: result.outcome,
        });
        return { result };
      }),
    );

    socket.on(
      "encounter:resolve",
      action((raw: unknown) => {
        hostOnly();
        const payload = z.object({ encounterId: z.number().int() }).parse(raw);
        db.resolveEncounter(identity.campaignId, payload.encounterId);
      }),
    );

    socket.on(
      "pressure:add",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            name: cleanText.max(100),
            shape: z.enum([
              "countdown",
              "pursuit",
              "race",
              "heat",
              "spread",
              "mystery",
              "opportunity",
              "ladder",
            ]),
            threshold: z.number().int().min(2).max(12),
            consequence: cleanText.max(500),
          })
          .parse(raw);
        db.addPressure(identity.campaignId, payload);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "pressure",
          label: `Campaign pressure: ${payload.name}`,
          dice: "—",
          total: 0,
          detail: `${payload.shape} · ${payload.consequence}`,
        });
      }),
    );

    socket.on(
      "pressure:advance",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            pressureId: z.number().int(),
            delta: z.number().int().min(-1).max(1),
          })
          .parse(raw);
        db.advancePressure(
          identity.campaignId,
          payload.pressureId,
          payload.delta,
        );
      }),
    );

    socket.on(
      "pressure:resolve",
      action((raw: unknown) => {
        hostOnly();
        const payload = z.object({ pressureId: z.number().int() }).parse(raw);
        db.resolvePressure(identity.campaignId, payload.pressureId);
      }),
    );

    socket.on(
      "note:add",
      action((raw: unknown) => {
        const payload = z
          .object({
            section: z.enum(["session", "faction", "discovery"]),
            title: cleanText.max(100),
            body: cleanText.max(4000),
          })
          .parse(raw);
        db.addNote(
          identity.campaignId,
          payload.section,
          payload.title,
          payload.body,
        );
      }),
    );
  });

  if (options.frontend !== false) {
    if (options.devFrontend ?? process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const clientPath = resolve("dist/client");
      app.use(express.static(clientPath));
      app.use((_request, response) =>
        response.sendFile(resolve(clientPath, "index.html")),
      );
    }
  }

  return {
    app,
    io,
    db,
    httpServer,
    port,
    baseUrl,
    listen: () =>
      new Promise<void>((resolveListen) =>
        httpServer.listen(port, "0.0.0.0", resolveListen),
      ),
    close: () =>
      new Promise<void>((resolveClose) =>
        io.close(() => {
          db.close();
          resolveClose();
        }),
      ),
  };
}
