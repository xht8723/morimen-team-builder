import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { gameCatalog } from "@/data-access/catalog";
import { decodeTeam } from "@/domain/share-code";
import {
  applyImportedTeam,
  assignEntity,
  clearTarget,
  cloneTeams,
  createDefaultTeams,
  createEmptySlot,
  getImportConflicts,
  reconcileTeams,
} from "@/domain/team-rules";
import type { ImportConflict, PickerTarget, Team } from "@/domain/types";
import i18n from "@/i18n";

import { formatCodecFailure } from "./codec-message";

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
  aboutOpen: boolean;
  selectTeam: (teamId: string) => void;
  renameTeam: (teamId: string, name: string) => void;
  openPicker: (target: PickerTarget) => void;
  closePicker: () => void;
  chooseEntity: (entityId: string) => void;
  clearSelection: () => void;
  clearTeam: (teamId: string) => void;
  resetAll: () => void;
  undo: () => void;
  dismissToast: () => void;
  previewImport: (source: string) => void;
  cancelImport: () => void;
  confirmImport: () => void;
  setAboutOpen: (open: boolean) => void;
}

function targetsForTeam(teamId: string): PickerTarget[] {
  return [
    ...[0, 1, 2, 3].flatMap((slotIndex): PickerTarget[] => [
      { kind: "awakener", teamId, slotIndex },
      { kind: "wheel", teamId, slotIndex, wheelIndex: 0 },
      { kind: "wheel", teamId, slotIndex, wheelIndex: 1 },
      { kind: "covenant", teamId, slotIndex },
    ]),
    { kind: "posse", teamId },
  ];
}

function isTargetEmpty(teams: Team[], target: PickerTarget) {
  const team = teams.find((item) => item.id === target.teamId);
  if (!team) return false;
  if (target.kind === "posse") return !team.posseId;
  const slot = team.slots[target.slotIndex];
  if (!slot) return false;
  if (target.kind === "awakener") return !slot.awakenerId;
  if (target.kind === "covenant") return !slot.covenantId;
  return !slot.wheelIds[target.wheelIndex];
}

function nextEmptyTarget(teams: Team[], current: PickerTarget) {
  const targets = targetsForTeam(current.teamId);
  const currentIndex = targets.findIndex(
    (target) => JSON.stringify(target) === JSON.stringify(current),
  );
  return targets.slice(currentIndex + 1).find((target) => isTargetEmpty(teams, target)) ?? null;
}

const initialTeams = createDefaultTeams();

export const useBuilderStore = create<BuilderState>()(
  persist(
    immer((set, get) => ({
      stateSchemaVersion: 1,
      dataBuildId: gameCatalog.source.buildId,
      teams: initialTeams,
      activeTeamId: initialTeams[0].id,
      pickerTarget: null,
      undoSnapshot: null,
      toast: null,
      importPreview: null,
      importError: null,
      aboutOpen: false,
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
          set({ toast: result.message ?? i18n.t("toast.invalid") });
          return;
        }
        if (result.teams === state.teams) return;
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
        if (!state.pickerTarget || isTargetEmpty(state.teams, state.pickerTarget)) return;
        set({
          teams: clearTarget(state.teams, state.pickerTarget),
          undoSnapshot: {
            teams: cloneTeams(state.teams),
            message: i18n.t("toast.clearedRestored"),
          },
          toast: i18n.t("toast.selectionCleared"),
        });
      },
      clearTeam: (teamId) => {
        const state = get();
        set({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  posseId: null,
                  slots: [
                    createEmptySlot(),
                    createEmptySlot(),
                    createEmptySlot(),
                    createEmptySlot(),
                  ],
                }
              : team,
          ),
          undoSnapshot: { teams: cloneTeams(state.teams), message: i18n.t("toast.teamRestored") },
          toast: i18n.t("toast.teamCleared"),
          pickerTarget: null,
        });
      },
      resetAll: () => {
        const state = get();
        set({
          teams: createDefaultTeams(),
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
      setAboutOpen: (aboutOpen) => set({ aboutOpen }),
    })),
    {
      name: "morimens-five-team-builder",
      version: 1,
      partialize: (state) => ({
        stateSchemaVersion: state.stateSchemaVersion,
        dataBuildId: state.dataBuildId,
        teams: state.teams,
        activeTeamId: state.activeTeamId,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<BuilderState>;
        const reconciled = reconcileTeams(Array.isArray(saved.teams) ? saved.teams : current.teams);
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
