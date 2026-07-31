import {
  awakenersById,
  covenantsById,
  getEntity,
  possesById,
  wheelsById,
} from "@/data-access/catalog";
import i18n from "@/i18n";

import type {
  AssignmentResult,
  EntityKind,
  ImportConflict,
  LoadoutSlot,
  PickerTarget,
  Team,
} from "./types";

export const TEAM_COUNT = 5;
export const SLOT_COUNT = 4;
export const MAX_REALMS_PER_TEAM = 2;

export function createEmptySlot(): LoadoutSlot {
  return { awakenerId: null, wheelIds: [null, null], covenantId: null };
}

export function createDefaultTeams(): Team[] {
  return Array.from({ length: TEAM_COUNT }, (_, index) => ({
    id: `team-${String(index + 1)}`,
    name: i18n.t("builder.defaultTeam", { number: index + 1 }),
    posseId: null,
    slots: [createEmptySlot(), createEmptySlot(), createEmptySlot(), createEmptySlot()],
  }));
}

export function cloneTeams(teams: Team[]): Team[] {
  return teams.map((team) => ({
    ...team,
    slots: team.slots.map((slot) => ({
      ...slot,
      wheelIds: [...slot.wheelIds] as [string | null, string | null],
    })) as Team["slots"],
  }));
}

export function getTeamRealms(team: Team): string[] {
  return [
    ...new Set(
      team.slots.flatMap((slot) => {
        const realm = slot.awakenerId ? awakenersById.get(slot.awakenerId)?.realm : undefined;
        return realm ? [realm] : [];
      }),
    ),
  ];
}

export function isTeamRealmValid(team: Team): boolean {
  return getTeamRealms(team).length <= MAX_REALMS_PER_TEAM;
}

function findTargetUsage(
  teams: Team[],
  kind: Exclude<EntityKind, "covenant">,
  entityId: string,
): PickerTarget | null {
  for (const team of teams) {
    if (kind === "posse" && team.posseId === entityId) {
      return { kind, teamId: team.id };
    }
    for (const [slotIndex, slot] of team.slots.entries()) {
      if (kind === "awakener" && slot.awakenerId === entityId) {
        return { kind, teamId: team.id, slotIndex };
      }
      if (kind === "wheel") {
        const wheelIndex = slot.wheelIds.findIndex((id) => id === entityId);
        if (wheelIndex >= 0) {
          return {
            kind,
            teamId: team.id,
            slotIndex,
            wheelIndex: wheelIndex as 0 | 1,
          };
        }
      }
    }
  }
  return null;
}

export function isEntityAssigned(
  teams: Team[],
  kind: Exclude<EntityKind, "covenant">,
  entityId: string,
): boolean {
  return findTargetUsage(teams, kind, entityId) !== null;
}

function getTargetValue(teams: Team[], target: PickerTarget): string | null {
  const team = teams.find((item) => item.id === target.teamId);
  if (!team) return null;
  if (target.kind === "posse") return team.posseId;
  const slot = team.slots[target.slotIndex];
  if (!slot) return null;
  if (target.kind === "awakener") return slot.awakenerId;
  if (target.kind === "covenant") return slot.covenantId;
  return slot.wheelIds[target.wheelIndex];
}

function setTargetValue(teams: Team[], target: PickerTarget, value: string | null) {
  const team = teams.find((item) => item.id === target.teamId);
  if (!team) return;
  if (target.kind === "posse") {
    team.posseId = value;
    return;
  }
  const slot = team.slots[target.slotIndex];
  if (!slot) return;
  if (target.kind === "awakener") slot.awakenerId = value;
  if (target.kind === "covenant") slot.covenantId = value;
  if (target.kind === "wheel") slot.wheelIds[target.wheelIndex] = value;
}

export function canAssignAwakener(teams: Team[], target: PickerTarget, awakenerId: string) {
  if (target.kind !== "awakener") return true;
  const next = cloneTeams(teams);
  const source = findTargetUsage(next, "awakener", awakenerId);
  const destinationTeam = next.find((team) => team.id === target.teamId);
  if (!destinationTeam) return false;

  if (source && source.kind === "awakener") {
    const sourceTeam = next.find((team) => team.id === source.teamId);
    if (!sourceTeam) return false;
    const sourceSlot = sourceTeam.slots[source.slotIndex];
    const targetSlot = destinationTeam.slots[target.slotIndex];
    sourceTeam.slots[source.slotIndex] = targetSlot;
    destinationTeam.slots[target.slotIndex] = sourceSlot;
    return isTeamRealmValid(sourceTeam) && isTeamRealmValid(destinationTeam);
  }

  destinationTeam.slots[target.slotIndex].awakenerId = awakenerId;
  return isTeamRealmValid(destinationTeam);
}

export function assignEntity(
  teams: Team[],
  target: PickerTarget,
  entityId: string,
): AssignmentResult {
  const next = cloneTeams(teams);
  const destinationTeam = next.find((team) => team.id === target.teamId);
  if (!destinationTeam) return { ok: false, teams, message: i18n.t("errors.targetMissing") };

  if (target.kind === "covenant") {
    if (!covenantsById.has(entityId)) {
      return { ok: false, teams, message: i18n.t("errors.unknownCovenant") };
    }
    setTargetValue(next, target, entityId);
    return { ok: true, teams: next };
  }

  const entityMap =
    target.kind === "awakener" ? awakenersById : target.kind === "wheel" ? wheelsById : possesById;
  if (!entityMap.has(entityId)) {
    return { ok: false, teams, message: i18n.t("errors.unknownEntity") };
  }

  const source = findTargetUsage(next, target.kind, entityId);
  if (source && JSON.stringify(source) === JSON.stringify(target)) {
    return { ok: true, teams };
  }

  if (target.kind === "awakener") {
    if (!canAssignAwakener(teams, target, entityId)) {
      return { ok: false, teams, message: i18n.t("errors.realmMove") };
    }
    if (source?.kind === "awakener") {
      const sourceTeam = next.find((team) => team.id === source.teamId);
      if (!sourceTeam) return { ok: false, teams };
      const sourceSlot = sourceTeam.slots[source.slotIndex];
      const targetSlot = destinationTeam.slots[target.slotIndex];
      sourceTeam.slots[source.slotIndex] = targetSlot;
      destinationTeam.slots[target.slotIndex] = sourceSlot;
      return { ok: true, teams: next, moved: true };
    }
    destinationTeam.slots[target.slotIndex].awakenerId = entityId;
    return { ok: true, teams: next };
  }

  const destinationValue = getTargetValue(next, target);
  if (source) setTargetValue(next, source, destinationValue);
  setTargetValue(next, target, entityId);
  return { ok: true, teams: next, moved: Boolean(source) };
}

export function clearTarget(teams: Team[], target: PickerTarget): Team[] {
  const next = cloneTeams(teams);
  const team = next.find((item) => item.id === target.teamId);
  if (!team) return teams;
  if (target.kind === "awakener") {
    team.slots[target.slotIndex] = createEmptySlot();
  } else {
    setTargetValue(next, target, null);
  }
  return next;
}

export function getImportConflicts(teams: Team[], targetTeamId: string, incoming: Team) {
  const conflicts: ImportConflict[] = [];
  const otherTeams = teams.filter((team) => team.id !== targetTeamId);

  for (const slot of incoming.slots) {
    if (slot.awakenerId) {
      const usage = findTargetUsage(otherTeams, "awakener", slot.awakenerId);
      if (usage) {
        conflicts.push({
          entity: { kind: "awakener", id: slot.awakenerId },
          teamId: usage.teamId,
        });
      }
    }
    for (const wheelId of slot.wheelIds) {
      if (!wheelId) continue;
      const usage = findTargetUsage(otherTeams, "wheel", wheelId);
      if (usage) {
        conflicts.push({
          entity: { kind: "wheel", id: wheelId },
          teamId: usage.teamId,
        });
      }
    }
  }
  if (incoming.posseId) {
    const usage = findTargetUsage(otherTeams, "posse", incoming.posseId);
    if (usage) {
      conflicts.push({
        entity: { kind: "posse", id: incoming.posseId },
        teamId: usage.teamId,
      });
    }
  }
  return conflicts;
}

export function applyImportedTeam(teams: Team[], targetTeamId: string, incoming: Team): Team[] {
  const next = cloneTeams(teams);
  const incomingAwakeners = new Set(incoming.slots.flatMap((slot) => slot.awakenerId ?? []));
  const incomingWheels = new Set(incoming.slots.flatMap((slot) => slot.wheelIds).filter(Boolean));

  for (const team of next) {
    if (team.id === targetTeamId) continue;
    for (const [slotIndex, slot] of team.slots.entries()) {
      if (slot.awakenerId && incomingAwakeners.has(slot.awakenerId)) {
        team.slots[slotIndex] = createEmptySlot();
        continue;
      }
      slot.wheelIds = slot.wheelIds.map((id) => (id && incomingWheels.has(id) ? null : id)) as [
        string | null,
        string | null,
      ];
    }
    if (team.posseId && team.posseId === incoming.posseId) team.posseId = null;
  }

  const targetIndex = next.findIndex((team) => team.id === targetTeamId);
  if (targetIndex >= 0) {
    next[targetIndex] = { ...incoming, id: targetTeamId, name: next[targetIndex].name };
  }
  return next;
}

export function reconcileTeams(teams: Team[]): Team[] {
  const defaults = createDefaultTeams();
  return defaults.map((defaultTeam, index) => {
    const saved = teams[index];
    if (!saved) return defaultTeam;
    const slots = defaultTeam.slots.map((empty, slotIndex) => {
      const slot = saved.slots?.[slotIndex];
      if (!slot) return empty;
      return {
        awakenerId: slot.awakenerId && awakenersById.has(slot.awakenerId) ? slot.awakenerId : null,
        wheelIds: [
          slot.wheelIds?.[0] && wheelsById.has(slot.wheelIds[0]) ? slot.wheelIds[0] : null,
          slot.wheelIds?.[1] && wheelsById.has(slot.wheelIds[1]) ? slot.wheelIds[1] : null,
        ],
        covenantId: slot.covenantId && covenantsById.has(slot.covenantId) ? slot.covenantId : null,
      } satisfies LoadoutSlot;
    }) as Team["slots"];
    return {
      id: defaultTeam.id,
      name: typeof saved.name === "string" && saved.name.trim() ? saved.name : defaultTeam.name,
      posseId: saved.posseId && possesById.has(saved.posseId) ? saved.posseId : null,
      slots,
    };
  });
}

export function describeTarget(target: PickerTarget): string {
  if (target.kind === "posse") return i18n.t("target.posse");
  if (target.kind === "awakener") {
    return i18n.t("target.awakener", { number: target.slotIndex + 1 });
  }
  if (target.kind === "wheel") {
    return i18n.t("target.wheel", {
      slot: target.slotIndex + 1,
      wheel: target.wheelIndex + 1,
    });
  }
  return i18n.t("target.covenant", { slot: target.slotIndex + 1 });
}

export function getTargetEntity(teams: Team[], target: PickerTarget) {
  return getEntity(target.kind, getTargetValue(teams, target));
}
