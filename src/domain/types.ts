export type EntityKind = "awakener" | "wheel" | "covenant" | "posse";

export const SLOT_INDICES = [0, 1, 2, 3] as const;
export const WHEEL_INDICES = [0, 1] as const;

export type SlotIndex = (typeof SLOT_INDICES)[number];
export type WheelIndex = (typeof WHEEL_INDICES)[number];

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
  selectable: boolean;
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
  schemaVersion: 2;
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
  | { kind: "awakener"; teamId: string; slotIndex: SlotIndex }
  | { kind: "wheel"; teamId: string; slotIndex: SlotIndex; wheelIndex: WheelIndex }
  | { kind: "covenant"; teamId: string; slotIndex: SlotIndex }
  | { kind: "posse"; teamId: string };

export type AssignmentFailureReason =
  | "targetMissing"
  | "unknownCovenant"
  | "unknownEntity"
  | "entityNotSelectable"
  | "realmMove";

export interface AssignmentResult {
  ok: boolean;
  teams: Team[];
  reason?: AssignmentFailureReason;
  moved?: boolean;
}

export interface ImportConflict {
  entity: EntityRef & { kind: Exclude<EntityKind, "covenant"> };
  teamId: string;
}
