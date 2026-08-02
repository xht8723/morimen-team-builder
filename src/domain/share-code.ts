import {
  awakenersById,
  covenantsById,
  gameCatalog,
  possesById,
  wheelsById,
} from "@/data-access/catalog";

import { createEmptySlot, isTeamRealmValid } from "./team-rules";
import { SLOT_INDICES, WHEEL_INDICES, type BaseEntity, type EntityRef, type Team } from "./types";

const EMPTY_TOKEN = "a";

interface EncodeSuccess {
  ok: true;
  code: string;
}

export type CodecFailureReason =
  | "noToken"
  | "invalidWrapper"
  | "unknownAwakener"
  | "unknownWheel"
  | "unknownCovenantToken"
  | "unknownPosse"
  | "trailingData"
  | "duplicateEntity"
  | "importRealm";

export interface CodecFailure {
  ok: false;
  reason: CodecFailureReason;
  entities?: EntityRef[];
}

export type EncodeResult = EncodeSuccess | CodecFailure;
export type DecodeResult = { ok: true; team: Team } | CodecFailure;

function tokenFor(entity: BaseEntity | undefined, missing: EntityRef[]) {
  if (!entity) return EMPTY_TOKEN;
  if (!entity.lineupToken) {
    missing.push({ kind: entity.kind, id: entity.id });
    return EMPTY_TOKEN;
  }
  return entity.lineupToken;
}

export function encodeTeam(team: Team): EncodeResult {
  const missing: EntityRef[] = [];
  const fields = [
    ...team.slots.map((slot) => tokenFor(awakenersById.get(slot.awakenerId ?? ""), missing)),
    ...team.slots.flatMap((slot) =>
      slot.wheelIds.map((id) => tokenFor(wheelsById.get(id ?? ""), missing)),
    ),
    ...team.slots.map((slot) => tokenFor(covenantsById.get(slot.covenantId ?? ""), missing)),
    tokenFor(possesById.get(team.posseId ?? ""), missing),
  ];

  if (missing.length > 0) {
    return {
      ok: false,
      reason: "noToken",
      entities: missing,
    };
  }
  return { ok: true, code: `@@${fields.join("")}@@` };
}

interface TokenTrieNode {
  children: Map<string, TokenTrieNode>;
  value?: string | null;
}

function makeTokenTrie(entities: BaseEntity[]): TokenTrieNode {
  const root: TokenTrieNode = { children: new Map() };
  const entries = [
    { token: EMPTY_TOKEN, id: null },
    ...entities.flatMap((entity) =>
      entity.lineupToken ? [{ token: entity.lineupToken, id: entity.id }] : [],
    ),
  ];
  for (const entry of entries) {
    let node = root;
    for (const character of entry.token) {
      let child = node.children.get(character);
      if (!child) {
        child = { children: new Map() };
        node.children.set(character, child);
      }
      node = child;
    }
    node.value = entry.id;
  }
  return root;
}

const tokenTries = {
  awakeners: makeTokenTrie(gameCatalog.entities.awakeners),
  wheels: makeTokenTrie(gameCatalog.entities.wheels),
  covenants: makeTokenTrie(gameCatalog.entities.covenants),
  posses: makeTokenTrie(gameCatalog.entities.posses),
};

function readLongestToken(payload: string, offset: number, trie: TokenTrieNode) {
  let node = trie;
  let cursor = offset;
  let match: { cursor: number; value: string | null } | null = null;
  while (cursor < payload.length) {
    const next = node.children.get(payload[cursor]);
    if (!next) break;
    node = next;
    cursor += 1;
    if ("value" in node) {
      match = { cursor, value: node.value ?? null };
    }
  }
  return match;
}

function readFields(payload: string, offset: number, count: number, trie: TokenTrieNode) {
  const values: (string | null)[] = [];
  let cursor = offset;
  for (let index = 0; index < count; index += 1) {
    const match = readLongestToken(payload, cursor, trie);
    if (!match) return { ok: false as const, cursor, values };
    values.push(match.value);
    cursor = match.cursor;
  }
  return { ok: true as const, cursor, values };
}

export function decodeTeam(input: string): DecodeResult {
  const match = input.match(/@@([A-Za-z0-9]+)@@/);
  if (!match) return { ok: false, reason: "invalidWrapper" };
  const payload = match[1];
  let cursor = 0;

  const awakeners = readFields(payload, cursor, SLOT_INDICES.length, tokenTries.awakeners);
  if (!awakeners.ok) return { ok: false, reason: "unknownAwakener" };
  cursor = awakeners.cursor;

  const wheels = readFields(
    payload,
    cursor,
    SLOT_INDICES.length * WHEEL_INDICES.length,
    tokenTries.wheels,
  );
  if (!wheels.ok) return { ok: false, reason: "unknownWheel" };
  cursor = wheels.cursor;

  const covenants = readFields(payload, cursor, SLOT_INDICES.length, tokenTries.covenants);
  if (!covenants.ok) return { ok: false, reason: "unknownCovenantToken" };
  cursor = covenants.cursor;

  const posses = readFields(payload, cursor, 1, tokenTries.posses);
  if (!posses.ok) return { ok: false, reason: "unknownPosse" };
  cursor = posses.cursor;
  if (cursor !== payload.length) {
    return { ok: false, reason: "trailingData" };
  }

  const uniqueEntityIds = [...awakeners.values, ...wheels.values].filter(
    (id): id is string => id !== null,
  );
  if (new Set(uniqueEntityIds).size !== uniqueEntityIds.length) {
    return { ok: false, reason: "duplicateEntity" };
  }

  const team: Team = {
    id: "imported-team",
    name: "imported-team",
    posseId: posses.values[0],
    slots: SLOT_INDICES.map((slotIndex) => ({
      ...createEmptySlot(),
      awakenerId: awakeners.values[slotIndex],
      wheelIds: [wheels.values[slotIndex * 2], wheels.values[slotIndex * 2 + 1]],
      covenantId: covenants.values[slotIndex],
    })) as Team["slots"],
  };

  if (!isTeamRealmValid(team)) {
    return { ok: false, reason: "importRealm" };
  }
  return { ok: true, team };
}
