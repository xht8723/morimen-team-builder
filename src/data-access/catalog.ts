import { z } from "zod";

import rawCatalog from "@/generated/game-data.json";

import type {
  Awakener,
  Covenant,
  EntityKind,
  GameCatalog,
  GameEntity,
  Posse,
  Wheel,
} from "@/domain/types";

const assetsSchema = z.object({
  thumb: z.string(),
  full: z.string(),
});

const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  lineupToken: z.string().nullable(),
  assets: assetsSchema,
  description: z.string(),
  aliases: z.array(z.string()),
  searchTags: z.array(z.string()),
});

const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.object({
    schemaVersion: z.number(),
    gameDataVersion: z.string(),
    buildId: z.string(),
    generatedAt: z.string(),
  }),
  filters: z.object({
    realms: z.array(z.string()),
    wheelMainstats: z.array(z.string()),
    wheelRarities: z.array(z.string()),
    posseRealms: z.array(z.string()),
  }),
  entities: z.object({
    awakeners: z.array(
      baseSchema.extend({
        kind: z.literal("awakener"),
        realm: z.string(),
        rarity: z.string(),
        type: z.string(),
        faction: z.string().nullable(),
      }),
    ),
    wheels: z.array(
      baseSchema.extend({
        kind: z.literal("wheel"),
        realm: z.string(),
        rarity: z.string(),
        mainstatKey: z.string(),
        ownerAwakenerName: z.string().nullable(),
      }),
    ),
    covenants: z.array(
      baseSchema.extend({
        kind: z.literal("covenant"),
        acquisitionSource: z.string().nullable(),
      }),
    ),
    posses: z.array(
      baseSchema.extend({
        kind: z.literal("posse"),
        realm: z.string(),
        acquisitionSource: z.string().nullable(),
      }),
    ),
  }),
});

export const gameCatalog = catalogSchema.parse(rawCatalog) as GameCatalog;

export const awakenersById = new Map<string, Awakener>(
  gameCatalog.entities.awakeners.map((entity) => [entity.id, entity]),
);
export const wheelsById = new Map<string, Wheel>(
  gameCatalog.entities.wheels.map((entity) => [entity.id, entity]),
);
export const covenantsById = new Map<string, Covenant>(
  gameCatalog.entities.covenants.map((entity) => [entity.id, entity]),
);
export const possesById = new Map<string, Posse>(
  gameCatalog.entities.posses.map((entity) => [entity.id, entity]),
);

export const entityMaps = {
  awakener: awakenersById,
  wheel: wheelsById,
  covenant: covenantsById,
  posse: possesById,
};

export function getEntity(kind: EntityKind, id: string | null): GameEntity | undefined {
  if (!id) return undefined;
  return entityMaps[kind].get(id) as GameEntity | undefined;
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
