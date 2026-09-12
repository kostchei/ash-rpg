import { randomUUID } from "node:crypto";
import { activeSeat, combatSeats, seatIndex, MONSTER_SEAT, projectCombat } from "../shared/table-companion.js";
import { attachSiteObjectives } from "./generators/site-objectives.js";
import { MAX_DEPARTING_PARTY, MIN_DEPARTING_PARTY } from "../shared/content.js";
import { generateSiteLayout } from "./generators/site-layout.js";
import express from "express";
import { mutationPayloadKey, RECEIPTED_ACTIONS } from "../shared/mutations.js";
import { type SliceName, type SlicesUpdate } from "../shared/slices.js";
import { SliceDiffer } from "./slice-diff.js";
import { randomInt } from "node:crypto";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import { resolve } from "node:path";
import QRCode from "qrcode";
import { Server as SocketServer, type Socket } from "socket.io";
import { z } from "zod";
import { ANCESTRIES, CLASSES, ITEMS, SPELLS } from "../shared/content.js";
import { BORDER_PAIRINGS, validateBorderPairing, ZONE_PROFILES } from "../shared/zone-profiles.js";
import type {
  ActivitySession,
  CampaignPhase,
  Combatant,
  CombatState,
  DungeonGraphState,
  EncounterMonster,
  ExpeditionObjective,
  InventoryItem,
  PublicConnectionSummary,
  RegionGenerationConfig,
  RewardRecord,
  Role,
} from "../shared/types.js";
import { AshDatabase } from "./database.js";
import { populateSiteRooms, requireTreasureAccess } from "./room-features.js";
import { materializeHex, materializeNeighborhood } from "./frontier.js";
import { generateCampaignComplication } from "./generators/campaign.js";
import { AQUATIC_METHODS, evaluateAquaticAccess } from "./generators/mind-below.js";
import { generateNpc } from "./generators/npc.js";
import { generateSettlement } from "./generators/settlement.js";
import {
  abilityModifier,
  binaryOracle,
  calculateAttackBonus,
  calculateBackstabBonus,
  calculateCarriedSlots,
  calculateDerivedAc,
  calculateGearSlots,
  calculateTravelWatches,
  computeHpStatus,
  evaluateWatchFatigue,
  generateDungeonRoom,
  generateMonsterVariant,
  getMonsterAcHint,
  isObscuringWeather,
  getEligibleClasses,
  levelUpCharacter,
  loreTier,
  moraleRoll,
  reactionRoll,
  resolveInitiativeRoll,
  resolveSpellCast,
  resolveWildernessNavigation,
  rollAbilities,
  rollClassTalent,
  rollDice,
  rollDie,
  meetsIronManRequirements,
  meetsUnearthedArcanaRequirements,
  rollIronManAbilities,
  rollUnearthedArcanaAbilities,
  wildernessWatch,
  type Likelihood,
} from "./rules.js";
import { RewardService } from "./rewards/service.js";
import { generateUnguardedTreasure } from "./rewards/core-treasure.js";
import { applyXpEvent, calculateAdvancementRequirement } from "./rewards/progression.js";
import { resolveOutcome } from "./paths/outcomes.js";
import { assignActZones } from "./paths/zone-plan.js";
import { OUTER_PATH_IDS } from "../shared/path-encounters.js";
import { PathEncounterService } from "./paths/encounters/service.js";
import { encounterCatalogue } from "./paths/encounters/catalog.js";

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
  pathSelection: z.object({
    mode: z.enum(["explicit", "secret"]).default("explicit"),
    pathId: z.string().optional(),
  }).optional(),
});
const joinSchema = z.object({
  code: z.string().trim().length(6),
  token: z.string().optional(),
});
const hostSchema = z.object({
  code: z.string().trim().length(6),
  pin: z.string().min(4).max(8),
});
const METHOD_LABELS = {
  iron_man: "Iron Man",
  unearthed_arcana: "Unearthed Arcana",
  standard: "3d6 straight",
} as const;

const formatAbilities = (abilities: Record<string, number>) =>
  Object.entries(abilities)
    .map(([key, value]) => `${key.toUpperCase()} ${value}`)
    .join(" · ");

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
  originZoneId: z.string().optional(),
  generationMethod: z.enum(["unearthed_arcana", "iron_man", "standard"]).optional(),
  generationDice: z.record(z.string(), z.array(z.number().int())).optional(),
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

export interface HostAddressResolution {
  address: string;
  interfaceName?: string;
}

export interface HostInterfaceCandidate {
  name: string;
  address: string;
  isVirtual: boolean;
  isWifi: boolean;
  isEthernet: boolean;
  priority: number;
}

const VIRTUAL_INTERFACE_REGEX = /(vethernet|wsl|docker|tailscale|virbr|vbox|vmnet|loopback|dummy|hyper-v|bridge|tap|tun|bluetooth|isatap|teredo)/i;
const WIFI_INTERFACE_REGEX = /(wi-?fi|wlan|wireless|airport|sans fil|inal[aá]mbric)/i;
const ETHERNET_INTERFACE_REGEX = /(ethernet|eth|en\d|lan)/i;

export function listAvailableHostInterfaces(
  interfacesProvider: () => NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces,
): HostInterfaceCandidate[] {
  const interfaces = interfacesProvider();
  const candidates: HostInterfaceCandidate[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs || !name) continue;
    const isVirtual = VIRTUAL_INTERFACE_REGEX.test(name);
    const isWifi = WIFI_INTERFACE_REGEX.test(name);
    const isEthernet = ETHERNET_INTERFACE_REGEX.test(name);

    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      // Skip APIPA (169.254.x.x) and loopback addresses
      if (addr.address.startsWith("169.254.") || addr.address.startsWith("127.")) continue;

      let priority = 50;
      if (isVirtual) {
        priority = 1; // strongly deprioritize virtual switches/adapters
      } else if (isWifi) {
        priority = 100; // prioritize Wi-Fi for mobile phones at the table
      } else if (isEthernet) {
        priority = 80; // wired LAN
      }

      // Prioritize common local home router subnets over 172.x virtual networks
      if (addr.address.startsWith("192.168.")) {
        priority += 10;
      } else if (addr.address.startsWith("10.")) {
        priority += 5;
      }

      candidates.push({
        name,
        address: addr.address,
        isVirtual,
        isWifi,
        isEthernet,
        priority,
      });
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates;
}

export function resolveHostAddress(
  preferredIp?: string,
  interfacesProvider: () => NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces,
): HostAddressResolution {
  const explicitIp = preferredIp || process.env.HOST_IP || process.env.ASH_HOST;
  if (explicitIp) {
    return { address: explicitIp.trim(), interfaceName: "manual override" };
  }

  const candidates = listAvailableHostInterfaces(interfacesProvider);
  if (candidates.length > 0) {
    return { address: candidates[0].address, interfaceName: candidates[0].name };
  }

  return { address: "localhost", interfaceName: "loopback" };
}

function localAddress(preferredIp?: string) {
  return resolveHostAddress(preferredIp).address;
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
  hostIp?: string;
}

export async function createAshServer(options: AshServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const db = new AshDatabase(
    options.dbPath ?? resolve("data/local/ash.sqlite"),
  );
  const app = express();
  const pathEncounters = new PathEncounterService(db);
  const httpServer: HttpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
  });
  const resolvedHost = resolveHostAddress(options.hostIp);
  const baseUrl = `http://${resolvedHost.address}:${port}`;

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
        parsed.data.pathSelection,
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

  app.get("/api/network/interfaces", (_request, response) => {
    return response.json({
      current: resolvedHost,
      port,
      baseUrl,
      interfaces: listAvailableHostInterfaces(),
    });
  });

  app.get("/api/campaigns/:code/qr", async (request, response) => {
    const campaign = db.getCampaign(request.params.code.toUpperCase());
    if (!campaign) return response.status(404).end();
    const queryHost = typeof request.query.host === "string" ? request.query.host : undefined;
    const queryIp = typeof request.query.ip === "string" ? request.query.ip : undefined;
    const targetBaseUrl = queryHost
      ? (queryHost.startsWith("http") ? queryHost : `http://${queryHost}`)
      : queryIp
        ? `http://${queryIp}:${port}`
        : baseUrl;
    response.type("png");
    return response.send(
      await QRCode.toBuffer(`${targetBaseUrl}/play?code=${String(campaign.code)}`, {
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

  const metrics = {
    broadcastCount: 0,
    projectionsComputed: 0,
    lastBroadcastBytes: 0,
  };

  db.onRollAdded = (campaignId, roll) => {
    io.to(`campaign:${campaignId}`).emit("roll:appended", roll);
  };
  db.onNoteAdded = (campaignId, note) => {
    io.to(`campaign:${campaignId}`).emit("note:appended", note);
  };

  const differs = new Map<number, SliceDiffer>();
  function differFor(campaignId: number): SliceDiffer {
    let differ = differs.get(campaignId);
    if (!differ) {
      differ = new SliceDiffer();
      differs.set(campaignId, differ);
    }
    return differ;
  }

  async function broadcast(campaignId: number) {
    metrics.broadcastCount++;
    const room = `campaign:${campaignId}`;
    const sockets = await io.in(room).fetchSockets();
    if (sockets.length === 0) return;

    const rolesPresent = new Set<Role>();
    for (const socket of sockets) {
      rolesPresent.add((socket.data.identity as Identity).role);
    }

    const joinCode = (sockets[0].data.identity as Identity).code;
    const joinUrl = `${baseUrl}/play?code=${joinCode}`;
    const differ = differFor(campaignId);

    // One projection per role, not one per socket.
    const updateByRole = new Map<Role, SlicesUpdate>();
    const changedSliceNames = new Set<SliceName>();
    for (const role of rolesPresent) {
      metrics.projectionsComputed++;
      const projection = db.getSlicedState(campaignId, role, null, joinUrl);
      const { slices, entityDeltas, changed } = differ.diff(role, projection);
      for (const name of changed) changedSliceNames.add(name);
      updateByRole.set(role, {
        campaignRevision: projection.campaignRevision,
        slices,
        ...(Object.keys(entityDeltas).length > 0 ? { entityDeltas } : {}),
      });
    }

    const sliceRevisions = db.touchSlices(campaignId, [...changedSliceNames]);
    const callerToken = db.getCallerToken(campaignId);

    for (const socket of sockets) {
      const identity = socket.data.identity as Identity;
      const refreshed = db.authenticate(
        identity.code,
        identity.role,
        identity.token,
      );
      if (!refreshed) continue;
      identity.characterId = refreshed.characterId;

      const roleUpdate = updateByRole.get(identity.role);
      if (!roleUpdate) throw new Error(`No projection built for role ${identity.role}`);

      // `me` is per-socket rather than per-role, so it cannot use the role cache
      // above. It is also near-constant, so it is diffed against what this socket
      // was last sent and omitted when unchanged.
      const me = db.getIdentityState(
        campaignId,
        identity.role,
        identity.characterId,
        identity.token,
        callerToken,
      );
      const encodedMe = JSON.stringify(me);
      const meChanged = socket.data.lastMe !== encodedMe;
      socket.data.lastMe = encodedMe;

      const socketPayload: SlicesUpdate = {
        ...roleUpdate,
        slices: {
          ...roleUpdate.slices,
          ...(meChanged ? { me } : {}),
        },
        sliceRevisions,
      };

      metrics.lastBroadcastBytes = Buffer.byteLength(JSON.stringify(socketPayload), "utf8");
      socket.emit("state", socketPayload);
    }
  }

  io.on("connection", (socket: Socket) => {
    const identity = socket.data.identity as Identity;
    socket.join(`campaign:${identity.campaignId}`);
    const initialSnapshot = db.getSlicedState(
      identity.campaignId,
      identity.role,
      identity.characterId,
      `${baseUrl}/play?code=${identity.code}`,
      identity.token,
      { isInitial: true },
    );
    differFor(identity.campaignId).prime(identity.role, initialSnapshot);
    socket.data.lastMe = JSON.stringify(initialSnapshot.slices.me);
    socket.emit("state", initialSnapshot);

    socket.on("rolls:page", (raw: unknown, ack?: Ack) => {
      try {
        const payload = z.object({
          beforeId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        }).parse(raw ?? {});
        const rolls = db.getRollsPage(identity.campaignId, payload);
        ack?.({ ok: true, rolls });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "Failed to load rolls" });
      }
    });

    socket.on("notes:page", (raw: unknown, ack?: Ack) => {
      try {
        const payload = z.object({
          beforeId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        }).parse(raw ?? {});
        const notes = db.getWikiNotesPage(identity.campaignId, payload);
        ack?.({ ok: true, notes });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "Failed to load notes" });
      }
    });

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
          const visibleResult = result && "graph" in result
            ? { ...result, graph: db.getState(identity.campaignId, identity.role,
                identity.characterId, "", identity.token).activeDungeon }
            : result;
          const safeResult = visibleResult ? { ...visibleResult } : {};
          if ("combat" in safeResult) safeResult.combat = projectCombat(db.getCombatState(identity.campaignId, (safeResult.combat as CombatState | undefined)?.encounterId));
          if ("room" in safeResult && "graph" in safeResult) {
            const roomId = (safeResult.room as { id?: number } | undefined)?.id;
            safeResult.room = (safeResult.graph as DungeonGraphState | null)?.nodes.find(n => n.id === roomId);
          }
          ack?.({ ok: true, ...safeResult });
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
    const callerOrHostOnly = () => {
      if (identity.role === "host") return;
      const callerToken = db.getCallerToken(identity.campaignId);
      if (callerToken && callerToken === identity.token) return;
      throw new Error("Only the designated Caller or Table Host can commit this action");
    };
    // Synchronous handlers commit state, log, and receipt together, before broadcast.
    const mutationAction = (
      event: string,
      handler: (payload: unknown) => Record<string, unknown>,
      options: { auth?: "callerOrHost" | "none" } = {},
    ) => action((raw: unknown) => {
      if (options.auth !== "none") {
        callerOrHostOnly();
      }
      if (!RECEIPTED_ACTIONS.has(event)) throw new Error("Unknown mutation action");
      const envelope = z.object({
        actionId: z.string().min(1).max(160),
        expectedRevision: z.number().int().nonnegative(),
      }).parse(raw);
      const payloadKey = mutationPayloadKey(raw as Record<string, unknown>);
      const receipt = db.executeMutation(
        identity.campaignId, identity.token, `${event}:${envelope.actionId}`,
        envelope.expectedRevision, () => ({ payloadKey, outcome: handler(raw) }),
      );
      if (receipt.result.payloadKey !== payloadKey) {
        throw new Error("Action ID was already used for a different request");
      }
      const result = { ...receipt.result.outcome, revision: receipt.revision };
      // Stored outcomes can contain private generation details.
      if ("graph" in result) {
        return { ...result, graph: db.getState(identity.campaignId,
          identity.role, identity.characterId, "", identity.token).activeDungeon };
      }
      return result;
    });
    /**
     * The tavern is the only checkpoint on party size: six including retainers. Once
     * you are out there, rescued companions join regardless — that is how they, and
     * often you, get home.
     */
    const requireDepartingPartySize = (from: { q: number; r: number; layerId?: string }) => {
      const state = db.getState(identity.campaignId, "host", null, "");
      const home = state.campaign.homeLocation ?? { q: 0, r: 0, layerId: "surface" };
      const atHaven = from.q === home.q && from.r === home.r &&
        (from.layerId ?? "surface") === (home.layerId ?? "surface");
      if (!atHaven) return;
      const active = state.characters.filter((c) => c.rosterStatus !== "reserve").length;
      if (active < MIN_DEPARTING_PARTY) {
        throw new Error(
          `A party leaving the haven must number at least ${MIN_DEPARTING_PARTY}, retainers included — muster someone else first`,
        );
      }
      if (active > MAX_DEPARTING_PARTY) {
        throw new Error(
          `A party leaving the haven may number at most ${MAX_DEPARTING_PARTY}, retainers included — move someone to the reserve roster first`,
        );
      }
    };
    const requireHaven = () => {
      const state = db.getState(identity.campaignId, "host", null, "");
      const loc = state.campaign.partyLocation;
      const home = state.campaign.homeLocation ?? { q: 0, r: 0, layerId: "surface" };
      if (!loc || loc.q !== home.q || loc.r !== home.r ||
          (loc.layerId ?? "surface") !== (home.layerId ?? "surface") || state.campaign.activeSiteId) {
        throw new Error("Travel back to the haven on the surface before sanctuary recovery.");
      }
      if (state.activeCombat?.status === "active" ||
          state.encounters.some((encounter) => encounter.status === "active")) {
        throw new Error("Resolve the active encounter before sanctuary recovery.");
      }
    };
    const requireEncounterResolved = () => {
      const state = db.getState(identity.campaignId, "host", null, "");
      if (state.activeCombat?.status === "active" || state.encounters.some((encounter) => encounter.status === "active")) {
        throw new Error("Resolve or evade the current encounter before continuing the journey");
      }
    };
    const actor = () =>
      actorName(db, identity, `${baseUrl}/play?code=${identity.code}`);

    socket.on("path_encounters:read", (_raw: unknown, ack?: Ack) => {
      // Read-only: do not broadcast or mutate campaign revision just to refresh a panel.
      ack?.({ ok: true, pack: pathEncounters.view(identity.campaignId),
        catalogue: identity.role === "host" ? encounterCatalogue() : [] });
    });
    socket.on("path_encounters:start", mutationAction("path_encounters:start", (raw: unknown) => {
      hostOnly();
      const payload = z.object({ pathId: z.enum(OUTER_PATH_IDS) }).parse(raw);
      return { pack: pathEncounters.start(identity.campaignId, payload.pathId) };
    }));
    socket.on("path_encounters:arrive", mutationAction("path_encounters:arrive", (raw: unknown) => {
      requireEncounterResolved();
      const payload = z.object({ siteId: cleanText, notes: cleanText }).parse(raw);
      return { pack: pathEncounters.update(identity.campaignId, { kind: "arrive", ...payload }) };
    }));
    socket.on("path_encounters:interact", mutationAction("path_encounters:interact", (raw: unknown) => {
      const payload = z.object({ interactionId: cleanText, outcome: z.enum(["success", "failure"]),
        notes: z.string().trim().max(500).default("") }).parse(raw);
      return { pack: pathEncounters.update(identity.campaignId, { kind: "interact", ...payload }) };
    }));

    socket.on(
      "campaign:set_caller",
      action((raw: unknown) => {
        const payload = z.object({ callerToken: z.string().nullable() }).parse(raw);
        const currentCaller = db.getCallerToken(identity.campaignId);

        if (identity.role !== "host") {
          // Player authority: can claim if unassigned or re-claim self, or release own caller
          if (payload.callerToken === identity.token) {
            if (currentCaller && currentCaller !== identity.token) {
              throw new Error("Another player is currently designated as Caller");
            }
          } else if (payload.callerToken === null) {
            if (currentCaller !== identity.token) {
              throw new Error("You can only release caller if you are the current caller");
            }
          } else {
            throw new Error("Only the Table Host can reassign Caller to another player");
          }
        }

        db.setCallerToken(identity.campaignId, payload.callerToken);
        const state = db.getState(identity.campaignId, "host", null, "");
        const callerChar = state.characters.find((c) => c.ownerToken === payload.callerToken);
        const callerName = callerChar ? callerChar.name : payload.callerToken ? "Party Member" : "Table Host";

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "campaign",
          label: payload.callerToken ? "Caller Designated" : "Host Caller Override",
          dice: "—",
          total: 0,
          detail: payload.callerToken
            ? `${callerName} is designated as party Caller.`
            : "Table Host took direct authority (Caller override / revoked).",
        });

        return { callerToken: payload.callerToken, callerName };
      }),
    );

    socket.on(
      "host:correct",
      action((raw: unknown) => {
        hostOnly();
        const payload = z
          .object({
            characterId: z.number().optional(),
            hp: z.number().optional(),
            rations: z.number().optional(),
            day: z.number().optional(),
            watch: z.number().min(1).max(4).optional(),
            weather: z.string().optional(),
            note: z.string().optional(),
          })
          .parse(raw);

        if (payload.characterId !== undefined && payload.hp !== undefined) {
          db.updateCharacterHp(identity.campaignId, payload.characterId, payload.hp);
        }
        if (
          payload.rations !== undefined ||
          payload.day !== undefined ||
          payload.watch !== undefined ||
          payload.weather !== undefined
        ) {
          const updates: string[] = [];
          const values: any[] = [];
          if (payload.rations !== undefined) {
            updates.push("rations = ?");
            values.push(payload.rations);
          }
          if (payload.day !== undefined) {
            updates.push("day = ?");
            values.push(payload.day);
          }
          if (payload.watch !== undefined) {
            updates.push("watch = ?");
            values.push(payload.watch);
          }
          if (payload.weather !== undefined) {
            updates.push("weather = ?");
            values.push(payload.weather);
          }
          if (updates.length > 0) {
            values.push(identity.campaignId);
            db.db
              .prepare(`UPDATE campaigns SET ${updates.join(", ")}, revision = revision + 1 WHERE id = ?`)
              .run(...values);
          }
        }
        if (payload.note) {
          db.addRoll(identity.campaignId, {
            actor: "Host",
            kind: "correction",
            label: "Host Adjudication",
            dice: "—",
            total: 0,
            detail: payload.note,
          });
        }
      }),
    );

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
        requireHaven();
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
      action((raw: unknown) => {
        const payload = (raw && typeof raw === "object") ? (raw as { existingTavern?: { name: string; vibe: string } }) : {};
        const row = db.db.prepare("SELECT tavern_establishment_json FROM campaigns WHERE id = ?").get(identity.campaignId) as { tavern_establishment_json?: string } | undefined;
        let tavernObj: any = null;
        if (row?.tavern_establishment_json) {
          try {
            tavernObj = JSON.parse(row.tavern_establishment_json);
          } catch {}
        }
        let existingTavern = payload.existingTavern;
        if (!existingTavern && tavernObj?.name) {
          existingTavern = { name: tavernObj.name, vibe: tavernObj.vibe ?? "" };
        }
        const result = generateSettlement(undefined, existingTavern);
        if (tavernObj) {
          tavernObj.settlement = result;
          db.db.prepare("UPDATE campaigns SET tavern_establishment_json = ? WHERE id = ?").run(JSON.stringify(tavernObj), identity.campaignId);
        }
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "settlement",
          label: `Settlement: ${result.scale.name}`,
          dice: existingTavern ? "1d6 + 1d8" : "1d6 + 2d10 + 1d8",
          total: 0,
          detail: `${result.scale.name} · Pop: ${result.scale.population} · Defenses: ${result.scale.defense} · Rumor: "${result.rumor.rumor}"`,
        });
        return { result };
      }),
    );

    socket.on(
      "npc:generate",
      action((raw: unknown) => {
        const payload = z
          .object({ zoneId: z.string().optional(), classed: z.boolean().optional() })
          .optional()
          .parse(raw);
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );
        const zoneId = payload?.zoneId ?? state.campaign.activeZoneId ?? "the_gloaming";
        const result = generateNpc(state.characters, zoneId, undefined, {
          classed: payload?.classed === true,
        });
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "npc",
          label: `${payload?.classed ? "Dungeon NPC" : "Retainer"}: ${result.ancestry} ${result.className}`,
          dice: "1d100 + 1d12 + 1d12",
          total: result.retainerStats.level,
          detail: `${result.demeanor} (${result.quirk}) · Motive: ${result.motive} · ${METHOD_LABELS[result.abilityMethod]}: ${formatAbilities(result.abilities)}`,
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
            abilities: abilitySchema,
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
          abilities: payload.abilities,
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
      mutationAction("party:rest", (_raw: unknown) => {
        requireHaven();
        const state = db.getState(
          identity.campaignId,
          identity.role,
          identity.characterId,
          "",
        );

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

        return { rested: true };
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
      "character:roll-ua",
      action((raw: unknown) => {
        const payload = z.object({ className: z.string() }).parse(raw);
        const result = rollUnearthedArcanaAbilities(payload.className);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "character",
          label: `Unearthed Arcana abilities (${payload.className})`,
          dice: "8d6/7d6/6d6/5d6/4d6/3d6 keep 3, class order",
          total: Math.max(...Object.values(result.scores)),
          detail: Object.entries(result.scores)
            .map(([k, v]) => `${k.toUpperCase()} ${v}`)
            .join(" · "),
        });
        return result;
      }),
    );

    socket.on(
      "character:roll-ironman",
      action((_raw: unknown) => {
        const result = rollIronManAbilities();
        const eligibleClasses = getEligibleClasses(result.scores);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "character",
          label: "Iron Man abilities (3d6 in order)",
          dice: "6 × 3d6 in order",
          total: Math.max(...Object.values(result.scores)),
          detail: `${Object.entries(result.scores).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(" · ")} | Eligible: ${eligibleClasses.join(", ")}`,
        });
        return { ...result, eligibleClasses };
      }),
    );

    socket.on(
      "character:create",
      action((raw: unknown) => {
        const input = characterSchema.parse(raw);
        if (identity.role === "player") {
          if (
            input.generationMethod !== "iron_man" &&
            input.generationMethod !== "unearthed_arcana"
          ) {
            throw new Error(
              "Players must roll with the Iron Man or Unearthed Arcana method",
            );
          }
        }
          // One existing UA hero per owner; host-created heroes have no owner token.
          if (input.generationMethod === "unearthed_arcana") {
            const owned = db.db
              .prepare(
                "SELECT COUNT(*) as c FROM characters WHERE campaign_id = ? AND owner_token IS ? AND generation_method = 'unearthed_arcana'",
              )
              .get(identity.campaignId, identity.role === "player" ? identity.token : null) as { c: number };
            if (owned.c >= 1) {
              throw new Error(
                "This player already owns their one Unearthed Arcana character for this campaign",
              );
            }
          }
        if (input.generationMethod === "iron_man") {
          if (!meetsIronManRequirements(input.abilities)) {
            throw new Error("These ability scores do not meet the Iron Man requirements");
          }
          const eligible = getEligibleClasses(input.abilities);
          if (!eligible.includes(input.className)) {
            throw new Error("Chosen class is not eligible for these Iron Man ability scores");
          }
        }
        if (
          input.generationMethod === "unearthed_arcana" &&
          !meetsUnearthedArcanaRequirements(input.abilities)
        ) {
          throw new Error(
            "These ability scores do not meet the Unearthed Arcana requirements",
          );
        }

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
            gold: 10 + rollDie(6) + rollDie(6),
            gearSlots: 10 + strMod + (input.ancestry === "Half-Ogre" ? 4 : 0),
            talents: [`[Lvl 1] ${level1Talent.effect}`],
            xp: 0,
          },
        );
        if (identity.role === "player" && !identity.characterId) {
          identity.characterId = characterId;
        }
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

    socket.on("character:delete", action((raw: unknown) => {
      const { characterId } = z.object({ characterId: z.number().int() }).parse(raw);
      const character = db.db.prepare("SELECT owner_token FROM characters WHERE campaign_id = ? AND id = ?")
        .get(identity.campaignId, characterId) as { owner_token: string | null } | undefined;
      if (!character) throw new Error("Character not found");
      if (identity.role !== "host" && character.owner_token !== identity.token) {
        throw new Error("You can only delete your own characters");
      }
      const combat = db.getCombatState(identity.campaignId);
      if (combat?.combatants.some(c => c.kind === "pc" && c.refId === characterId)) {
        throw new Error("End the character's combat before deleting them");
      }
      db.db.transaction(() => {
        db.db.prepare("UPDATE devices SET character_id = NULL, ready = 0 WHERE campaign_id = ? AND character_id = ?")
          .run(identity.campaignId, characterId);
        db.db.prepare("DELETE FROM characters WHERE campaign_id = ? AND id = ?").run(identity.campaignId, characterId);
      })();
      if (identity.characterId === characterId) identity.characterId = null;
      return { characterId };
    }));

    socket.on(
      "party:muster",
      action((raw: unknown) => {
        // The party adjustment stage before setting off. No GM approves it; the table's
        // caller speaks for the group.
        callerOrHostOnly();
        const payload = z.object({
          // The readable cap error comes from the roster rule, not the schema.
          characterIds: z.array(z.number().int()).min(1).max(50),
        }).parse(raw);
        const result = db.setPartyRoster(
          identity.campaignId,
          payload.characterIds,
          MIN_DEPARTING_PARTY,
          MAX_DEPARTING_PARTY,
        );
        const state = db.getState(identity.campaignId, "host", null, "");
        const marching = state.characters.filter((c) => result.active.includes(c.id));
        const bound = db.db
          .prepare("SELECT character_id FROM devices WHERE token = ? AND campaign_id = ?")
          .get(identity.token, identity.campaignId) as { character_id: number | null } | undefined;
        identity.characterId = bound?.character_id ?? null;
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "character",
          label: `Marching party set (${marching.length}/${MAX_DEPARTING_PARTY})`,
          dice: "Party adjustment",
          total: marching.length,
          detail: marching.map((c) => `${c.name} (${c.className})`).join(" · "),
        });
        return result;
      }),
    );

    socket.on(
      "roster:select_active",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int() }).parse(raw);
        const result = db.swapActiveCharacter(identity.campaignId, identity.token, payload.characterId);
        identity.characterId = result.characterId;
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "character",
          label: "Active Adventurer Selected",
          dice: "Roster swap",
          total: payload.characterId,
          detail: "Swapped active duty character in haven sanctuary",
        });
        return result;
      }),
    );

    socket.on(
      "table:ready",
      action((raw: unknown) => {
        const payload = z.object({ ready: z.boolean() }).parse(raw);
        db.setDeviceReady(identity.campaignId, identity.token, payload.ready);
        return { ready: payload.ready };
      }),
    );

    socket.on(
      "campaign:start",
      action((_raw: unknown) => {
        if (identity.role !== "host") throw new Error("Only the table host can start the campaign");
        const result = db.startCampaign(identity.campaignId);
        if (!result.alreadyStarted) {
          db.addRoll(identity.campaignId, {
            actor: "Table Host",
            kind: "character",
            label: "Campaign Started",
            dice: "Commencement",
            total: 1,
            detail: "The table readiness check is complete. The company ventures forth.",
          });
        }
        return result;
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

        const requiredXp = calculateAdvancementRequirement(character.level);
        if ((character.xp ?? 0) < requiredXp) {
          throw new Error(`Not enough XP to level up (${character.xp ?? 0}/${requiredXp})`);
        }

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

    socket.on("character:spell_available", action((raw: unknown) => {
      const payload = z.object({ characterId: z.number().int(), spellId: z.string(), available: z.boolean() }).parse(raw);
      if (identity.role !== "host" && payload.characterId !== identity.characterId) throw new Error("Only change your own spell ledger");
      const character = db.getState(identity.campaignId, "host", null, "").characters.find(c => c.id === payload.characterId);
      const spell = character?.spells?.find(s => s.spellId === payload.spellId);
      if (!character || !spell) throw new Error("Known spell not found");
      if (payload.available && spell.penanceRequired) throw new Error("Resolve penance before restoring this spell");
      spell.available = payload.available;
      db.updateCharacter(identity.campaignId, character);
    }));

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

    // --- Inventory & Equipment Management ---

    socket.on(
      "inventory:equip",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int(), instanceId: z.string() }).parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only manage your own inventory");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const inv = [...(character.inventory ?? [])];
        const itemIndex = inv.findIndex((i) => i.instanceId === payload.instanceId);
        if (itemIndex === -1) throw new Error("Item not found in inventory");

        const item = inv[itemIndex];
        const itemDef = ITEMS.find((it) => it.id === item.itemId);
        const kind = item.kind || itemDef?.kind;

        if (kind === "armor") {
          for (let i = 0; i < inv.length; i++) {
            if (inv[i].kind === "armor" || ITEMS.find((it) => it.id === inv[i].itemId)?.kind === "armor") {
              inv[i] = { ...inv[i], equipped: false };
            }
          }
        }
        if (kind === "shield") {
          for (let i = 0; i < inv.length; i++) {
            if (inv[i].kind === "shield" || ITEMS.find((it) => it.id === inv[i].itemId)?.kind === "shield") {
              inv[i] = { ...inv[i], equipped: false };
            }
          }
        }

        inv[itemIndex] = { ...item, equipped: true };
        const { ac } = calculateDerivedAc(inv, abilityModifier(character.abilities.dex));
        db.updateCharacter(identity.campaignId, { ...character, inventory: inv, ac });
      }),
    );

    socket.on(
      "inventory:unequip",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int(), instanceId: z.string() }).parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only manage your own inventory");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const inv = [...(character.inventory ?? [])];
        const itemIndex = inv.findIndex((i) => i.instanceId === payload.instanceId);
        if (itemIndex === -1) throw new Error("Item not found in inventory");

        inv[itemIndex] = { ...inv[itemIndex], equipped: false };
        const { ac } = calculateDerivedAc(inv, abilityModifier(character.abilities.dex));
        db.updateCharacter(identity.campaignId, { ...character, inventory: inv, ac });
      }),
    );

    socket.on(
      "inventory:drop",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int(), instanceId: z.string() }).parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only manage your own inventory");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const inv = (character.inventory ?? []).filter((i) => i.instanceId !== payload.instanceId);
        const { ac } = calculateDerivedAc(inv, abilityModifier(character.abilities.dex));
        db.updateCharacter(identity.campaignId, { ...character, inventory: inv, ac });
      }),
    );

    socket.on(
      "inventory:add",
      action((raw: unknown) => {
        const payload = z
          .object({
            characterId: z.number().int(),
            itemId: z.string().min(1),
            quantity: z.number().int().min(1).default(1),
          })
          .parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only add items to your own inventory");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const itemDef = ITEMS.find((it) => it.id === payload.itemId);
        const newItem = {
          instanceId: randomInt(100000, 999999).toString(),
          itemId: payload.itemId,
          name: itemDef?.name ?? payload.itemId,
          kind: itemDef?.kind ?? "gear",
          slots: itemDef?.slots ?? 1,
          equipped: false,
          quantity: payload.quantity,
          damage: itemDef?.damage,
          properties: itemDef?.properties,
          baseAc: itemDef?.baseAc,
          acBonus: itemDef?.acBonus,
          maxDexMod: itemDef?.maxDexMod,
        };

        const inv = [...(character.inventory ?? []), newItem];
        db.updateCharacter(identity.campaignId, { ...character, inventory: inv });
      }),
    );

    // --- Dual-Mode Contextual Rolls ---

    socket.on(
      "roll:contextual",
      action((raw: unknown) => {
        const rawObj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
        let rawType = rawObj.checkType ?? rawObj.type ?? "ability";
        if (rawType === "check") rawType = "ability";
        if (rawType === "spell") rawType = "spellcast";
        if (rawType === "attack") rawType = "melee_attack";

        const normalized = {
          ...rawObj,
          checkType: rawType,
          diceMode: rawObj.diceMode ?? rawObj.mode ?? "digital",
          advantageMode: rawObj.advantageMode ?? rawObj.advantage ?? "normal",
          physicalRolls:
            rawObj.physicalRolls ??
            (typeof rawObj.physicalValue === "number"
              ? [rawObj.physicalValue]
              : typeof rawObj.physicalRoll === "number"
                ? [rawObj.physicalRoll]
                : undefined),
        };

        const payload = z
          .object({
            characterId: z.number().int().optional(),
            checkType: z.enum([
              "ability",
              "save",
              "melee_attack",
              "ranged_attack",
              "damage",
              "spellcast",
              "backstab",
              "turn_undead",
              "custom",
            ]),
            ability: z.enum(["str", "dex", "con", "int", "wis", "cha"]).optional(),
            dc: z.number().optional(),
            advantageMode: z.enum(["normal", "advantage", "disadvantage"]).default("normal"),
            diceMode: z.enum(["digital", "physical"]).default("digital"),
            physicalRolls: z.array(z.number().int()).optional(),
            spellId: z.string().optional(),
            damageDice: z.string().optional(),
            weaponItemId: z.string().optional(),
            label: z.string().optional(),
          })
          .parse(normalized);

        const charId = payload.characterId ?? identity.characterId;
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = charId ? state.characters.find((c) => c.id === charId) : undefined;
        const actorNameStr = character ? character.name : actor();

        let rolls: number[] = [];
        let d20Result = 0;
        let modifier = 0;
        let total = 0;
        let label = payload.label || payload.checkType.toUpperCase();
        let diceExpr = "1d20";
        let detail = "";

        if (
          ["ability", "save", "melee_attack", "ranged_attack", "spellcast", "backstab", "turn_undead", "custom"].includes(
            payload.checkType,
          )
        ) {
          if (payload.diceMode === "physical" && payload.physicalRolls && payload.physicalRolls.length > 0) {
            rolls = payload.physicalRolls;
          } else {
            const count = payload.advantageMode === "normal" ? 1 : 2;
            rolls = Array.from({ length: count }, () => rollDie(20));
          }

          if (payload.advantageMode === "advantage") {
            d20Result = Math.max(...rolls);
            diceExpr = `2d20 (adv) [${rolls.join(", ")}]`;
          } else if (payload.advantageMode === "disadvantage") {
            d20Result = Math.min(...rolls);
            diceExpr = `2d20 (disadv) [${rolls.join(", ")}]`;
          } else {
            d20Result = rolls[0];
            diceExpr = `1d20 [${d20Result}]`;
          }
        }

        if (payload.checkType === "ability" || payload.checkType === "save") {
          const ab = payload.ability || "str";
          modifier = character ? abilityModifier(character.abilities[ab]) : 0;
          total = d20Result + modifier;
          label = `${actorNameStr}: ${ab.toUpperCase()} ${payload.checkType === "save" ? "Save" : "Check"}`;
          detail = `${payload.diceMode === "physical" ? "(Physical) " : ""}${d20Result} + ${modifier} = ${total}`;
          if (payload.dc !== undefined) {
            detail += total >= payload.dc ? ` (DC ${payload.dc} Success)` : ` (DC ${payload.dc} Failure)`;
          }
        } else if (payload.checkType === "melee_attack" || payload.checkType === "ranged_attack") {
          const weapon = character?.inventory?.find((i) => i.itemId === payload.weaponItemId || i.equipped);
          const attackData =
            character && weapon
              ? calculateAttackBonus(character, weapon)
              : {
                  attackBonus: character
                    ? abilityModifier(
                        payload.checkType === "melee_attack" ? character.abilities.str : character.abilities.dex,
                      )
                    : 0,
                  damageBonus: 0,
                  damageDie: "1d6",
                };

          modifier = attackData.attackBonus;
          total = d20Result + modifier;
          const isNat20 = d20Result === 20;
          const isNat1 = d20Result === 1;
          label = `${actorNameStr}: ${payload.checkType === "melee_attack" ? "Melee" : "Ranged"} Attack (${weapon?.name ?? "Weapon"})`;
          detail = `${payload.diceMode === "physical" ? "(Physical) " : ""}${d20Result} + ${modifier} = ${total}${
            isNat20 ? " [CRITICAL HIT!]" : isNat1 ? " [CRITICAL MISS!]" : ""
          }`;
        } else if (payload.checkType === "backstab") {
          const dexMod = character ? abilityModifier(character.abilities.dex) : 0;
          modifier = dexMod + 2;
          total = d20Result + modifier;
          const backstabBonus = calculateBackstabBonus(character?.level ?? 1);
          label = `${actorNameStr}: Backstab Attack`;
          detail = `${payload.diceMode === "physical" ? "(Physical) " : ""}${d20Result} + ${modifier} = ${total}. Bonus damage on hit: ${backstabBonus.expression}`;
        } else if (payload.checkType === "damage") {
          const expr = payload.damageDice || "1d6";
          if (payload.diceMode === "physical" && payload.physicalRolls && payload.physicalRolls.length > 0) {
            const sum = payload.physicalRolls.reduce((a, b) => a + b, 0);
            total = sum;
            diceExpr = `${expr} (physical)`;
            detail = `Physical roll: [${payload.physicalRolls.join(", ")}] = ${total}`;
          } else {
            const rolled = rollDice(expr);
            total = rolled.total;
            diceExpr = expr;
            detail = `Rolled [${rolled.rolls.join(", ")}]${rolled.modifier ? ` + ${rolled.modifier}` : ""} = ${total}`;
          }
          label = `${actorNameStr}: Damage Roll`;
        } else if (payload.checkType === "spellcast") {
          const spell = SPELLS.find((s) => s.id === payload.spellId) ?? {
            id: "spell",
            name: "Spell",
            tier: 1,
            sphere: "arcane" as const,
            range: "near" as const,
            duration: "instant",
            description: "",
          };
          const result = resolveSpellCast(
            {
              className: character?.className ?? "Wizard",
              abilities: { int: character?.abilities.int ?? 10, wis: character?.abilities.wis ?? 10 },
            },
            spell,
            d20Result,
          );
          total = result.total;
          modifier = result.total - d20Result;
          label = `${actorNameStr}: Cast ${spell.name} (Tier ${spell.tier})`;
          detail = `${payload.diceMode === "physical" ? "(Physical) " : ""}Roll ${d20Result} + ${modifier} = ${total} vs DC ${result.dc}. ${
            result.success ? "CAST SUCCESSFUL!" : "SPELL LOST UNTIL REST."
          }`;
          if (result.mishap) {
            detail += ` [ARCANE MISHAP: ${result.mishap}]`;
          }
          if (result.penanceRequired) {
            detail += ` [DIVINE PENANCE REQUIRED: Spell locked until penance.]`;
          }

          if (character && (!result.success || result.penanceRequired)) {
            const spells = (character.spells ?? []).map((s) => {
              if (s.spellId === spell.id) {
                return {
                  ...s,
                  available: false,
                  penanceRequired: result.penanceRequired,
                };
              }
              return s;
            });
            db.updateCharacter(identity.campaignId, { ...character, spells });
          }
        } else if (payload.checkType === "turn_undead") {
          const wisMod = character ? abilityModifier(character.abilities.wis) : 0;
          modifier = wisMod;
          total = d20Result + modifier;
          label = `${actorNameStr}: Turn Undead`;
          detail = `${payload.diceMode === "physical" ? "(Physical) " : ""}${d20Result} + ${modifier} = ${total}. Undead of HD <= result must check morale or flee!`;
        } else {
          total = d20Result;
          detail = `${payload.diceMode === "physical" ? "(Physical) " : ""}Rolled ${d20Result}`;
        }

        db.addRoll(identity.campaignId, {
          actor: actorNameStr,
          kind: payload.checkType,
          label,
          dice: diceExpr,
          total,
          detail,
        });

        return { total, diceExpr, detail, label };
      }),
    );

    socket.on(
      "spells:restore",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int() }).parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only restore spells for your own character");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const spells = (character.spells ?? []).map((s) => {
          if (s.penanceRequired) return s;
          return { ...s, available: true };
        });
        db.updateCharacter(identity.campaignId, { ...character, spells });
        db.addRoll(identity.campaignId, {
          actor: character.name,
          kind: "spell",
          label: "Spells Restored",
          dice: "—",
          total: 0,
          detail: "Prepared spells refreshed through rest.",
        });
      }),
    );

    socket.on(
      "priest:penance",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int() }).parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only perform penance for your own character");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const spells = (character.spells ?? []).map((s) => ({
          ...s,
          available: true,
          penanceRequired: false,
        }));
        db.updateCharacter(identity.campaignId, { ...character, spells });
        db.addRoll(identity.campaignId, {
          actor: character.name,
          kind: "spell",
          label: "Divine Penance Fulfilled",
          dice: "—",
          total: 0,
          detail: "Through sacred fasting and prayer, holy favor is restored.",
        });
      }),
    );

    socket.on(
      "character:choice",
      action((raw: unknown) => {
        const payload = z.object({ characterId: z.number().int(), choices: z.record(z.string(), z.any()) }).parse(raw);
        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only configure your own character");
        }
        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const classChoices = { ...(character.classChoices ?? {}), ...payload.choices };
        db.updateCharacter(identity.campaignId, { ...character, classChoices });
      }),
    );

    // --- Tavern & Camp Shared Sessions ---

    socket.on(
      "tavern:open",
      action((raw: unknown) => {
        callerOrHostOnly();
        const sessionId = `tavern-${Date.now()}`;
        const newSession: ActivitySession = {
          id: sessionId,
          campaignId: identity.campaignId,
          kind: "tavern",
          status: "open",
          revision: 1,
          choices: {},
        };
        db.saveActivitySession(identity.campaignId, newSession);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "tavern",
          label: "Tavern Gathering Begun",
          dice: "—",
          total: 0,
          detail: "The company gathers at the taproom. Choose your tavern activities.",
        });
        return { sessionId };
      }),
    );

    socket.on(
      "tavern:submit_choice",
      action((raw: unknown) => {
        const payload = z
          .object({
            characterId: z.number().int(),
            activity: z.enum(["rest", "rumors", "carouse", "supplies"]),
            costGp: z.number().int().min(0).default(0),
            items: z.array(z.string()).optional(),
          })
          .parse(raw);

        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only submit tavern choices for your own character");
        }

        const session = db.getActiveSession(identity.campaignId, "tavern");
        if (!session || session.status !== "open") {
          throw new Error("No active tavern session is open");
        }

        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const updatedChoices = {
          ...session.choices,
          [String(payload.characterId)]: {
            characterId: payload.characterId,
            characterName: character.name,
            activity: payload.activity,
            costGp: payload.costGp,
            details: { items: payload.items },
          },
        };

        const updatedSession: ActivitySession = {
          ...session,
          revision: session.revision + 1,
          choices: updatedChoices,
        };
        db.saveActivitySession(identity.campaignId, updatedSession);
      }),
    );

    socket.on(
      "tavern:resolve",
      action((raw: unknown) => {
        callerOrHostOnly();
        const session = db.getActiveSession(identity.campaignId, "tavern");
        if (!session || session.status !== "open") {
          throw new Error("No open tavern session to resolve");
        }

        const state = db.getState(identity.campaignId, "host", null, "");
        const logs: string[] = [];

        db.db.transaction(() => {
          for (const choice of Object.values(session.choices)) {
            const char = state.characters.find((c) => c.id === choice.characterId);
            if (!char) continue;

            const cost = choice.costGp ?? 0;
            const newGold = Math.max(0, char.gold - cost);
            let newHp = char.hp;
            let newXp = char.xp ?? 0;
            let newInv = [...(char.inventory ?? [])];
            let newSpells = [...(char.spells ?? [])];

            if (choice.activity === "rest") {
              newHp = Math.min(char.maxHp, char.hp + 1);
              newSpells = newSpells.map((s) => (s.penanceRequired ? s : { ...s, available: true }));
              logs.push(`${char.name}: Rested & recovered 1 HP and refreshed spells (-${cost} gp).`);
            } else if (choice.activity === "carouse") {
              newXp += 10;
              logs.push(`${char.name}: Caroused late into the night, gaining 10 XP (-${cost} gp).`);
            } else if (choice.activity === "supplies") {
              const itemIds = choice.details?.items ?? [];
              for (const itId of itemIds) {
                const itDef = ITEMS.find((it) => it.id === itId);
                newInv.push({
                  instanceId: randomInt(100000, 999999).toString(),
                  itemId: itId,
                  name: itDef?.name ?? itId,
                  kind: itDef?.kind ?? "gear",
                  slots: itDef?.slots ?? 1,
                  equipped: false,
                  quantity: 1,
                  baseAc: itDef?.baseAc,
                  acBonus: itDef?.acBonus,
                  damage: itDef?.damage,
                });
              }
              logs.push(`${char.name}: Purchased expedition gear (-${cost} gp).`);
            } else if (choice.activity === "rumors") {
              logs.push(`${char.name}: Gathered rumors of the frontier.`);
            }

            db.updateCharacter(identity.campaignId, {
              ...char,
              gold: newGold,
              hp: newHp,
              xp: newXp,
              inventory: newInv,
              spells: newSpells,
            });
          }

          const resolvedSession: ActivitySession = {
            ...session,
            status: "resolved",
            resolvedAt: new Date().toISOString(),
            result: { logs },
          };
          db.saveActivitySession(identity.campaignId, resolvedSession);

          db.addRoll(identity.campaignId, {
            actor: "Table",
            kind: "tavern",
            label: "Tavern Activities Concluded",
            dice: "—",
            total: 0,
            detail: logs.length > 0 ? logs.join(" · ") : "The party departs the haven taproom.",
          });
        })();

        return { session: db.getActiveSession(identity.campaignId) };
      }),
    );

    socket.on(
      "camp:open",
      action((raw: unknown) => {
        callerOrHostOnly();
        const sessionId = `camp-${Date.now()}`;
        const newSession: ActivitySession = {
          id: sessionId,
          campaignId: identity.campaignId,
          kind: "camp",
          status: "open",
          revision: 1,
          choices: {},
        };
        db.saveActivitySession(identity.campaignId, newSession);
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "camp",
          label: "Camp Pitching Commenced",
          dice: "—",
          total: 0,
          detail: "The party pitches camp. Assign each adventurer to a watch, cooking, foraging, or rest duty.",
        });
        return { sessionId };
      }),
    );

    socket.on(
      "camp:submit_duty",
      action((raw: unknown) => {
        const payload = z
          .object({
            characterId: z.number().int(),
            duty: z.enum(["watch", "cook", "forage", "rest"]),
          })
          .parse(raw);

        if (identity.role !== "host" && payload.characterId !== identity.characterId) {
          throw new Error("You can only choose camp duty for your own character");
        }

        const session = db.getActiveSession(identity.campaignId, "camp");
        if (!session || session.status !== "open") {
          throw new Error("No active camp session is open");
        }

        const state = db.getState(identity.campaignId, "host", null, "");
        const character = state.characters.find((c) => c.id === payload.characterId);
        if (!character) throw new Error("Character not found");

        const updatedChoices = {
          ...session.choices,
          [String(payload.characterId)]: {
            characterId: payload.characterId,
            characterName: character.name,
            activity: payload.duty,
          },
        };

        const updatedSession: ActivitySession = {
          ...session,
          revision: session.revision + 1,
          choices: updatedChoices,
        };
        db.saveActivitySession(identity.campaignId, updatedSession);
      }),
    );

    socket.on(
      "camp:resolve",
      action((raw: unknown) => {
        callerOrHostOnly();
        const session = db.getActiveSession(identity.campaignId, "camp");
        if (!session || session.status !== "open") {
          throw new Error("No open camp session to resolve");
        }

        const state = db.getState(identity.campaignId, "host", null, "");
        const choices = Object.values(session.choices);
        const logs: string[] = [];

        db.db.transaction(() => {
          const clock = db.advanceWatch(identity.campaignId, 2);

          const hasForager = choices.some((c) => c.activity === "forage");
          const forageSuccess = hasForager && rollDie(20) >= 12;
          const currentRations = Number(state.campaign.rations ?? 12);
          let newRations = currentRations;

          if (forageSuccess) {
            logs.push("Foragers found wild game and fresh berries; party rations conserved.");
          } else {
            const consumed = Math.max(1, state.characters.length);
            newRations = Math.max(0, currentRations - consumed);
            db.db
              .prepare("UPDATE campaigns SET rations = ? WHERE id = ?")
              .run(newRations, identity.campaignId);
            logs.push(`Party ate rations (${consumed} consumed, ${newRations} remaining).`);
          }

          let nightAmbush = false;
          const hazardRoll = rollDie(6);
          if (hazardRoll === 1) {
            nightAmbush = true;
            const hasWatcher = choices.some((c) => c.activity === "watch");
            logs.push(
              hasWatcher
                ? "[ALERT: Night encounter! The watchman detected approaching danger before ambush.]"
                : "[AMBUSH: Night encounter! No guards were posted!]",
            );
            const wandering = db.getMonstersForZone(state.campaign.activeZoneId ?? "the_gloaming");
            const monster = wandering[0] ?? {
              id: 0,
              monsterKey: "wolf",
              name: "Prowling Wolf",
              currentHp: 8,
              maxHp: 8,
              loreTier: 0,
              ac: 12,
              morale: 7,
              attacks: ["Bite +2 (1d6)"],
              traits: [],
              lore: [],
            };
            db.addEncounterWithMonsters(identity.campaignId, `Night Camp Attack: ${monster.name}`, [monster]);
          } else {
            logs.push("The camp was quiet and undisturbed under the stars.");
          }

          for (const char of state.characters) {
            const charDuty = session.choices[String(char.id)]?.activity ?? "rest";
            let hpHealed = 0;
            if (charDuty === "rest" || !nightAmbush) {
              hpHealed = rollDie(4);
              const updatedHp = Math.min(char.maxHp, char.hp + hpHealed);
              const refreshedSpells = (char.spells ?? []).map((s) => (s.penanceRequired ? s : { ...s, available: true }));
              db.updateCharacter(identity.campaignId, {
                ...char,
                hp: updatedHp,
                spells: refreshedSpells,
                fatigue: 0,
              });
              logs.push(`${char.name}: Healed ${hpHealed} HP, refreshed spells, fatigue cleared.`);
            }
          }

          const resolvedSession: ActivitySession = {
            ...session,
            status: "resolved",
            resolvedAt: new Date().toISOString(),
            result: { logs, nightAmbush, clock },
          };
          db.saveActivitySession(identity.campaignId, resolvedSession);

          db.addRoll(identity.campaignId, {
            actor: "Table",
            kind: "camp",
            label: `Camp Resolved (Day ${clock.day}, Watch ${clock.watch})`,
            dice: "1d6 Hazard",
            total: hazardRoll,
            detail: logs.join(" · "),
          });
        })();

        return { session: db.getActiveSession(identity.campaignId) };
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
      mutationAction("travel:move", (raw: unknown) => {
        requireEncounterResolved();
        const payload = z
          .object({
            toHexId: z.string().min(1),
            mode: z.enum(["foot", "cart", "boat", "climb"]).default("foot"),
            navigationRoll: z.number().int().min(1).max(20).optional(),
            driftIndex: z.number().int().min(0).max(5).optional(),
            bypassNavigation: z.boolean().optional(),
          })
          .parse(raw);

        callerOrHostOnly();

        // 1. Authoritative origin from DB
        const camp = db.db
          .prepare(
            "SELECT party_location_json, active_region_id, active_zone_id, day, watch, watches_traveled_today, weather FROM campaigns WHERE id = ?",
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

        requireDepartingPartySize(currentLoc);

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

        // 4. Validate Travel Mode & Requirements for intended route
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

        // 5. Navigation check
        const intendedHasRoad =
          !!travelConnection &&
          (travelConnection.kind === "road" || travelConnection.kind === "trail");
        const intendedCrossingMethod =
          travelConnection?.crossing_method || travelConnection?.crossingMethod;
        const intendedWatches = calculateTravelWatches(
          targetHexRow.biome || "Wilderness",
          intendedHasRoad,
          intendedCrossingMethod,
        );

        // Party best INT modifier
        const charRows = db.db
          .prepare("SELECT int FROM characters WHERE campaign_id = ? AND roster_status != 'reserve'")
          .all(identity.campaignId) as Array<{ int: number }>;
        const partyIntMod =
          charRows.length > 0
            ? Math.max(...charRows.map((c) => abilityModifier(Number(c.int))))
            : 0;

        const navResult = resolveWildernessNavigation({
          watchCost: intendedWatches,
          hasRoad:
            intendedHasRoad ||
            Boolean(payload.bypassNavigation) ||
            charRows.length === 0,
          weather: camp?.weather,
          isNightTravel: Number(camp?.watch) === 4,
          partyIntMod,
          currentQ: fromQ,
          currentR: fromR,
          intendedQ: toQ,
          intendedR: toR,
          forcedRoll: payload.navigationRoll,
          forcedDriftIndex: payload.driftIndex,
        });

        const actualQ = navResult.actualQ;
        const actualR = navResult.actualR;

        let actualHexRow = targetHexRow;
        let actualConnection = travelConnection;

        if (navResult.drifted) {
          actualHexRow = db.db
            .prepare("SELECT * FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
            .get(identity.campaignId, actualQ, actualR) as any;
          if (!actualHexRow) {
            materializeHex(db, identity.campaignId, actualQ, actualR);
            actualHexRow = db.db
              .prepare("SELECT * FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
              .get(identity.campaignId, actualQ, actualR) as any;
          }

          actualConnection = null;
          if (camp?.active_region_id) {
            const fromKey = `${camp.active_region_id}:${currentLoc.layerId || "surface"}:${fromQ}:${fromR}`;
            const actualKey = `${camp.active_region_id}:${currentLoc.layerId || "surface"}:${actualQ}:${actualR}`;
            const connRow = db.db
              .prepare(
                "SELECT * FROM connections WHERE region_id = ? AND ((from_key = ? AND to_key = ?) OR (to_key = ? AND from_key = ?))",
              )
              .get(camp.active_region_id, fromKey, actualKey, fromKey, actualKey) as any;
            if (connRow) {
              actualConnection = connRow;
            }
          }
          if (!actualConnection && actualHexRow.connections_json) {
            const conns = JSON.parse(actualHexRow.connections_json);
            const originHexRow = db.db
              .prepare("SELECT id FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
              .get(identity.campaignId, fromQ, fromR) as any;
            if (originHexRow) {
              actualConnection = conns.find(
                (c: any) =>
                  (c.fromId === originHexRow.id && c.toId === actualHexRow.id) ||
                  (c.toId === originHexRow.id && c.fromId === actualHexRow.id),
              );
            }
          }
        }

        // 6. Cost calculation from actual entered hex
        const actualHasRoad =
          !!actualConnection &&
          (actualConnection.kind === "road" || actualConnection.kind === "trail");
        const actualCrossingMethod =
          actualConnection?.crossing_method || actualConnection?.crossingMethod;
        const calculatedActualWatches = calculateTravelWatches(
          actualHexRow.biome || "Wilderness",
          actualHasRoad,
          actualCrossingMethod,
        );
        const watches =
          actualConnection?.cost_watches ||
          actualConnection?.costWatches ||
          calculatedActualWatches;

        // 7. Advance watch clock
        const clockResult = db.advanceWatch(identity.campaignId, watches);

        // 8. Check Forced March if Night travel occurred
        const fatigueResults =
          clockResult.watch === 1 || clockResult.watchesTraveledToday > 3
            ? db.evaluatePartyForcedMarch(identity.campaignId)
            : [];

        // 9. Wilderness Encounter Check for entered hex (1d6 -> 1 triggers encounter)
        let encounterTriggered = false;
        let encounterName = "";
        const encRoll = rollDie(6);
        if (encRoll === 1) {
          encounterTriggered = true;
          const zoneToUse =
            actualHexRow.primary_zone || camp?.active_zone_id || "the_gloaming";
          const manifest = db.getZoneManifest(zoneToUse);
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

        // 10. Update location and reveal actual entered hex
        db.setPartyLocation(identity.campaignId, {
          q: actualQ,
          r: actualR,
          layerId: currentLoc.layerId || "surface",
        });

        // Chart the ground the party can step onto next, so the frontier stays one ring ahead
        const charted = materializeNeighborhood(db, identity.campaignId, actualQ, actualR);

        if (
          actualHexRow.reveal_state === "unexplored" ||
          actualHexRow.reveal_state === "rumored"
        ) {
          db.revealHex(identity.campaignId, actualHexRow.id, "scouted");
        }

        if (
          actualHexRow.primary_zone &&
          actualHexRow.primary_zone !== camp?.active_zone_id
        ) {
          db.setActiveZone(identity.campaignId, actualHexRow.primary_zone);
        }

        // 11. Log roll (the party is NOT told the check failed)
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: `Traveled to Hex ${actualHexRow.id} (${actualHexRow.name || actualHexRow.biome || "Wilderness"})`,
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
          newPartyLocation: { q: actualQ, r: actualR },
          chartedHexIds: charted.map((h) => h.id),
          navigation: {
            checkRequired: navResult.checkRequired,
            terrainClass: navResult.terrainClass,
            dc: navResult.dc,
            roll: navResult.roll,
            total: navResult.total,
            passed: navResult.passed,
            intendedHexId: payload.toHexId,
            actualHexId: actualHexRow.id,
            drifted: navResult.drifted,
            driftDirection: navResult.driftDirection,
            driftIndex: navResult.driftIndex,
          },
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
            notes: z.string().max(4000).optional(),
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
      mutationAction("expedition:camp", (_raw: unknown) => {
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
      mutationAction("expedition:camp_night", (raw: unknown) => {
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
      mutationAction("site:enter", (raw: unknown) => {
        requireEncounterResolved();
        const payload = z.object({ siteId: z.string().min(1) }).parse(raw);
        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const currentLoc = camp?.party_location_json ? JSON.parse(camp.party_location_json) : { q: 0, r: 0 };

        const site = db.db.prepare("SELECT * FROM sites WHERE id = ?").get(payload.siteId) as any;
        if (!site) throw new Error(`Site ${payload.siteId} not found`);

        const siteParts = site.canonical_key.split(":");
        const siteQ = Number(siteParts[2]);
        const siteR = Number(siteParts[3]);

        if (camp?.active_site_id) throw new Error("Exit the current site before entering another site");
        if (site.region_id !== camp.active_region_id || siteParts[1] !== (currentLoc.layerId ?? "surface")) {
          throw new Error("This site is not in the party's current region and layer");
        }

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

        const tavern = camp.tavern_establishment_json ? JSON.parse(camp.tavern_establishment_json) : null;
        const siteLead = tavern?.leads.find((lead: { targetSiteId: string }) => lead.targetSiteId === site.id);
        const deserted = siteLead?.destinationOutcome === "false" || siteLead?.destinationOutcome === "empty";

        const existingRoom = db.db
          .prepare("SELECT 1 FROM dungeon_rooms WHERE campaign_id = ? AND site_id = ?")
          .get(identity.campaignId, site.id);
        if (!existingRoom) {
          const room = generateDungeonRoom();
          if (deserted) {
            room.contents = siteLead.arrivalDiscovery;
            room.interaction = "Ancient dust and wind through cracks; free search turn.";
            room.exits = 1;
            delete room.trap;
          }
          db.addRoom(identity.campaignId, room, site.id);
        }

        const existingGraph = db.getDungeonGraph(identity.campaignId, site.id);
        if (!existingGraph) {
          const defaultGraph = generateSiteLayout(identity.campaignId, site.id, site.name,
            deserted ? 6 : rollDie(6),
            ["settlement", "resource", "shrine", "district"].includes(site.kind) ? "nearby_path" : "stairs");
          const path = db.getAdventurePath(identity.campaignId);
          const situation = path?.activeSituation?.siteId === site.id ? path?.activeSituation : undefined;
          const objective = db.getState(identity.campaignId, "host", null, "").campaign.activeObjective;
          const keys = db.getZoneManifest(camp.active_zone_id || "the_gloaming")?.wanderingMonsterTable ?? [];
          if (deserted) {
            delete defaultGraph.siteStructure;
            defaultGraph.nodes = [{ ...defaultGraph.nodes[0], feature: "empty",
              title: "The trail ends here", contents: siteLead.arrivalDiscovery,
              interaction: "Inspect the evidence, then choose your next destination." }];
            defaultGraph.edges = [];
          } else populateSiteRooms(defaultGraph, {
            roll: rollDie,
            monster: (feature) => {
              const key = feature === "boss_monster" && keys.length
                ? [...keys].sort((a, b) => (db.getMonster(b)?.maxHp ?? 0) - (db.getMonster(a)?.maxHp ?? 0))[0]
                : keys.length ? keys[randomInt(keys.length)] : "goblin";
              return { key, name: db.getMonster(key)?.name ?? key };
            },
            treasure: () => {
              const reward = generateUnguardedTreasure(db.averageActivePartyLevel(identity.campaignId));
              return { coins: reward.coins.gp + reward.coins.sp / 10 + reward.coins.cp / 100, items: reward.items };
            },
            groupTreasure: (feature, roomId) => {
              const rewardService = new RewardService(db);
              const groupId = `grp_${identity.campaignId}_${site.id}_rm${roomId}`;
              const isBoss = feature === "boss_monster";
              const reg = rewardService.registerEncounterGroup(
                identity.campaignId,
                {
                  id: groupId,
                  siteId: site.id,
                  roomId,
                  name: isBoss ? "Site Boss" : "Site Inhabitants",
                  members: [{ key: "site_inhabitant", name: "Site Inhabitant", count: feature === "monster_mob" ? 3 : 1 }],
                  policyType: isBoss ? "boss_hoard" : "general_monster",
                },
                `seed_${groupId}`,
              );
              if (reg.present && reg.sourceId) {
                const src = db.getRewardSource(identity.campaignId, reg.sourceId);
                if (src) {
                  return {
                    coins: src.coins.gp + src.coins.sp / 10 + src.coins.cp / 100,
                    items: [...src.items],
                  };
                }
              }
              return null;
            },
            objective: { title: situation?.title ??
              (objective?.targetSiteId === site.id ? objective?.title : undefined) ?? `Investigate ${site.name}`,
              deedId: situation?.requiredDeed },
          });
          if (!deserted) attachSiteObjectives(defaultGraph, {
            pathId: siteLead?.isPathLead === false ? undefined : path?.pathId,
            act: Number(camp.act ?? 1), seed: site.id,
            primary: situation ? { title: situation.title, deedId: situation.requiredDeed } : undefined,
            discoveringLevel: db.averageActivePartyLevel(identity.campaignId),
          });
          if (!deserted && siteLead?.arrivalDiscovery) {
            defaultGraph.nodes[0].contents += ` ${siteLead.arrivalDiscovery}`;
          }
          db.saveDungeonGraph(identity.campaignId, defaultGraph);
        } else {
          // Re-enter through the entrance, keeping discoveries and outcomes intact.
          existingGraph.currentRoomId = existingGraph.entryRoomId;
          db.saveDungeonGraph(identity.campaignId, existingGraph);
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

    // --- M4: Dungeon Graph Exploration Handlers ---

    socket.on(
      "dungeon:move_room",
      mutationAction("dungeon:move_room", (raw: unknown) => {
        if (db.getCombatState(identity.campaignId)?.status === "active") throw new Error("Resolve combat before moving rooms");
        const payload = z.object({ toRoomId: z.number().int() }).parse(raw);
        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const siteId = camp?.active_site_id;
        if (!siteId) throw new Error("No active dungeon site");

        const graph = db.getDungeonGraph(identity.campaignId, siteId);
        if (!graph) throw new Error("No dungeon graph found for this site");

        const fromRoomId = graph.currentRoomId;
        const toRoomId = payload.toRoomId;
        if (fromRoomId === toRoomId) return { graph };

        const edge = graph.edges.find(
          (e) =>
            (e.fromRoomId === fromRoomId && e.toRoomId === toRoomId) ||
            (e.fromRoomId === toRoomId && e.toRoomId === fromRoomId),
        );
        if (!edge) {
          throw new Error(`No passage connects room ${fromRoomId} to room ${toRoomId}`);
        }

        if (edge.state === "locked" || edge.state === "barred") {
          throw new Error(`The door is ${edge.state}. You must unlock or force it first.`);
        }
        if (edge.doorType === "secret" && edge.state !== "open") {
          throw new Error("You cannot pass through a secret wall without discovering and opening it first.");
        }

        const turns = graph.explorationTurns + 1;
        const lightRemaining = Math.max(0, graph.lightTurnsRemaining - 1);

        const targetNode = graph.nodes.find((n) => n.id === toRoomId);
        if (targetNode) {
          targetNode.explored = true;
        }

        const state = db.getState(identity.campaignId, "host", null, "");
        const hasThief = state.characters.some((c) => c.className.toLowerCase().includes("thief"));
        let trapDetectedMsg = "";
        if (targetNode?.trap && !targetNode.trap.spotted && !targetNode.trap.disarmed) {
          if (hasThief) {
            targetNode.trap.spotted = true;
            trapDetectedMsg = " [Thief passive trap sense spotted danger ahead!]";
          }
        }

        let hazardMsg = "";
        if (turns % 3 === 0) {
          const tDie = rollDie(6);
          if (tDie === 1) {
            hazardMsg = " [Tension Die: 1! Wandering danger approaches!]";
          }
        }

        let torchWarning = "";
        if (lightRemaining === 0 && graph.lightTurnsRemaining > 0) {
          torchWarning = " [TORCH EXTINGUISHED! The party is plunged into total darkness.]";
        }

        const updatedGraph: DungeonGraphState = {
          ...graph,
          currentRoomId: toRoomId,
          explorationTurns: turns,
          lightTurnsRemaining: lightRemaining,
        };
        db.saveDungeonGraph(identity.campaignId, updatedGraph);

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: `Party Moved to Room ${toRoomId}: ${targetNode?.title ?? "Chamber"}`,
          dice: "1 Turn",
          total: turns,
          detail: `Turn ${turns} · Light remaining: ${lightRemaining} turns${trapDetectedMsg}${hazardMsg}${torchWarning}`,
        });

        return { graph: db.getDungeonGraph(identity.campaignId, siteId) };
      }),
    );

    socket.on(
      "dungeon:interact_door",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            fromRoomId: z.number().int(),
            toRoomId: z.number().int(),
            action: z.enum(["open", "close", "pick", "force", "search_secret"]),
            characterId: z.number().int().optional(),
            diceMode: z.enum(["digital", "physical"]).default("digital"),
            physicalRoll: z.number().int().optional(),
          })
          .parse(raw);

        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const siteId = camp?.active_site_id;
        if (!siteId) throw new Error("No active dungeon site");

        const graph = db.getDungeonGraph(identity.campaignId, siteId);
        if (!graph) throw new Error("No dungeon graph found");

        const edgeIndex = graph.edges.findIndex(
          (e) =>
            (e.fromRoomId === payload.fromRoomId && e.toRoomId === payload.toRoomId) ||
            (e.fromRoomId === payload.toRoomId && e.toRoomId === payload.fromRoomId),
        );
        if (edgeIndex === -1) throw new Error("No door or connection found between specified rooms");

        const edge = graph.edges[edgeIndex];
        const state = db.getState(identity.campaignId, "host", null, "");
        const char = payload.characterId ? state.characters.find((c) => c.id === payload.characterId) : undefined;
        const charName = char?.name ?? actor();

        let rollTotal = 0;
        let detail = "";
        let success = false;

        if (payload.action === "open") {
          if (edge.state === "locked" || edge.state === "barred") {
            throw new Error(`Door is ${edge.state}. It must be picked or forced.`);
          }
          edge.state = "open";
          detail = `${charName} opened the door.`;
          success = true;
        } else if (payload.action === "close") {
          edge.state = "closed";
          detail = `${charName} closed the door.`;
          success = true;
        } else if (payload.action === "pick") {
          const dexMod = char ? abilityModifier(char.abilities.dex) : 0;
          const isThief = char?.className.toLowerCase().includes("thief") ?? false;
          const baseRoll =
            payload.diceMode === "physical" && payload.physicalRoll !== undefined
              ? payload.physicalRoll
              : rollDie(20);
          rollTotal = baseRoll + dexMod + (isThief ? 2 : 0);
          success = rollTotal >= 12;
          if (success) {
            edge.state = "closed";
            detail = `${charName} successfully picked the lock! (Roll: ${baseRoll} + ${dexMod + (isThief ? 2 : 0)} = ${rollTotal} vs DC 12)`;
          } else {
            detail = `${charName} failed to pick the lock. (Roll: ${baseRoll} + ${dexMod + (isThief ? 2 : 0)} = ${rollTotal} vs DC 12)`;
          }
        } else if (payload.action === "force") {
          const strMod = char ? abilityModifier(char.abilities.str) : 0;
          const isFighter = char?.className.toLowerCase().includes("fighter") ?? false;
          const baseRoll =
            payload.diceMode === "physical" && payload.physicalRoll !== undefined
              ? payload.physicalRoll
              : rollDie(20);
          rollTotal = baseRoll + strMod + (isFighter ? 2 : 0);
          success = rollTotal >= 14;
          if (success) {
            edge.state = "open";
            detail = `${charName} smashed the door open! (Roll: ${baseRoll} + ${strMod + (isFighter ? 2 : 0)} = ${rollTotal} vs DC 14)`;
          } else {
            detail = `${charName} failed to force the door with a loud thud! (Roll: ${baseRoll} + ${strMod + (isFighter ? 2 : 0)} = ${rollTotal} vs DC 14). Tension rises!`;
          }
        } else if (payload.action === "search_secret") {
          const intMod = char ? abilityModifier(char.abilities.int) : 0;
          const baseRoll =
            payload.diceMode === "physical" && payload.physicalRoll !== undefined
              ? payload.physicalRoll
              : rollDie(20);
          rollTotal = baseRoll + intMod;
          success = rollTotal >= 12;
          if (success && edge.doorType === "secret") {
            edge.state = "open";
            detail = `${charName} found the hidden mechanism and opened the secret passage! (Roll: ${baseRoll} + ${intMod} = ${rollTotal} vs DC 12)`;
          } else {
            detail = `${charName} searched the stonework but found nothing unusual. (Roll: ${baseRoll} + ${intMod} = ${rollTotal} vs DC 12)`;
          }
        }

        db.saveDungeonGraph(identity.campaignId, graph);
        db.addRoll(identity.campaignId, {
          actor: charName,
          kind: "exploration",
          label: `Door Interaction: ${payload.action.toUpperCase()}`,
          dice: rollTotal ? "1d20" : "—",
          total: rollTotal,
          detail,
        });

        return { graph: db.getDungeonGraph(identity.campaignId, siteId), success };
      }),
    );

    socket.on(
      "dungeon:disarm_trap",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            roomId: z.number().int(),
            characterId: z.number().int().optional(),
            diceMode: z.enum(["digital", "physical"]).default("digital"),
            physicalRoll: z.number().int().optional(),
          })
          .parse(raw);

        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const siteId = camp?.active_site_id;
        if (!siteId) throw new Error("No active dungeon site");

        const graph = db.getDungeonGraph(identity.campaignId, siteId);
        if (!graph) throw new Error("No dungeon graph found");

        const node = graph.nodes.find((n) => n.id === payload.roomId);
        if (!node || !node.trap) throw new Error("No trap found in this room");

        const state = db.getState(identity.campaignId, "host", null, "");
        const char = payload.characterId ? state.characters.find((c) => c.id === payload.characterId) : undefined;
        const charName = char?.name ?? actor();

        const dexMod = char ? abilityModifier(char.abilities.dex) : 0;
        const isThief = char?.className.toLowerCase().includes("thief") ?? false;
        const baseRoll =
          payload.diceMode === "physical" && payload.physicalRoll !== undefined
            ? payload.physicalRoll
            : rollDie(20);
        const total = baseRoll + dexMod + (isThief ? 2 : 0);
        const success = total >= node.trap.dc;

        let detail = "";
        if (success) {
          node.trap.disarmed = true;
          node.trap.spotted = true;
          detail = `${charName} carefully disabled the ${node.trap.name}! (Roll: ${baseRoll} + ${dexMod + (isThief ? 2 : 0)} = ${total} vs DC ${node.trap.dc})`;
        } else {
          node.trap.spotted = true;
          const trapDmg = rollDie(6);
          if (char) {
            const newHp = Math.max(0, char.hp - trapDmg);
            db.updateCharacter(identity.campaignId, { ...char, hp: newHp });
          }
          detail = `${charName} accidentally sprung the ${node.trap.name}! (Roll: ${total} vs DC ${node.trap.dc}) Dealing ${trapDmg} damage!`;
        }

        db.saveDungeonGraph(identity.campaignId, graph);
        db.addRoll(identity.campaignId, {
          actor: charName,
          kind: "exploration",
          label: `Disarm Trap: ${node.trap.name}`,
          dice: "1d20",
          total,
          detail,
        });

        return { success, graph: db.getDungeonGraph(identity.campaignId, siteId) };
      }),
    );

    socket.on(
      "dungeon:recruit_rescued",
      mutationAction("dungeon:recruit_rescued", (raw: unknown) => {
        const payload = z.object({
          roomId: z.number().int(),
          name: cleanText.max(50).optional(),
        }).parse(raw);
        const graph = db.getDungeonGraph(identity.campaignId);
        const room = graph?.nodes.find((node) => node.id === payload.roomId);
        const rescued = room?.objective?.generated?.rescuedNpc;
        if (!graph || !room || !rescued) throw new Error("No rescued NPC is held in that room");
        if (!room.objective!.completed) throw new Error("Free them before they will travel with you");
        if (rescued.recruited) throw new Error("They have already joined the company");

        const classInfo = CLASSES.find((item) => item.name === rescued.className);
        if (!classInfo) throw new Error(`No class definition for "${rescued.className}"`);
        const conMod = abilityModifier(rescued.abilities.con);
        const ancestryHp = rescued.ancestry === "Dwarf" ? 2 : 0;
        const maxHp = Math.max(1, rollDie(classInfo.hitDie) + conMod + ancestryHp);
        const level1Talent = rollClassTalent(rescued.className);

        // Anyone at the table can take them in — there is no GM seat to approve it.
        const characterId = db.addCharacter(
          identity.campaignId,
          identity.token,
          {
            name: payload.name ?? rescued.name,
            ancestry: rescued.ancestry,
            className: rescued.className,
            level: 1,
            hp: maxHp,
            maxHp,
            ac: 10 + abilityModifier(rescued.abilities.dex),
            gold: 0,
            gearSlots: 10 + abilityModifier(rescued.abilities.str),
            abilities: rescued.abilities,
            anchors: {
              homeland: "Unknown — found in the dark",
              landmark: `Rescued from ${graph.siteId}, room ${room.id}`,
              nemesis: "Whoever held them",
            },
            talents: [`[Lvl 1] ${level1Talent.effect}`],
            xp: 0,
            generationMethod: rescued.generationMethod,
            rosterStatus: "reserve",
          },
          { startingGear: false },
        );

        rescued.recruited = true;
        db.saveDungeonGraph(identity.campaignId, graph);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "character",
          label: `Rescued ${rescued.name} (${rescued.className})`,
          dice: `1d${classInfo.hitDie}`,
          total: maxHp,
          detail: `${METHOD_LABELS[rescued.generationMethod]} · ${formatAbilities(rescued.abilities)} · joins the reserve roster with no gear`,
        });
        return { characterId, graph };
      }),
    );

    socket.on(
      "dungeon:record_outcome",
      mutationAction("dungeon:record_outcome", (raw: unknown) => {
        const payload = z.object({
          roomId: z.number().int(),
          outcome: z.enum(["defeated", "negotiated", "avoided", "disarmed", "overcame", "searched"]),
          notes: z.string().trim().min(5).max(1000),
          treasureAccessible: z.boolean().default(false),
          treasureFound: z.boolean().default(false),
          objectiveCompleted: z.boolean().default(false),
        }).parse(raw);
        const graph = db.getDungeonGraph(identity.campaignId);
        const room = graph?.nodes.find((node) => node.id === payload.roomId);
        if (!graph || !room || graph.currentRoomId !== room.id) throw new Error("Enter the room before recording its outcome");
        if (db.getCombatState(identity.campaignId)?.status === "active") {
          throw new Error("Conclude combat before recording the room's outcome");
        }
        if (payload.objectiveCompleted && !room.objective) throw new Error("The objective is not in this room");
        if (payload.treasureFound && !room.treasure) {
          const groupId = `grp_${identity.campaignId}_${graph.siteId}_rm${room.id}`;
          const roll = db.getTreasureRoll(identity.campaignId, groupId);
          if (roll && !roll.present) {
            // Durable negative result preserved: no fresh treasure through searching
          } else if (roll && roll.present && roll.sourceId) {
            const src = db.getRewardSource(identity.campaignId, roll.sourceId);
            if (src) {
              room.treasure = {
                coins: src.coins.gp + src.coins.sp / 10 + src.coins.cp / 100,
                items: [...src.items],
                claimed: false,
              };
            }
          } else if (room.feature === "treasure") {
            const reward = generateUnguardedTreasure(db.averageActivePartyLevel(identity.campaignId));
            room.treasure = { coins: reward.coins.gp, items: reward.items, claimed: false };
          }
        }
        if (payload.treasureAccessible) {
          if (!room.treasure) throw new Error("No treasure has been found here");
          if (room.treasure.claimed) throw new Error("Treasure already claimed");
          // The caller records an actual table ruling, including noncombat access.
          room.treasure.access = { method: payload.outcome, notes: payload.notes };
        }
        room.resolution = { outcome: payload.outcome, notes: payload.notes };
        if (room.encounter && payload.outcome === "defeated") room.encounter.defeated = true;
        if (room.trap && payload.outcome === "disarmed") room.trap.disarmed = true;
        if (payload.objectiveCompleted && room.objective && !room.objective.completed) {
          room.objective.completed = true;
          room.objective.notes = payload.notes;
          if (room.objective.generated) {
            new RewardService(db).resolveStoryAward(identity.campaignId,
              room.objective.deedId ?? room.objective.generated.id, "site_objective", payload.outcome, payload.notes);
          }
          if (room.objective.deedId && (!room.objective.generated || room.objective.deedId !== room.objective.generated.id)) {
            db.resolveAdventurePathDeed(identity.campaignId, room.objective.deedId, 1, payload.notes);
          }
          db.updateSiteState(graph.siteId, `Objective completed: ${payload.notes}`);
        }
        db.saveDungeonGraph(identity.campaignId, graph);
        db.addRoll(identity.campaignId, { actor: actor(), kind: "exploration",
          label: `Room ${room.id}: ${payload.outcome}`, dice: "Table ruling", total: 0,
          detail: `${payload.notes}${payload.treasureAccessible ? " · Treasure discovered and accessible." : ""}${payload.objectiveCompleted ? " · Objective completed." : ""}` });
        return { graph };
      }),
    );

    socket.on(
      "dungeon:claim_treasure",
      mutationAction("dungeon:claim_treasure", (raw: unknown) => {
        callerOrHostOnly();
        const payload = z.object({ roomId: z.number().int() }).parse(raw);
        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const siteId = camp?.active_site_id;
        if (!siteId) throw new Error("No active dungeon site");

        const graph = db.getDungeonGraph(identity.campaignId, siteId);
        if (!graph) throw new Error("No dungeon graph found");

        const room = graph.nodes.find((n) => n.id === payload.roomId);
        if (graph.currentRoomId !== payload.roomId) throw new Error("Enter the room before claiming its treasure");
        if (!room || !room.treasure) throw new Error("No treasure in this room");
        requireTreasureAccess(room);

        room.treasure.claimed = true;
        db.saveDungeonGraph(identity.campaignId, graph);

        const reward: RewardRecord = {
          id: `reward-room-${identity.campaignId}-${siteId}-${room.id}`,
          campaignId: identity.campaignId,
          sourceType: "dungeon_room",
          sourceId: `${siteId}:room-${room.id}`,
          coins: { gp: room.treasure.coins, sp: 0, cp: 0 },
          items: [...room.treasure.items],
          claimed: false,
          allocations: {},
        };
        db.saveReward(identity.campaignId, reward);

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "reward",
          label: `Treasure Secured from ${room.title}`,
          dice: "—",
          total: room.treasure.coins,
          detail: `Recovered ${room.treasure.coins} gp and [${room.treasure.items.join(", ")}]. Ready for allocation.`,
        });

        return { graph: db.getDungeonGraph(identity.campaignId, siteId), reward };
      }),
    );

    socket.on(
      "dungeon:light_torch",
      mutationAction("dungeon:light_torch", (raw: unknown) => {
        callerOrHostOnly();
        const camp = db.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(identity.campaignId) as any;
        const siteId = camp?.active_site_id;
        if (!siteId) throw new Error("No active dungeon site");

        const graph = db.getDungeonGraph(identity.campaignId, siteId);
        if (!graph) throw new Error("No dungeon graph found");

        const state = db.getState(identity.campaignId, "host", null, "");
        const bearer = state.characters.find((c) => !c.conditions?.includes("dead") &&
          c.inventory?.some((item) => item.itemId === "torches" && (item.quantity ?? 1) > 0));
        if (!bearer) throw new Error("The party has no torches remaining");
        const inventory = structuredClone(bearer.inventory ?? []);
        const index = inventory.findIndex((item) => item.itemId === "torches" && (item.quantity ?? 1) > 0);
        const bundle = inventory[index];
        const remaining = (bundle.remainingTorches ?? 3) - 1;
        if (remaining > 0) bundle.remainingTorches = remaining;
        else if ((bundle.quantity ?? 1) > 1) {
          bundle.quantity = (bundle.quantity ?? 1) - 1;
          delete bundle.remainingTorches;
        } else inventory.splice(index, 1);
        db.updateCharacter(identity.campaignId, { ...bearer, inventory });

        graph.lightTurnsRemaining = 6;
        db.saveDungeonGraph(identity.campaignId, graph);

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: "Torch Lit",
          dice: "—",
          total: 6,
          detail: "A fresh torch was ignited. The corridor is brightly illuminated for 6 crawling turns.",
        });

        return { graph: db.getDungeonGraph(identity.campaignId, siteId) };
      }),
    );

    socket.on(
      "dungeon:spot_trap",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            roomId: z.number().int(),
          })
          .parse(raw);

        const graph = db.spotRoomTrap(identity.campaignId, payload.roomId);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "exploration",
          label: "Trap Detected",
          dice: "Search",
          total: 0,
          detail: `Investigated sensory tells in room ${payload.roomId}. Trap mechanism and trigger detected.`,
        });

        const room = graph.nodes.find((n) => n.id === payload.roomId);
        return { graph, room };
      }),
    );

    // --- M5: Turn-Based Combat Runner Handlers ---

    socket.on(
      "combat:start",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            roomId: z.number().int().optional(),
            name: z.string().optional(),
            encounterId: z.number().int().optional(),
            monsters: z
              .array(
                z.object({
                  name: z.string(),
                  hp: z.number().int().min(1),
                  ac: z.number().int(),
                  morale: z.number().int().default(7),
                }),
              )
              .optional(),
          })
          .parse(raw);

        const state = db.getState(identity.campaignId, "host", null, "");
        let encId = payload.encounterId;
        if (state.activeCombat?.status === "active") throw new Error("Combat is already active");
        if (payload.roomId !== undefined) {
          const graph = db.getDungeonGraph(identity.campaignId);
          const room = graph?.nodes.find((node) => node.id === payload.roomId);
          if (!graph || graph.currentRoomId !== payload.roomId || !room?.encounter) {
            throw new Error("Enter the occupied room before engaging its encounter");
          }
          if (room.encounter.defeated || room.resolution) throw new Error("This room encounter has already been resolved");
          const monster = db.getMonster(room.encounter.monsterKey);
          if (!monster) throw new Error("Room creature needs a supported bestiary entry before combat");
          encId = room.encounter.encounterId;
          if (!encId) {
            encId = db.addEncounterWithMonsters(identity.campaignId, room.encounter.name,
              Array.from({ length: room.encounter.count }, () => ({ ...monster })));
            room.encounter.encounterId = encId;
            db.saveDungeonGraph(identity.campaignId, graph);
          }
        }


        if (!encId) {
          const encMonsters = payload.monsters ?? [
            { name: "Dungeon Prowler", hp: 10, ac: 12, morale: 7 },
          ];
          const newEnc = db.addEncounterWithMonsters(
            identity.campaignId,
            payload.name ?? "Dungeon Combat",
            encMonsters.map((m, idx) => ({
              id: idx + 1,
              monsterKey: "custom",
              name: m.name,
              currentHp: m.hp,
              maxHp: m.hp,
              loreTier: 0,
              ac: m.ac,
              morale: m.morale,
              attacks: ["Claw +2 (1d6)"],
              traits: [],
              lore: [],
            })),
          );
          encId = newEnc;
        }

        const combatants: Combatant[] = [];
        let highestPcRoll = 0;
        let highestPcId = "";

        for (const c of state.characters.filter((ch) => ch.rosterStatus !== "reserve")) {
          const init = { total: 0 };
          if (init.total > highestPcRoll) {
            highestPcRoll = init.total;
            highestPcId = `pc-${c.id}`;
          }
          combatants.push({
            id: `pc-${c.id}`,
            name: c.name,
            kind: "pc",
            refId: c.id,
            initiative: init.total,
            ac: c.ac,
            currentHp: c.hp,
            maxHp: c.maxHp,
            conditions: c.conditions ?? [],
            deathStrikes: c.deathStrikes ?? 0,
            stabilized: c.stabilized ?? false,
          });
        }

        const freshState = db.getState(identity.campaignId, "host", null, "");
        const activeEnc = freshState.encounters.find((e) => e.id === encId) ?? freshState.encounters.find((e) => e.status === "active");
        let highestMonsterInit = 0;
        let monsterWinnerId = "";

        if (activeEnc && activeEnc.monsters) {
          const monsterGroupCheck = 0;
          for (const visibleMonster of activeEnc.monsters) {
            const row = db.db.prepare("SELECT * FROM encounter_monsters WHERE id = ? AND encounter_id = ?").get(visibleMonster.id, activeEnc.id) as any;
            const definition = db.getMonster(visibleMonster.monsterKey);
            const m = { ...visibleMonster, currentHp: Number(row.current_hp), maxHp: Number(row.max_hp), ac: row.ac ?? definition?.ac ?? 12 };
            const mId = `monster-${m.id}`;
            const mInit = monsterGroupCheck;
            if (mInit > highestMonsterInit) {
              highestMonsterInit = mInit;
              monsterWinnerId = mId;
            }
            combatants.push({
              id: mId,
              name: m.name,
              kind: "monster",
              refId: m.id,
              initiative: mInit,
              ac: m.ac ?? 12,
              currentHp: m.currentHp,
              maxHp: m.maxHp,
              conditions: [],
              acRevealed: false,
              acHint: getMonsterAcHint(m.ac ?? 12),
              hpStatus: computeHpStatus(m.currentHp, m.maxHp),
            });
          }
        }


        const winnerId = highestPcRoll >= highestMonsterInit ? (highestPcId || combatants[0]?.id) : (monsterWinnerId || combatants[0]?.id);
        const winnerIndex = Math.max(0, combatants.findIndex((c) => c.id === winnerId));

        const combatState: CombatState = {
          encounterId: encId!,
          campaignId: identity.campaignId,
          round: 1,
          activeIndex: winnerIndex,
          combatants,
          status: "active",
          moraleTriggerChecked: false,
          seatingOrder: db.getTableSeating(identity.campaignId),
        };

        combatState.seatingOrder = combatSeats(combatState);
        combatState.activeIndex = seatIndex(combatState, combatState.seatingOrder[0]);
        db.saveCombatState(identity.campaignId, combatState);

        const winner = combatants[winnerIndex];
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "combat",
          label: "Combat Initiated",
          dice: "Initiative",
          total: winner?.initiative ?? combatants[0]?.initiative ?? 0,
          detail: "Roll DEX checks at the physical table, then select the winner. Monsters use one check with their highest DEX modifier.",
        });

        return { combat: combatState };
      }),
    );

    socket.on(
      "combat:reveal_ac",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            combatantId: z.string(),
          })
          .parse(raw);
        const updated = db.revealCombatantAc(identity.campaignId, payload.combatantId);
        const combatant = updated.combatants.find((c) => c.id === payload.combatantId);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "combat",
          label: "Armor Class Tested",
          dice: "—",
          total: combatant?.ac ?? 10,
          detail: `${combatant?.name ?? "Monster"} Armor Class confirmed: AC ${combatant?.ac ?? 10}.`,
        });
        return { ok: true, ac: combatant?.ac, combat: updated };
      }),
    );

    socket.on(
      "combat:set_seating",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            seatingOrder: z.array(z.string()),
          })
          .parse(raw);
        const updated = db.setCombatSeating(identity.campaignId, payload.seatingOrder);
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "combat",
          label: "Table Seating Updated",
          dice: "—",
          total: payload.seatingOrder.length,
          detail: `Clockwise seating order set around the table: ${updated.combatants.map((c) => c.name).join(" > ")}.`,
        });
        return { ok: true, combat: updated };
      }),
    );

    socket.on("npc:record", action((raw: unknown) => {
      callerOrHostOnly();
      const payload = z.object({ name: cleanText.max(80), role: cleanText.max(80), ancestry: cleanText.max(80), notes: z.string().max(4000).default("") }).parse(raw);
      const state = db.getState(identity.campaignId, identity.role, identity.characterId, "", identity.token);
      const graph = state.activeDungeon;
      const loc = state.campaign.partyLocation ?? { q: 0, r: 0 };
      const hex = state.hexes.find(h => h.q === loc.q && h.r === loc.r);
      const locationId = graph ? `${graph.siteId}:${graph.currentRoomId}` : hex?.id;
      if (!locationId) throw new Error("Current location is unknown");
      const npc = db.addNpc(identity.campaignId, { ...payload, id: `npc-${randomUUID()}`, disposition: "uncertain",
        locationType: graph ? "site_room" : "settlement", locationId,
        locationName: graph ? `Room ${graph.currentRoomId}` : hex?.name });
      return { npc };
    }));

    socket.on(
      "npc:update_disposition",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            npcId: z.string(),
            disposition: z.enum(["friendly", "neutral", "hostile", "uncertain"]),
            notes: z.string().max(4000).optional(),
          })
          .parse(raw);
        const updated = db.updateNpcDisposition(
          identity.campaignId,
          payload.npcId,
          payload.disposition,
          payload.notes,
        );
        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "social",
          label: `${updated.name} Attitude`,
          dice: "—",
          total: 0,
          detail: `${updated.name}'s disposition set to ${updated.disposition.toUpperCase()}.${updated.notes ? ` Notes: ${updated.notes}` : ""}`,
        });
        return { ok: true, npc: updated };
      }),
    );

    socket.on(
      "combat:next_turn",
      action((raw: unknown) => {
        callerOrHostOnly();
        const combat = db.getCombatState(identity.campaignId);
        if (!combat || combat.status !== "active") throw new Error("No active combat");

        if (!combat.winnerCombatantId) throw new Error("Select the physical initiative winner first");
        const seats = combatSeats(combat);
        const nextSeat = seats[(seats.indexOf(activeSeat(combat)!) + 1) % seats.length];
        const nextIdx = seatIndex(combat, nextSeat);
        const nextRound = combat.round + (nextSeat === combat.winnerCombatantId ? 1 : 0);

        const updated: CombatState = {
          ...combat,
          activeIndex: nextIdx,
          round: nextRound,
        };
        db.saveCombatState(identity.campaignId, updated);

        const currentCombatant = updated.combatants[nextIdx];
        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "combat",
          label: `Round ${nextRound} · Active Turn: ${currentCombatant?.name ?? "Next"}`,
          dice: "—",
          total: nextRound,
          detail: `${currentCombatant?.name ?? "Combatant"}'s turn to act.`,
        });

        return { combat: updated };
      }),
    );

    socket.on("combat:set_winner", action((raw: unknown) => {
      callerOrHostOnly();
      const { seatId } = z.object({ seatId: z.string() }).parse(raw);
      const combat = db.getCombatState(identity.campaignId);
      if (!combat || !combatSeats(combat).includes(seatId)) throw new Error("Choose an occupied table seat");
      combat.winnerCombatantId = seatId;
      combat.activeIndex = seatIndex(combat, seatId);
      combat.round = 1;
      db.saveCombatState(identity.campaignId, combat);
      return { combat };
    }));

    socket.on(
      "combat:set_initiative",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            combatantId: z.string(),
            initiative: z.number().int(),
          })
          .parse(raw);
        const combat = db.getCombatState(identity.campaignId);
        if (!combat || combat.status !== "active") throw new Error("No active combat");

        const target = combat.combatants.find((c) => c.id === payload.combatantId);
        if (!target) throw new Error("Combatant not found");

        target.initiative = payload.initiative;
        // A recorded physical check never changes physical seating.
        db.saveCombatState(identity.campaignId, combat);

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "combat",
          label: `${target.name} Initiative Set`,
          dice: "—",
          total: payload.initiative,
          detail: `${target.name}'s initiative set to ${payload.initiative}. Physical result recorded; seating preserved.`,
        });

        return { combat };
      }),
    );

    socket.on(
      "combat:toggle_condition",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            combatantId: z.string(),
            condition: z.string().trim().min(1).max(50),
          })
          .parse(raw);
        const combat = db.getCombatState(identity.campaignId);
        if (!combat || combat.status !== "active") throw new Error("No active combat");

        const target = combat.combatants.find((c) => c.id === payload.combatantId);
        if (!target) throw new Error("Combatant not found");

        const has = target.conditions.includes(payload.condition);
        target.conditions = has
          ? target.conditions.filter((c) => c !== payload.condition)
          : [...target.conditions, payload.condition];

        if (target.kind === "pc") {
          const state = db.getState(identity.campaignId, "host", null, "");
          const char = state.characters.find((c) => c.id === target.refId);
          if (char) {
            db.updateCharacter(identity.campaignId, {
              ...char,
              conditions: target.conditions,
            });
          }
        }

        db.saveCombatState(identity.campaignId, combat);

        db.addRoll(identity.campaignId, {
          actor: actor(),
          kind: "combat",
          label: `${target.name} Condition ${has ? "Cleared" : "Applied"}`,
          dice: "—",
          total: 0,
          detail: `${has ? "Cleared" : "Inflicted"} condition [${payload.condition}] on ${target.name}.`,
        });

        return { combat };
      }),
    );

    socket.on(
      "combat:update_hp",
      mutationAction(
        "combat:update_hp",
        (raw: unknown) => {
          const rawObj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
          const payload = z
            .object({
              combatantId: z.string(),
              delta: z.number().int().optional(),
              currentHp: z.number().int().optional(),
              damage: z.number().int().positive().optional(),
              heal: z.number().int().positive().optional(),
            })
            .refine(
              (data) =>
                data.delta !== undefined ||
                data.currentHp !== undefined ||
                data.damage !== undefined ||
                data.heal !== undefined,
              { message: "Provide delta, currentHp, damage, or heal" },
            )
            .parse(rawObj);

          const combat = db.getCombatState(identity.campaignId);
          if (!combat || combat.status !== "active") throw new Error("No active combat");

          const target = combat.combatants.find((c) => c.id === payload.combatantId);
          if (!target) throw new Error("Combatant not found");

          if (identity.role !== "host" && target.kind === "pc" && target.refId !== identity.characterId) {
            callerOrHostOnly();
          }

          const prevHp = target.currentHp;
          let delta = 0;
          if (payload.delta !== undefined) {
            delta = payload.delta;
          } else if (payload.damage !== undefined) {
            delta = -payload.damage;
          } else if (payload.heal !== undefined) {
            delta = payload.heal;
          } else if (payload.currentHp !== undefined) {
            delta = payload.currentHp - prevHp;
          }

          const newHp = Math.max(0, Math.min(target.maxHp, prevHp + delta));
          target.currentHp = newHp;

          if (target.kind === "pc") {
            if (newHp === 0 && !target.conditions.includes("dying")) {
              target.conditions = [...target.conditions.filter((c) => c !== "conscious"), "dying", "unconscious"];
              target.stabilized = false;
            } else if (newHp > 0 && prevHp === 0) {
              target.conditions = target.conditions.filter((c) => c !== "dying" && c !== "unconscious");
              target.deathStrikes = 0;
              target.stabilized = true;
            }

            const state = db.getState(identity.campaignId, "host", null, "");
            const char = state.characters.find((c) => c.id === target.refId);
            if (char) {
              db.updateCharacter(identity.campaignId, {
                ...char,
                hp: newHp,
                deathStrikes: target.deathStrikes,
                stabilized: target.stabilized,
                conditions: target.conditions,
              });
            }
          } else if (target.kind === "monster") {
            if (newHp === 0 && !target.conditions.includes("defeated")) {
              target.conditions.push("defeated");
            }
          }

          db.saveCombatState(identity.campaignId, combat);
          if (target.kind === "monster") db.db.prepare("UPDATE encounter_monsters SET current_hp = ? WHERE id = ? AND encounter_id = ?").run(newHp, target.refId, combat.encounterId);

          const actionDesc =
            delta < 0
              ? `took ${Math.abs(delta)} damage`
              : delta > 0
                ? `healed ${delta} HP`
                : `HP set to ${newHp}`;

          db.addRoll(identity.campaignId, {
            actor: actor(),
            kind: "combat",
            label: `${target.name} HP Update`,
            dice: `${delta >= 0 ? "+" : ""}${delta}`,
            total: target.kind === "monster" ? delta : newHp,
            detail: target.kind === "monster" ? `${target.name}: ${delta < 0 ? `${Math.abs(delta)} damage recorded` : "healing recorded"}. ${computeHpStatus(newHp, target.maxHp)}.` : `${target.name} ${actionDesc} (${prevHp} -> ${newHp}/${target.maxHp} HP)`,
          });

          return { combat };
        },
        { auth: "none" },
      ),
    );

    socket.on(
      "combat:death_save",
      mutationAction(
        "combat:death_save",
        (raw: unknown) => {
          const payload = z
            .object({
              combatantId: z.string(),
              diceMode: z.enum(["digital", "physical"]).default("digital"),
              physicalRoll: z.number().int().min(1).max(20).optional(),
            })
            .parse(raw);

          const combat = db.getCombatState(identity.campaignId);
          if (!combat) throw new Error("No active combat");

          const target = combat.combatants.find((c) => c.id === payload.combatantId);
          if (!target || target.kind !== "pc") throw new Error("Invalid combatant for death save");

          if (identity.role !== "host" && target.refId !== identity.characterId) {
            throw new Error("You can only roll death saves for your own character");
          }

          if (target.currentHp > 0) throw new Error("Character is conscious, no death save needed");
          if (target.stabilized) throw new Error("Character is already stabilized");
          if (target.conditions.includes("dead")) throw new Error("Character is dead");

          const state = db.getState(identity.campaignId, "host", null, "");
          const char = state.characters.find((c) => c.id === target.refId);
          if (!char) throw new Error("Character not found");
          const conMod = abilityModifier(char.abilities.con);

          const d20 =
            payload.diceMode === "physical" && payload.physicalRoll !== undefined
              ? payload.physicalRoll
              : rollDie(20);
          const total = d20 + conMod;

          let detail = "";
          if (d20 === 20) {
            target.currentHp = 1;
            target.conditions = target.conditions.filter((c) => c !== "dying" && c !== "unconscious");
            target.deathStrikes = 0;
            target.stabilized = true;
            detail = `NATURAL 20! ${target.name} gasps for breath and awakens with 1 HP!`;
          } else if (total >= 10) {
            target.stabilized = true;
            detail = `Roll ${d20} + ${conMod} = ${total} (>= 10): ${target.name} has stabilized!`;
          } else {
            const addedStrikes = d20 === 1 ? 2 : 1;
            target.deathStrikes = (target.deathStrikes ?? 0) + addedStrikes;
            if (target.deathStrikes >= 3) {
              target.conditions = [...target.conditions.filter((c) => c !== "dying"), "dead"];
              detail = `CRITICAL FAILURE! Roll ${d20} + ${conMod} = ${total}. Death strikes: ${target.deathStrikes}/3. ${target.name} has succumbed to their wounds and DIED.`;
            } else {
              detail = `Failed death save (Roll ${d20} + ${conMod} = ${total}). Death strikes: ${target.deathStrikes}/3.`;
            }
          }

          db.updateCharacter(identity.campaignId, {
            ...char,
            hp: target.currentHp,
            deathStrikes: target.deathStrikes,
            stabilized: target.stabilized,
            conditions: target.conditions,
          });

          db.saveCombatState(identity.campaignId, combat);
          db.addRoll(identity.campaignId, {
            actor: target.name,
            kind: "save",
            label: `${target.name}: Death Save`,
            dice: "1d20",
            total,
            detail,
          });

          return { combat, target };
        },
        { auth: "none" },
      ),
    );

    socket.on(
      "combat:morale_check",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            moraleScore: z.number().int().default(7),
            diceMode: z.enum(["digital", "physical"]).default("digital"),
            physicalRoll: z.number().int().optional(),
          })
          .parse(raw);
        const combat = db.getCombatState(identity.campaignId);
        if (!combat) throw new Error("No active combat");

        const rollTotal =
          payload.diceMode === "physical" && payload.physicalRoll !== undefined
            ? payload.physicalRoll
            : moraleRoll(payload.moraleScore).total;
        const passed = rollTotal <= payload.moraleScore;
        combat.moraleTriggerChecked = true;
        db.saveCombatState(identity.campaignId, combat);

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "morale",
          label: `${payload.diceMode === "physical" ? "(Physical) " : ""}Monster Morale Check (Score: ${payload.moraleScore})`,
          dice: "2d6",
          total: rollTotal,
          detail: passed
            ? `Roll ${rollTotal} <= ${payload.moraleScore}: Monsters hold their ground and fight on!`
            : `Roll ${rollTotal} > ${payload.moraleScore}: MONSTERS ROUT! The enemies break ranks and attempt to flee or surrender!`,
        });

        return { rollResult: { total: rollTotal }, passed };
      }),
    );

    socket.on(
      "combat:end",
      action((raw: unknown) => {
        callerOrHostOnly();
        const combat = db.getCombatState(identity.campaignId);
        if (!combat) throw new Error("No active combat to end");

        if (combat.status === "resolved") {
          return { combat, reward: db.getRewards(identity.campaignId).find((reward) =>
            reward.sourceType === "encounter" && reward.sourceId === String(combat.encounterId)) ?? null };
        }
        const sourceGraph = db.getDungeonGraph(identity.campaignId);
        const sourceRoom = sourceGraph?.nodes.find((room) => room.encounter?.encounterId === combat.encounterId);
        combat.status = "resolved";
        db.saveCombatState(identity.campaignId, combat);

        const livingMonsters = combat.combatants.filter(
          (c) => c.kind === "monster" && !c.conditions.includes("defeated") && c.currentHp > 0,
        );
        const victory = livingMonsters.length === 0;

        let rewardRecord: RewardRecord | null = db.getRewards(identity.campaignId).find((reward) =>
          reward.sourceType === "encounter" && reward.sourceId === String(combat.encounterId)) ?? null;
        if (victory && !sourceRoom && !rewardRecord) {
          const groupId = `enc_${combat.encounterId}`;
          const encGroup = db.getEncounterGroup(identity.campaignId, groupId);
          if (encGroup) {
            const roll = db.getTreasureRoll(identity.campaignId, encGroup.id);
            if (roll && !roll.present) {
              rewardRecord = null;
            } else if (roll && roll.present && roll.sourceId) {
              const src = db.getRewardSource(identity.campaignId, roll.sourceId);
              if (src) {
                rewardRecord = {
                  id: `reward-${Date.now()}`,
                  campaignId: identity.campaignId,
                  sourceType: "encounter",
                  sourceId: String(combat.encounterId),
                  coins: src.coins,
                  items: [...src.items],
                  claimed: false,
                  allocations: {},
                  quality: src.quality,
                  xpValue: src.xpValue,
                  groupId: encGroup.id,
                };
                db.saveReward(identity.campaignId, rewardRecord);
              }
            }
          } else {
            const reward = generateUnguardedTreasure(db.averageActivePartyLevel(identity.campaignId));
            rewardRecord = {
              id: `reward-${Date.now()}`,
              campaignId: identity.campaignId,
              sourceType: "encounter",
              sourceId: String(combat.encounterId),
              coins: reward.coins,
              items: reward.items,
              claimed: false,
              allocations: {},
            };
            db.saveReward(identity.campaignId, rewardRecord);
          }
        }
        if (victory && sourceRoom?.encounter && sourceGraph) {
          sourceRoom.encounter.defeated = true;
          sourceRoom.resolution = { outcome: "defeated", notes: "Room opponents defeated in combat; search and secure any treasure separately." };
          db.saveDungeonGraph(identity.campaignId, sourceGraph);
        }
        db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE campaign_id = ? AND id = ?")
          .run(identity.campaignId, combat.encounterId);

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "combat",
          label: "Combat Resolved",
          dice: "—",
          total: 0,
          detail: victory
            ? sourceRoom ? "Room opponents defeated. Determine whether treasure is present and accessible at the table." : "Enemies vanquished! Spoils of battle await allocation."
            : "Combat concluded.",
        });

        return { combat, reward: rewardRecord };
      }),
    );

    // --- M6: Treasure Allocation, Return & Session Recovery Handlers ---

    socket.on(
      "treasure:generate",
      action((raw: unknown) => {
        callerOrHostOnly();
        const payload = z
          .object({
            sourceType: z.enum(["dungeon_room", "encounter", "situation_deed"]).default("dungeon_room"),
            sourceId: z.string().default("manual"),
            level: z.number().int().min(1).default(1),
          })
          .parse(raw);

        const treasure = generateUnguardedTreasure(payload.level);
        const reward: RewardRecord = {
          id: `reward-${Date.now()}`,
          campaignId: identity.campaignId,
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          coins: { cp: treasure.coins.cp, sp: treasure.coins.sp, gp: treasure.coins.gp },
          items: treasure.items,
          claimed: false,
          allocations: {},
        };
        db.saveReward(identity.campaignId, reward);

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "reward",
          label: "Treasure Discovered",
          dice: "—",
          total: treasure.coins.gp ?? 0,
          detail: `Found: ${treasure.coins.gp ?? 0} gp, ${treasure.coins.sp ?? 0} sp · Items: ${
            treasure.items.length > 0 ? treasure.items.join(", ") : "None"
          }`,
        });

        return { reward };
      }),
    );

    socket.on(
      "treasure:allocate",
      mutationAction("treasure:allocate", (raw: unknown) => {
        const payload = z
          .object({
            rewardId: z.string(),
            allocationType: z.enum(["split_coins", "assign_item", "claim_all"]),
            characterId: z.number().int().optional(),
            itemIndex: z.number().int().optional(),
          })
          .parse(raw);

        const rewards = db.getRewards(identity.campaignId);
        const reward = rewards.find((r) => r.id === payload.rewardId);
        if (!reward) throw new Error("Reward record not found");

        const state = db.getState(identity.campaignId, "host", null, "");
        const livingChars = state.characters.filter((c) => !c.conditions?.includes("dead"));

        if (payload.allocationType === "split_coins") {
          const rewardService = new RewardService(db);
          const splitRes = rewardService.splitRewardCoins(identity.campaignId, payload.rewardId);
          db.addRoll(identity.campaignId, {
            actor: actor(),
            kind: "reward",
            label: "Coins Divided Evenly",
            dice: "—",
            total: splitRes.copperPerChar,
            detail: splitRes.log,
          });
          const updatedReward = db.getRewards(identity.campaignId).find((r) => r.id === payload.rewardId) ?? reward;
          return { reward: updatedReward };
        } else if (payload.allocationType === "assign_item") {
          if (payload.characterId === undefined || payload.itemIndex === undefined) {
            throw new Error("Target character and item index required");
          }
          const char = livingChars.find((c) => c.id === payload.characterId);
          if (!char) throw new Error("Character not found");

          const itemName = reward.items[payload.itemIndex];
          if (!itemName) throw new Error("Item not found in reward");

          const itemDef = ITEMS.find(
            (i) => i.id === itemName || i.name.toLowerCase() === itemName.toLowerCase(),
          );
          const itemSlots = itemDef?.slots ?? 1;
          const currentSlots = calculateCarriedSlots(char.inventory ?? []);
          const maxSlots = calculateGearSlots({
            className: char.className,
            abilities: { str: char.abilities.str, con: char.abilities.con },
          });

          if (currentSlots + itemSlots > maxSlots) {
            throw new Error(
              `${char.name} does not have enough gear slots (${currentSlots}/${maxSlots} carried)`,
            );
          }

          const newItem: InventoryItem = {
            instanceId: randomInt(100000, 999999).toString(),
            itemId: itemDef?.id ?? itemName,
            name: itemDef?.name ?? itemName,
            kind: itemDef?.kind ?? "gear",
            slots: itemSlots,
            equipped: false,
            quantity: 1,
            baseAc: itemDef?.baseAc,
            acBonus: itemDef?.acBonus,
            damage: itemDef?.damage,
          };

          const inv = [...(char.inventory ?? []), newItem];
          db.updateCharacter(identity.campaignId, { ...char, inventory: inv });

          reward.items.splice(payload.itemIndex, 1);
          reward.allocations[`item-${Date.now()}`] = { target: "character", characterId: char.id };

          db.addRoll(identity.campaignId, {
            actor: actor(),
            kind: "reward",
            label: `Loot Allocated: ${newItem.name}`,
            dice: "—",
            total: 0,
            detail: `${newItem.name} assigned to ${char.name} (${currentSlots + itemSlots}/${maxSlots} slots).`,
          });
        }

        if (
          (reward.coins.gp ?? 0) === 0 &&
          (reward.coins.sp ?? 0) === 0 &&
          (reward.coins.cp ?? 0) === 0 &&
          reward.items.length === 0
        ) {
          reward.claimed = true;
        }

        db.saveReward(identity.campaignId, reward);
        return { reward };
      }),
    );

    socket.on(
      "session:award_xp",
      mutationAction("session:award_xp", (raw: unknown) => {
        const payload = z
          .object({
            amount: z.number().int().min(1),
            reason: z.string().default("Expedition Accomplishment"),
            characterIds: z.array(z.number().int()).optional(),
            sourceId: z.string().optional(),
          })
          .parse(raw);

        if (payload.sourceId && db.isXpAwarded(identity.campaignId, payload.sourceId)) {
          return { awarded: false, alreadyAwarded: true };
        }

        const state = db.getState(identity.campaignId, "host", null, "");
        const targets = payload.characterIds
          ? state.characters.filter((c) => payload.characterIds!.includes(c.id))
          : state.characters.filter((c) => !c.conditions?.includes("dead"));

        let awardSeq = 1;
        for (const char of targets) {
          const prog = applyXpEvent(char, payload.amount);
          db.updateCharacter(identity.campaignId, prog.character);
          if (payload.sourceId) {
            db.recordXpAwardRecipient({
              campaignId: identity.campaignId,
              sourceId: payload.sourceId,
              characterId: char.id,
              awardSequence: awardSeq++,
              amount: payload.amount,
              levelBefore: prog.levelBefore,
              xpBefore: prog.xpBefore,
              levelAfter: prog.levelAfter,
              xpAfter: prog.xpAfter,
              resetLoss: prog.resetLoss,
              status: "applied",
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (payload.sourceId) {
          db.recordXpAward(
            identity.campaignId,
            payload.sourceId,
            payload.amount,
            payload.reason,
            targets.map((c) => c.id),
          );
        }

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "campaign",
          label: `XP Awarded: +${payload.amount} XP`,
          dice: "—",
          total: payload.amount,
          detail: `Awarded ${payload.amount} XP to ${targets.map((c) => c.name).join(", ")} (${payload.reason}).`,
        });

        return { awarded: true, alreadyAwarded: false };
      }),
    );

    socket.on(
      "session:return_sanctuary",
      mutationAction("session:return_sanctuary", (raw: unknown) => {
        callerOrHostOnly();
        requireHaven();
        const state = db.getState(identity.campaignId, "host", null, "");

        for (const char of state.characters) {
          if (char.conditions?.includes("dead")) continue;
          const refreshedSpells = (char.spells ?? []).map((s) => ({
            ...s,
            available: !s.penanceRequired,
          }));
          db.updateCharacter(identity.campaignId, {
            ...char,
            hp: char.maxHp,
            fatigue: 0,
            deathStrikes: 0,
            stabilized: true,
            conditions: [],
            spells: refreshedSpells,
          });
        }

        db.resupplyPartyRations(identity.campaignId, 12);
        db.setCampaignPhase(identity.campaignId, "sanctuary");
        db.setActiveSite(identity.campaignId, null);

        const activeCombat = db.getCombatState(identity.campaignId);
        if (activeCombat && activeCombat.status === "active") {
          activeCombat.status = "resolved";
          db.saveCombatState(identity.campaignId, activeCombat);
        }

        db.addRoll(identity.campaignId, {
          actor: "Table",
          kind: "campaign",
          label: "Party Returned to Haven Sanctuary",
          dice: "—",
          total: 0,
          detail:
            "The expedition concludes. All living adventurers recover to full health, refresh spells, and clear fatigue in the warmth of the sanctuary.",
        });

        return { returned: true };
      }),
    );

    socket.on(
      "site:resolve_deed",
      action((raw: unknown) => {
        callerOrHostOnly();
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

        const graph = db.getDungeonGraph(identity.campaignId, payload.siteId);
        const objectiveRoom = graph?.nodes.find((room) => room.objective?.deedId === payload.deed);
        if (graph?.nodes.some((room) => room.objective) &&
            (!objectiveRoom || objectiveRoom.id !== graph.currentRoomId)) {
          throw new Error("Reach the site's objective before resolving its deed");
        }
        const generated = objectiveRoom?.objective?.generated;
        const res = generated && generated.id === payload.deed
          ? new RewardService(db).resolveStoryAward(identity.campaignId, payload.deed,
            "site_objective", "table_ruling", payload.details)
          : resolveOutcome(db, identity.campaignId, payload.deed, {
            outcomeType: "site_objective",
            notes: payload.details || `Resolved deed ${payload.deed} at site ${payload.siteId}`,
          });

        db.updateSiteState(payload.siteId, `Deed Resolved: ${payload.deed}`);
        if (objectiveRoom?.objective && graph) {
          objectiveRoom.objective.completed = true;
          objectiveRoom.objective.notes = payload.details;
          db.saveDungeonGraph(identity.campaignId, graph);
        }

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
        callerOrHostOnly();
        requireEncounterResolved();
        const graph = db.getDungeonGraph(identity.campaignId, camp?.active_site_id);
        if (!camp?.active_site_id) throw new Error("No active site to exit");
        if (graph?.siteStructure && graph.currentRoomId !== graph.entryRoomId) {
          throw new Error("Backtrack to the surface entrance before leaving the site; you may retreat before entering the next section");
        }
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
    hostAddress: resolvedHost.address,
    interfaceName: resolvedHost.interfaceName,
    metrics,
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
