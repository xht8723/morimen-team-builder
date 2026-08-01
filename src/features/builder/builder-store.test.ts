import { beforeEach, describe, expect, it } from "vitest";

import { gameCatalog } from "@/data-access/catalog";
import { createDefaultTeams } from "@/domain/team-rules";

import { useBuilderStore } from "./builder-store";

const STORAGE_KEY = "morimens-five-team-builder";

function storedBuilderState(teams = createDefaultTeams(), activeTeamId = "team-1") {
  return JSON.stringify({
    state: {
      stateSchemaVersion: 1,
      dataBuildId: gameCatalog.source.buildId,
      teams,
      activeTeamId,
    },
    version: 1,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  const teams = createDefaultTeams();
  useBuilderStore.setState({ teams, activeTeamId: teams[0].id });
});

describe("builder persistence", () => {
  it("hydrates a legacy five-team save and appends empty teams six through ten", async () => {
    const legacyTeams = createDefaultTeams().slice(0, 5);
    legacyTeams[4].name = "Saved fifth team";
    legacyTeams[4].slots[0].awakenerId = gameCatalog.entities.awakeners[0].id;
    window.localStorage.setItem(STORAGE_KEY, storedBuilderState(legacyTeams, "team-5"));

    await useBuilderStore.persist.rehydrate();
    const state = useBuilderStore.getState();

    expect(state.teams).toHaveLength(10);
    expect(state.activeTeamId).toBe("team-5");
    expect(state.teams[4].name).toBe("Saved fifth team");
    expect(state.teams[4].slots[0].awakenerId).toBe(gameCatalog.entities.awakeners[0].id);
    expect(state.teams.slice(5).every((team) => team.slots.every((slot) => !slot.awakenerId))).toBe(
      true,
    );
  });

  it("round-trips a ten-team save with team ten active", async () => {
    const teams = createDefaultTeams();
    teams[9].name = "Final formation";
    teams[9].posseId = gameCatalog.entities.posses[0].id;
    useBuilderStore.setState({ teams, activeTeamId: "team-10" });
    const saved = window.localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();

    useBuilderStore.setState({ teams: createDefaultTeams(), activeTeamId: "team-1" });
    window.localStorage.setItem(STORAGE_KEY, saved!);
    await useBuilderStore.persist.rehydrate();

    const state = useBuilderStore.getState();
    expect(state.teams).toHaveLength(10);
    expect(state.activeTeamId).toBe("team-10");
    expect(state.teams[9].name).toBe("Final formation");
    expect(state.teams[9].posseId).toBe(gameCatalog.entities.posses[0].id);
  });
});
