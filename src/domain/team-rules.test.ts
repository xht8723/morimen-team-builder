import { describe, expect, it } from "vitest";

import { gameCatalog } from "@/data-access/catalog";

import {
  TEAM_COUNT,
  applyImportedTeam,
  assignEntity,
  clearTarget,
  createDefaultTeams,
  getImportConflicts,
  getTeamRealms,
  reconcileTeams,
} from "./team-rules";

describe("team rules", () => {
  it("always creates exactly ten stable teams with four loadout slots", () => {
    const teams = createDefaultTeams();
    expect(teams).toHaveLength(TEAM_COUNT);
    expect(teams.map((team) => team.id)).toEqual(
      Array.from({ length: TEAM_COUNT }, (_, index) => `team-${String(index + 1)}`),
    );
    expect(teams.every((team) => team.slots.length === 4)).toBe(true);
  });

  it("expands legacy five-team saves without losing valid assignments", () => {
    const legacy = createDefaultTeams().slice(0, 5);
    const awakener = gameCatalog.entities.awakeners[0];
    legacy[0].name = "Legacy lead";
    legacy[0].slots[0].awakenerId = awakener.id;
    legacy[1].slots[0].awakenerId = "removed-awakener";

    const reconciled = reconcileTeams(legacy);

    expect(reconciled).toHaveLength(10);
    expect(reconciled[0].name).toBe("Legacy lead");
    expect(reconciled[0].slots[0].awakenerId).toBe(awakener.id);
    expect(reconciled[1].slots[0].awakenerId).toBeNull();
    expect(reconciled[5]).toMatchObject({ id: "team-6", name: "Team 6", posseId: null });
    expect(reconciled[9]).toMatchObject({ id: "team-10", name: "Team 10", posseId: null });
    expect(reconciled.slice(5).every((team) => team.slots.every((slot) => !slot.awakenerId))).toBe(
      true,
    );
  });

  it("moves a used awakener with its complete loadout and swaps occupied slots", () => {
    const teams = createDefaultTeams();
    const [first, second] = gameCatalog.entities.awakeners;
    const wheel = gameCatalog.entities.wheels[0];
    const covenant = gameCatalog.entities.covenants[0];
    teams[0].slots[0] = {
      awakenerId: first.id,
      wheelIds: [wheel.id, null],
      covenantId: covenant.id,
    };
    teams[9].slots[0].awakenerId = second.id;

    const result = assignEntity(
      teams,
      { kind: "awakener", teamId: "team-10", slotIndex: 0 },
      first.id,
    );

    expect(result.ok).toBe(true);
    expect(result.moved).toBe(true);
    expect(result.teams[9].slots[0]).toEqual({
      awakenerId: first.id,
      wheelIds: [wheel.id, null],
      covenantId: covenant.id,
    });
    expect(result.teams[0].slots[0].awakenerId).toBe(second.id);
  });

  it("preserves equipment when replacing an unused awakener", () => {
    const teams = createDefaultTeams();
    const wheel = gameCatalog.entities.wheels[0];
    const covenant = gameCatalog.entities.covenants[0];
    teams[0].slots[0] = {
      awakenerId: gameCatalog.entities.awakeners[0].id,
      wheelIds: [wheel.id, null],
      covenantId: covenant.id,
    };

    const result = assignEntity(
      teams,
      { kind: "awakener", teamId: "team-1", slotIndex: 0 },
      gameCatalog.entities.awakeners[1].id,
    );

    expect(result.ok).toBe(true);
    expect(result.teams[0].slots[0].wheelIds[0]).toBe(wheel.id);
    expect(result.teams[0].slots[0].covenantId).toBe(covenant.id);
  });

  it("permits duplicate covenants but moves unique wheels and posses", () => {
    let teams = createDefaultTeams();
    const covenant = gameCatalog.entities.covenants[0];
    const wheel = gameCatalog.entities.wheels[0];
    const posse = gameCatalog.entities.posses[0];

    teams = assignEntity(
      teams,
      { kind: "covenant", teamId: "team-1", slotIndex: 0 },
      covenant.id,
    ).teams;
    teams = assignEntity(
      teams,
      { kind: "covenant", teamId: "team-2", slotIndex: 0 },
      covenant.id,
    ).teams;
    teams = assignEntity(
      teams,
      { kind: "wheel", teamId: "team-1", slotIndex: 0, wheelIndex: 0 },
      wheel.id,
    ).teams;
    teams = assignEntity(
      teams,
      { kind: "wheel", teamId: "team-2", slotIndex: 0, wheelIndex: 0 },
      wheel.id,
    ).teams;
    teams = assignEntity(teams, { kind: "posse", teamId: "team-1" }, posse.id).teams;
    teams = assignEntity(teams, { kind: "posse", teamId: "team-2" }, posse.id).teams;

    expect(teams[0].slots[0].covenantId).toBe(covenant.id);
    expect(teams[1].slots[0].covenantId).toBe(covenant.id);
    expect(teams[0].slots[0].wheelIds[0]).toBeNull();
    expect(teams[1].slots[0].wheelIds[0]).toBe(wheel.id);
    expect(teams[0].posseId).toBeNull();
    expect(teams[1].posseId).toBe(posse.id);
  });

  it("rejects a third awakener realm", () => {
    const byRealm = new Map<string, (typeof gameCatalog.entities.awakeners)[number]>();
    for (const awakener of gameCatalog.entities.awakeners) {
      if (!byRealm.has(awakener.realm)) byRealm.set(awakener.realm, awakener);
    }
    const [first, second, third] = [...byRealm.values()];
    const teams = createDefaultTeams();
    teams[0].slots[0].awakenerId = first.id;
    teams[0].slots[1].awakenerId = second.id;

    const result = assignEntity(
      teams,
      { kind: "awakener", teamId: "team-1", slotIndex: 2 },
      third.id,
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain("two-realm");
    expect(getTeamRealms(result.teams[0])).toHaveLength(2);
  });

  it("clears an awakener's entire loadout", () => {
    const teams = createDefaultTeams();
    teams[0].slots[0] = {
      awakenerId: gameCatalog.entities.awakeners[0].id,
      wheelIds: [gameCatalog.entities.wheels[0].id, gameCatalog.entities.wheels[1].id],
      covenantId: gameCatalog.entities.covenants[0].id,
    };

    const next = clearTarget(teams, { kind: "awakener", teamId: "team-1", slotIndex: 0 });
    expect(next[0].slots[0]).toEqual({
      awakenerId: null,
      wheelIds: [null, null],
      covenantId: null,
    });
  });

  it("previews and atomically clears import conflicts", () => {
    const teams = createDefaultTeams();
    const awakener = gameCatalog.entities.awakeners[0];
    const wheel = gameCatalog.entities.wheels[0];
    const posse = gameCatalog.entities.posses[0];
    teams[9].slots[0].awakenerId = awakener.id;
    teams[9].slots[1].wheelIds[0] = wheel.id;
    teams[9].posseId = posse.id;

    const incoming = createDefaultTeams()[0];
    incoming.slots[0].awakenerId = awakener.id;
    incoming.slots[0].wheelIds[0] = wheel.id;
    incoming.posseId = posse.id;

    expect(getImportConflicts(teams, "team-1", incoming)).toHaveLength(3);
    const next = applyImportedTeam(teams, "team-1", incoming);
    expect(next[0].slots[0].awakenerId).toBe(awakener.id);
    expect(next[9].slots[0].awakenerId).toBeNull();
    expect(next[9].slots[1].wheelIds[0]).toBeNull();
    expect(next[9].posseId).toBeNull();
  });
});
