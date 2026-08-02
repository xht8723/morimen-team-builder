import { beforeEach, describe, expect, it, vi } from "vitest";

import { gameCatalog } from "@/data-access/catalog";
import { createDefaultTeams } from "@/domain/team-rules";

import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  createMigratingStorage,
  useBuilderStore,
} from "./builder-store";

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
  window.localStorage.clear();
});

describe("builder persistence", () => {
  it("hydrates a legacy five-team save and appends empty teams six through ten", async () => {
    const legacyTeams = createDefaultTeams().slice(0, 5);
    legacyTeams[4].name = "Saved fifth team";
    legacyTeams[4].slots[0].awakenerId = gameCatalog.entities.awakeners[0].id;
    const legacyValue = storedBuilderState(legacyTeams, "team-5");
    window.localStorage.setItem(LEGACY_STORAGE_KEY, legacyValue);

    await useBuilderStore.persist.rehydrate();
    const state = useBuilderStore.getState();

    expect(state.teams).toHaveLength(10);
    expect(state.activeTeamId).toBe("team-5");
    expect(state.teams[4].name).toBe("Saved fifth team");
    expect(state.teams[4].slots[0].awakenerId).toBe(gameCatalog.entities.awakeners[0].id);
    expect(state.teams.slice(5).every((team) => team.slots.every((slot) => !slot.awakenerId))).toBe(
      true,
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(legacyValue);
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
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

  it("prefers an existing canonical save without deleting a stale legacy copy", async () => {
    const canonicalTeams = createDefaultTeams();
    canonicalTeams[0].name = "Canonical";
    const legacyTeams = createDefaultTeams();
    legacyTeams[0].name = "Legacy";
    window.localStorage.setItem(STORAGE_KEY, storedBuilderState(canonicalTeams));
    window.localStorage.setItem(LEGACY_STORAGE_KEY, storedBuilderState(legacyTeams));

    await useBuilderStore.persist.rehydrate();

    expect(useBuilderStore.getState().teams[0].name).toBe("Canonical");
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
  });

  it("does not remove legacy data when the canonical copy fails", () => {
    const values = new Map([[LEGACY_STORAGE_KEY, "legacy-value"]]);
    const removeItem = vi.fn((key: string) => values.delete(key));
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === STORAGE_KEY) throw new Error("quota exceeded");
        values.set(key, value);
      },
      removeItem,
    } as unknown as Storage;

    expect(createMigratingStorage(storage).getItem(STORAGE_KEY)).toBe("legacy-value");
    expect(removeItem).not.toHaveBeenCalled();
    expect(values.get(LEGACY_STORAGE_KEY)).toBe("legacy-value");
  });

  it("does not create undo or toast state for a no-op team clear", () => {
    useBuilderStore.setState({ undoSnapshot: null, toast: null });
    useBuilderStore.getState().clearTeam("team-1");

    expect(useBuilderStore.getState()).toMatchObject({ undoSnapshot: null, toast: null });
  });

  it("closes the picker without undo or toast changes when reselecting its current entity", () => {
    const teams = createDefaultTeams();
    const awakener = gameCatalog.entities.awakeners[0];
    teams[0].slots[0].awakenerId = awakener.id;
    useBuilderStore.setState({
      teams,
      pickerTarget: { kind: "awakener", teamId: "team-1", slotIndex: 0 },
      undoSnapshot: null,
      toast: null,
    });

    useBuilderStore.getState().chooseEntity(awakener.id);

    expect(useBuilderStore.getState()).toMatchObject({
      pickerTarget: null,
      undoSnapshot: null,
      toast: null,
    });
  });
});
