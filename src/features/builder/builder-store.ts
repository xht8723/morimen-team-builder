import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { gameCatalog } from "@/data-access/catalog";
import { decodeTeam } from "@/domain/share-code";
import {
  applyImportedTeam,
  assignEntity,
  clearTarget,
  cloneTeams,
  createDefaultTeams,
  getImportConflicts,
  isTargetEmpty,
  nextEmptyTarget,
  reconcileTeams,
  targetsForTeam,
} from "@/domain/team-rules";
import type { AssignmentFailureReason, ImportConflict, PickerTarget, Team } from "@/domain/types";
import i18n from "@/i18n";

import { formatCodecFailure } from "./codec-message";

export const STORAGE_KEY = "morimens-team-builder";
export const LEGACY_STORAGE_KEY = "morimens-five-team-builder";

interface UndoSnapshot {
  teams: Team[];
  message: string;
}

interface ImportPreview {
  source: string;
  team: Team;
  conflicts: ImportConflict[];
}

interface BuilderState {
  stateSchemaVersion: 1;
  dataBuildId: string;
  teams: Team[];
  activeTeamId: string;
  pickerTarget: PickerTarget | null;
  undoSnapshot: UndoSnapshot | null;
  toast: string | null;
  importPreview: ImportPreview | null;
  importError: string | null;
  selectTeam: (teamId: string) => void;
  renameTeam: (teamId: string, name: string) => void;
  openPicker: (target: PickerTarget) => void;
  closePicker: () => void;
  chooseEntity: (entityId: string) => void;
  clearSelection: () => void;
  clearTeam: (teamId: string) => void;
  resetAll: () => void;
  undo: () => void;
  notify: (message: string) => void;
  dismissToast: () => void;
  previewImport: (source: string) => void;
  cancelImport: () => void;
  confirmImport: () => void;
}

export function createMigratingStorage(storage: Storage): StateStorage {
  return {
    getItem: (name) => {
      const canonical = storage.getItem(name);
      if (canonical !== null || name !== STORAGE_KEY) return canonical;
      const legacy = storage.getItem(LEGACY_STORAGE_KEY);
      if (legacy === null) return null;
      try {
        storage.setItem(STORAGE_KEY, legacy);
        try {
          storage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          // The canonical copy is already durable; a stale legacy copy is harmless.
        }
      } catch {
        // Hydrate from the readable legacy value without deleting it when copying fails.
      }
      return legacy;
    },
    setItem: (name, value) => storage.setItem(name, value),
    removeItem: (name) => storage.removeItem(name),
  };
}

function localizedTeamName(number: number): string {
  return i18n.t("builder.defaultTeam", { number });
}

function assignmentError(reason: AssignmentFailureReason | undefined): string {
  return reason ? i18n.t(`errors.${reason}`) : i18n.t("toast.invalid");
}

const initialTeams = createDefaultTeams(localizedTeamName);

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      stateSchemaVersion: 1,
      dataBuildId: gameCatalog.source.buildId,
      teams: initialTeams,
      activeTeamId: initialTeams[0].id,
      pickerTarget: null,
      undoSnapshot: null,
      toast: null,
      importPreview: null,
      importError: null,
      selectTeam: (teamId) =>
        set((state) => ({
          activeTeamId: state.teams.some((team) => team.id === teamId)
            ? teamId
            : state.activeTeamId,
          pickerTarget: null,
        })),
      renameTeam: (teamId, name) =>
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId ? { ...team, name: name.trim() || team.name } : team,
          ),
        })),
      openPicker: (pickerTarget) =>
        set({ pickerTarget, activeTeamId: pickerTarget.teamId, importError: null }),
      closePicker: () => set({ pickerTarget: null }),
      chooseEntity: (entityId) => {
        const state = get();
        if (!state.pickerTarget) return;
        const wasEmpty = isTargetEmpty(state.teams, state.pickerTarget);
        const result = assignEntity(state.teams, state.pickerTarget, entityId);
        if (!result.ok) {
          set({ toast: assignmentError(result.reason) });
          return;
        }
        if (result.teams === state.teams) {
          set({ pickerTarget: null });
          return;
        }
        set({
          teams: result.teams,
          undoSnapshot: {
            teams: cloneTeams(state.teams),
            message: i18n.t("toast.selectionRestored"),
          },
          toast: result.moved ? i18n.t("toast.move") : i18n.t("toast.assigned"),
          pickerTarget: wasEmpty ? nextEmptyTarget(result.teams, state.pickerTarget) : null,
        });
      },
      clearSelection: () => {
        const state = get();
        if (!state.pickerTarget) return;
        const teams = clearTarget(state.teams, state.pickerTarget);
        if (teams === state.teams) return;
        set({
          teams,
          undoSnapshot: {
            teams: cloneTeams(state.teams),
            message: i18n.t("toast.clearedRestored"),
          },
          toast: i18n.t("toast.selectionCleared"),
        });
      },
      clearTeam: (teamId) => {
        const state = get();
        const targetTeam = state.teams.find((team) => team.id === teamId);
        if (
          !targetTeam ||
          targetsForTeam(teamId).every((target) => isTargetEmpty(state.teams, target))
        ) {
          return;
        }
        const emptyTeam = createDefaultTeams(localizedTeamName).find((team) => team.id === teamId)!;
        set({
          teams: state.teams.map((team) =>
            team.id === teamId ? { ...emptyTeam, name: targetTeam.name } : team,
          ),
          undoSnapshot: { teams: cloneTeams(state.teams), message: i18n.t("toast.teamRestored") },
          toast: i18n.t("toast.teamCleared"),
          pickerTarget: null,
        });
      },
      resetAll: () => {
        const state = get();
        set({
          teams: createDefaultTeams(localizedTeamName),
          activeTeamId: "team-1",
          pickerTarget: null,
          undoSnapshot: { teams: cloneTeams(state.teams), message: i18n.t("toast.allRestored") },
          toast: i18n.t("toast.allReset"),
        });
      },
      undo: () => {
        const snapshot = get().undoSnapshot;
        if (!snapshot) return;
        set({ teams: cloneTeams(snapshot.teams), undoSnapshot: null, toast: snapshot.message });
      },
      notify: (toast) => set({ toast }),
      dismissToast: () => set({ toast: null }),
      previewImport: (source) => {
        const decoded = decodeTeam(source);
        if (!decoded.ok) {
          set({
            importError: formatCodecFailure(
              decoded,
              i18n.resolvedLanguage ?? i18n.language,
              i18n.t,
            ),
            importPreview: null,
          });
          return;
        }
        const state = get();
        set({
          importError: null,
          importPreview: {
            source,
            team: decoded.team,
            conflicts: getImportConflicts(state.teams, state.activeTeamId, decoded.team),
          },
        });
      },
      cancelImport: () => set({ importPreview: null, importError: null }),
      confirmImport: () => {
        const state = get();
        if (!state.importPreview) return;
        set({
          teams: applyImportedTeam(state.teams, state.activeTeamId, state.importPreview.team),
          undoSnapshot: { teams: cloneTeams(state.teams), message: i18n.t("toast.importReverted") },
          importPreview: null,
          importError: null,
          pickerTarget: null,
          toast: i18n.t("toast.imported"),
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createMigratingStorage(window.localStorage)),
      version: 1,
      partialize: (state) => ({
        stateSchemaVersion: state.stateSchemaVersion,
        dataBuildId: state.dataBuildId,
        teams: state.teams,
        activeTeamId: state.activeTeamId,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<BuilderState>;
        const reconciled = reconcileTeams(
          Array.isArray(saved.teams) ? saved.teams : current.teams,
          localizedTeamName,
        );
        const activeTeamId = reconciled.some((team) => team.id === saved.activeTeamId)
          ? (saved.activeTeamId ?? current.activeTeamId)
          : current.activeTeamId;
        return {
          ...current,
          teams: reconciled,
          activeTeamId,
          dataBuildId: gameCatalog.source.buildId,
          toast:
            saved.dataBuildId && saved.dataBuildId !== gameCatalog.source.buildId
              ? i18n.t("toast.dataUpdated")
              : null,
        };
      },
    },
  ),
);
