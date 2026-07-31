export type EntityKind = "awakener" | "wheel" | "covenant" | "posse";

export interface EntityAssets {
  thumb: string;
  full: string;
}

export interface BaseEntity {
  id: string;
  kind: EntityKind;
  name: string;
  lineupToken: string | null;
  assets: EntityAssets;
  description: string;
  aliases: string[];
  searchTags: string[];
}

export interface Awakener extends BaseEntity {
  kind: "awakener";
  realm: string;
  rarity: string;
  type: string;
  faction: string | null;
}

export interface Wheel extends BaseEntity {
  kind: "wheel";
  realm: string;
  rarity: string;
  mainstatKey: string;
  ownerAwakenerName: string | null;
}

export interface Covenant extends BaseEntity {
  kind: "covenant";
  acquisitionSource: string | null;
}

export interface Posse extends BaseEntity {
  kind: "posse";
  realm: string;
  acquisitionSource: string | null;
}

export type GameEntity = Awakener | Wheel | Covenant | Posse;

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

export interface GameCatalog {
  schemaVersion: 1;
  source: {
    schemaVersion: number;
    gameDataVersion: string;
    buildId: string;
    generatedAt: string;
  };
  filters: {
    realms: string[];
    wheelMainstats: string[];
    wheelRarities: string[];
    posseRealms: string[];
  };
  entities: {
    awakeners: Awakener[];
    wheels: Wheel[];
    covenants: Covenant[];
    posses: Posse[];
  };
}

export interface LoadoutSlot {
  awakenerId: string | null;
  wheelIds: [string | null, string | null];
  covenantId: string | null;
}

export interface Team {
  id: string;
  name: string;
  posseId: string | null;
  slots: [LoadoutSlot, LoadoutSlot, LoadoutSlot, LoadoutSlot];
}

export type PickerTarget =
  | { kind: "awakener"; teamId: string; slotIndex: number }
  | { kind: "wheel"; teamId: string; slotIndex: number; wheelIndex: 0 | 1 }
  | { kind: "covenant"; teamId: string; slotIndex: number }
  | { kind: "posse"; teamId: string };

export interface AssignmentResult {
  ok: boolean;
  teams: Team[];
  message?: string;
  moved?: boolean;
}

export interface ImportConflict {
  entity: EntityRef & { kind: Exclude<EntityKind, "covenant"> };
  teamId: string;
}
