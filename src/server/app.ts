import express from "express";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import QRCode from "qrcode";
import { Server as SocketServer, type Socket } from "socket.io";
import { z } from "zod";
import {
  ANCESTRIES,
  CLASSES,
  MONSTERS,
  THREAT_VECTORS,
} from "../shared/content.js";
import type { Role } from "../shared/types.js";
import { AshDatabase } from "./database.js";
import {
  abilityModifier,
  binaryOracle,
  generateDungeonRoom,
  loreTier,
  moraleRoll,
  reactionRoll,
  rollAbilities,
  rollDice,
  rollDie,
  wildernessWatch,
  type Likelihood,
} from "./rules.js";

const cleanText = z.string().trim().min(1).max(500);
const createCampaignSchema = z.object({
  name: cleanText.max(80),
  regionName: cleanText.max(80),
  pin: z.string().regex(/^\d{4,8}$/),
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
  ancestry: z.enum(ANCESTRIES),
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
      monsters: Object.entries(MONSTERS).map(([key, value]) => ({
        key,
        name: value.name,
      })),
    }),
  );

  app.post("/api/campaigns", (request, response) => {
    const parsed = createCampaignSchema.safeParse(request.body);
    if (!parsed.success)
      return response
        .status(400)
        .json({
          error: "Campaign name, region, and a 4–8 digit PIN are required.",
        });
    const created = db.createCampaign(
      parsed.data.name,
      parsed.data.regionName,
      parsed.data.pin,
    );
    return response
      .status(201)
      .json({
        code: created.code,
        token: created.hostToken,
        role: "host",
        joinUrl: `${baseUrl}/play?code=${created.code}`,
      });
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
          detail: `${input.ancestry} ${input.className} · ${maxHp} HP`,
        });
        return { characterId };
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
      "dungeon:generate",
      action((_raw: unknown) => {
        hostOnly();
        const room = generateDungeonRoom();
        db.addRoom(identity.campaignId, room);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "dungeon",
          label: "Generated next chamber",
          dice: "1d6 + 1d6",
          total: room.contentRoll,
          detail: `${room.geometry}; ${room.contents}`,
        });
        return { room };
      }),
    );

    socket.on(
      "encounter:start",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            monsterKey: z.enum(
              Object.keys(MONSTERS) as [
                keyof typeof MONSTERS,
                ...(keyof typeof MONSTERS)[],
              ],
            ),
            count: z.number().int().min(1).max(12),
          })
          .parse(raw);
        db.addEncounter(identity.campaignId, payload.monsterKey, payload.count);
        const monster = MONSTERS[payload.monsterKey];
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "encounter",
          label: `${monster.name} encountered`,
          dice: "—",
          total: payload.count,
          detail: `${payload.count} appearing; identity only until lore is learned`,
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
        const monster =
          MONSTERS[String(row.monster_key) as keyof typeof MONSTERS];
        const result = moraleRoll(monster.morale);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "morale",
          label: `${monster.name} morale`,
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
      "threat:manifest",
      action((_raw: unknown) => {
        const roll = rollDie(6);
        const index = Math.floor((roll - 1) / 2);
        const [key, name] = THREAT_VECTORS[index];
        db.addThreatShard(identity.campaignId, key);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "threat",
          label: "Threat manifestation",
          dice: "1d6",
          total: roll,
          detail: `${name} gains a Lore Shard`,
        });
        return { roll, key };
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
