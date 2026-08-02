import {
  awakenersById,
  covenantsById,
  getEntity,
  possesById,
  wheelsById,
} from "@/data-access/catalog";

import {
  SLOT_INDICES,
  WHEEL_INDICES,
  type AssignmentResult,
  type EntityKind,
  type ImportConflict,
  type LoadoutSlot,
  type PickerTarget,
  type SlotIndex,
  type Team,
  type WheelIndex,
} from "./types";

export const TEAM_COUNT = 10;
export const SLOT_COUNT = SLOT_INDICES.length;
export const MAX_REALMS_PER_TEAM = 2;

export function isSlotIndex(value: unknown): value is SlotIndex {
  return typeof value === "number" && SLOT_INDICES.includes(value as SlotIndex);
}

export function isWheelIndex(value: unknown): value is WheelIndex {
  return typeof value === "number" && WHEEL_INDICES.includes(value as WheelIndex);
}

export function createEmptySlot(): LoadoutSlot {
  return { awakenerId: null, wheelIds: [null, null], covenantId: null };
}

export function createDefaultTeams(
  nameForNumber: (number: number) => string = (number) => `Team ${String(number)}`,
): Team[] {
  return Array.from({ length: TEAM_COUNT }, (_, index) => ({
    id: `team-${String(index + 1)}`,
    name: nameForNumber(index + 1),
    posseId: null,
    slots: SLOT_INDICES.map(() => createEmptySlot()) as Team["slots"],
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

export function targetKey(target: PickerTarget | null): string {
  if (!target) return "empty";
  if (target.kind === "posse") return `posse:${target.teamId}`;
  const slotKey = `${target.kind}:${target.teamId}:${String(target.slotIndex)}`;
  return target.kind === "wheel" ? `${slotKey}:${String(target.wheelIndex)}` : slotKey;
}

export function sameTarget(left: PickerTarget | null, right: PickerTarget | null): boolean {
  return targetKey(left) === targetKey(right);
}

export function targetsForTeam(teamId: string): PickerTarget[] {
  return [
    ...SLOT_INDICES.flatMap((slotIndex): PickerTarget[] => [
      { kind: "awakener", teamId, slotIndex },
      ...WHEEL_INDICES.map(
        (wheelIndex): PickerTarget => ({ kind: "wheel", teamId, slotIndex, wheelIndex }),
      ),
      { kind: "covenant", teamId, slotIndex },
    ]),
    { kind: "posse", teamId },
  ];
}

export function isValidPickerTarget(teams: Team[], target: PickerTarget): boolean {
  const team = teams.find((item) => item.id === target.teamId);
  if (!team) return false;
  if (target.kind === "posse") return true;
  if (target.kind !== "awakener" && target.kind !== "wheel" && target.kind !== "covenant") {
    return false;
  }
  if (!isSlotIndex(target.slotIndex) || !team.slots[target.slotIndex]) return false;
  return target.kind !== "wheel" || isWheelIndex(target.wheelIndex);
}

function findTargetUsage(
  teams: Team[],
  kind: Exclude<EntityKind, "covenant">,
  entityId: string,
): PickerTarget | null {
  for (const team of teams) {
    if (kind === "posse" && team.posseId === entityId) return { kind, teamId: team.id };
    for (const slotIndex of SLOT_INDICES) {
      const slot = team.slots[slotIndex];
      if (kind === "awakener" && slot.awakenerId === entityId) {
        return { kind, teamId: team.id, slotIndex };
      }
      if (kind === "wheel") {
        const wheelIndex = WHEEL_INDICES.find((index) => slot.wheelIds[index] === entityId);
        if (wheelIndex !== undefined) return { kind, teamId: team.id, slotIndex, wheelIndex };
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

export function getTargetValue(teams: Team[], target: PickerTarget): string | null {
  if (!isValidPickerTarget(teams, target)) return null;
  const team = teams.find((item) => item.id === target.teamId)!;
  if (target.kind === "posse") return team.posseId;
  const slot = team.slots[target.slotIndex];
  if (target.kind === "awakener") return slot.awakenerId;
  if (target.kind === "covenant") return slot.covenantId;
  return slot.wheelIds[target.wheelIndex];
}

function setTargetValue(teams: Team[], target: PickerTarget, value: string | null): boolean {
  if (!isValidPickerTarget(teams, target)) return false;
  const team = teams.find((item) => item.id === target.teamId)!;
  if (target.kind === "posse") {
    team.posseId = value;
    return true;
  }
  const slot = team.slots[target.slotIndex];
  if (target.kind === "awakener") slot.awakenerId = value;
  if (target.kind === "covenant") slot.covenantId = value;
  if (target.kind === "wheel") slot.wheelIds[target.wheelIndex] = value;
  return true;
}

export function isTargetEmpty(teams: Team[], target: PickerTarget): boolean {
  return isValidPickerTarget(teams, target) && getTargetValue(teams, target) === null;
}

export function nextEmptyTarget(teams: Team[], current: PickerTarget): PickerTarget | null {
  const targets = targetsForTeam(current.teamId);
  const currentIndex = targets.findIndex((target) => sameTarget(target, current));
  if (currentIndex < 0) return null;
  return targets.slice(currentIndex + 1).find((target) => isTargetEmpty(teams, target)) ?? null;
}

function simulateAwakenerAssignment(
  teams: Team[],
  target: Extract<PickerTarget, { kind: "awakener" }>,
  awakenerId: string,
): { teams: Team[]; moved: boolean } | null {
  if (!isValidPickerTarget(teams, target)) return null;
  const next = cloneTeams(teams);
  const source = findTargetUsage(next, "awakener", awakenerId);
  if (source && sameTarget(source, target)) return { teams, moved: false };

  const destinationTeam = next.find((team) => team.id === target.teamId)!;
  if (source?.kind === "awakener") {
    const sourceTeam = next.find((team) => team.id === source.teamId);
    if (!sourceTeam) return null;
    const sourceSlot = sourceTeam.slots[source.slotIndex];
    const destinationSlot = destinationTeam.slots[target.slotIndex];
    sourceTeam.slots[source.slotIndex] = destinationSlot;
    destinationTeam.slots[target.slotIndex] = sourceSlot;
    if (!isTeamRealmValid(sourceTeam) || !isTeamRealmValid(destinationTeam)) return null;
    return { teams: next, moved: true };
  }

  destinationTeam.slots[target.slotIndex].awakenerId = awakenerId;
  return isTeamRealmValid(destinationTeam) ? { teams: next, moved: false } : null;
}

export function canAssignAwakener(
  teams: Team[],
  target: PickerTarget,
  awakenerId: string,
): boolean {
  if (target.kind !== "awakener") return isValidPickerTarget(teams, target);
  if (!awakenersById.get(awakenerId)?.selectable) return false;
  return simulateAwakenerAssignment(teams, target, awakenerId) !== null;
}

export function assignEntity(
  teams: Team[],
  target: PickerTarget,
  entityId: string,
): AssignmentResult {
  if (!isValidPickerTarget(teams, target)) return { ok: false, teams, reason: "targetMissing" };

  const entity = getEntity(target.kind, entityId);
  if (!entity) {
    return {
      ok: false,
      teams,
      reason: target.kind === "covenant" ? "unknownCovenant" : "unknownEntity",
    };
  }
  if (!entity.selectable) return { ok: false, teams, reason: "entityNotSelectable" };

  if (target.kind === "covenant") {
    if (getTargetValue(teams, target) === entityId) return { ok: true, teams };
    const next = cloneTeams(teams);
    setTargetValue(next, target, entityId);
    return { ok: true, teams: next };
  }

  if (target.kind === "awakener") {
    const simulated = simulateAwakenerAssignment(teams, target, entityId);
    if (!simulated) return { ok: false, teams, reason: "realmMove" };
    return { ok: true, ...simulated };
  }

  const source = findTargetUsage(teams, target.kind, entityId);
  if (source && sameTarget(source, target)) return { ok: true, teams };
  const next = cloneTeams(teams);
  const destinationValue = getTargetValue(next, target);
  if (source) setTargetValue(next, source, destinationValue);
  setTargetValue(next, target, entityId);
  return { ok: true, teams: next, moved: Boolean(source) };
}

export function clearTarget(teams: Team[], target: PickerTarget): Team[] {
  if (!isValidPickerTarget(teams, target)) return teams;
  if (target.kind === "awakener") {
    const team = teams.find((item) => item.id === target.teamId)!;
    const slot = team.slots[target.slotIndex];
    if (!slot.awakenerId && !slot.covenantId && slot.wheelIds.every((id) => id === null)) {
      return teams;
    }
  } else if (isTargetEmpty(teams, target)) {
    return teams;
  }
  const next = cloneTeams(teams);
  const team = next.find((item) => item.id === target.teamId)!;
  if (target.kind === "awakener") team.slots[target.slotIndex] = createEmptySlot();
  else setTargetValue(next, target, null);
  return next;
}

export function getImportConflicts(teams: Team[], targetTeamId: string, incoming: Team) {
  const conflicts: ImportConflict[] = [];
  const otherTeams = teams.filter((team) => team.id !== targetTeamId);

  for (const slot of incoming.slots) {
    if (slot.awakenerId) {
      const usage = findTargetUsage(otherTeams, "awakener", slot.awakenerId);
      if (usage)
        conflicts.push({ entity: { kind: "awakener", id: slot.awakenerId }, teamId: usage.teamId });
    }
    for (const wheelId of slot.wheelIds) {
      if (!wheelId) continue;
      const usage = findTargetUsage(otherTeams, "wheel", wheelId);
      if (usage) conflicts.push({ entity: { kind: "wheel", id: wheelId }, teamId: usage.teamId });
    }
  }
  if (incoming.posseId) {
    const usage = findTargetUsage(otherTeams, "posse", incoming.posseId);
    if (usage)
      conflicts.push({ entity: { kind: "posse", id: incoming.posseId }, teamId: usage.teamId });
  }
  return conflicts;
}

export function applyImportedTeam(teams: Team[], targetTeamId: string, incoming: Team): Team[] {
  const next = cloneTeams(teams);
  const incomingAwakeners = new Set(incoming.slots.flatMap((slot) => slot.awakenerId ?? []));
  const incomingWheels = new Set(incoming.slots.flatMap((slot) => slot.wheelIds).filter(Boolean));

  for (const team of next) {
    if (team.id === targetTeamId) continue;
    for (const slotIndex of SLOT_INDICES) {
      const slot = team.slots[slotIndex];
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
  if (targetIndex >= 0)
    next[targetIndex] = { ...incoming, id: targetTeamId, name: next[targetIndex].name };
  return next;
}

function validOptionalId(value: unknown, ids: ReadonlyMap<string, unknown>): string | null {
  return typeof value === "string" && ids.has(value) ? value : null;
}

export function reconcileTeams(teams: Team[], nameForNumber?: (number: number) => string): Team[] {
  const defaults = createDefaultTeams(nameForNumber);
  const savedById = new Map(
    teams
      .filter((team): team is Team => Boolean(team && typeof team.id === "string"))
      .map((team) => [team.id, team]),
  );
  const reconciled = defaults.map((defaultTeam, index) => {
    const saved = savedById.get(defaultTeam.id) ?? teams[index];
    if (!saved || typeof saved !== "object") return defaultTeam;
    const savedSlots = Array.isArray(saved.slots) ? saved.slots : [];
    const slots = SLOT_INDICES.map((slotIndex) => {
      const slot = savedSlots[slotIndex];
      if (!slot || typeof slot !== "object") return createEmptySlot();
      const wheelIds = Array.isArray(slot.wheelIds) ? slot.wheelIds : [];
      return {
        awakenerId: validOptionalId(slot.awakenerId, awakenersById),
        wheelIds: [
          validOptionalId(wheelIds[0], wheelsById),
          validOptionalId(wheelIds[1], wheelsById),
        ],
        covenantId: validOptionalId(slot.covenantId, covenantsById),
      } satisfies LoadoutSlot;
    }) as Team["slots"];
    return {
      id: defaultTeam.id,
      name: typeof saved.name === "string" && saved.name.trim() ? saved.name : defaultTeam.name,
      posseId: validOptionalId(saved.posseId, possesById),
      slots,
    };
  });

  const seenAwakeners = new Set<string>();
  const seenWheels = new Set<string>();
  const seenPosses = new Set<string>();
  for (const team of reconciled) {
    if (team.posseId) {
      if (seenPosses.has(team.posseId)) team.posseId = null;
      else seenPosses.add(team.posseId);
    }
    const realms = new Set<string>();
    for (const slotIndex of SLOT_INDICES) {
      const slot = team.slots[slotIndex];
      if (slot.awakenerId) {
        const awakener = awakenersById.get(slot.awakenerId)!;
        if (
          seenAwakeners.has(slot.awakenerId) ||
          (!realms.has(awakener.realm) && realms.size >= MAX_REALMS_PER_TEAM)
        ) {
          slot.awakenerId = null;
        } else {
          seenAwakeners.add(slot.awakenerId);
          realms.add(awakener.realm);
        }
      }
      for (const wheelIndex of WHEEL_INDICES) {
        const wheelId = slot.wheelIds[wheelIndex];
        if (!wheelId) continue;
        if (seenWheels.has(wheelId)) slot.wheelIds[wheelIndex] = null;
        else seenWheels.add(wheelId);
      }
    }
  }
  return reconciled;
}

export function getTargetEntity(teams: Team[], target: PickerTarget) {
  return getEntity(target.kind, getTargetValue(teams, target));
}
