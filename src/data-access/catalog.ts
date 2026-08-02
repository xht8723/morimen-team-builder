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

export const gameCatalog = rawCatalog as GameCatalog;

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
