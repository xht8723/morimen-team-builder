import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Toast } from "@/components/ui/Toast";
import { APP_LANGUAGES, normalizeAppLanguage } from "@/i18n";

import { useBuilderStore } from "./builder-store";
import { EntityPicker } from "./EntityPicker";
import { ImportDialog } from "./ImportDialog";
import { TeamBoard } from "./TeamBoard";
import { TeamRail } from "./TeamRail";

type TeamTransitionPhase = "idle" | "in";

export function BuilderView() {
  const { i18n } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const teams = useBuilderStore((state) => state.teams);
  const activeTeamId = useBuilderStore((state) => state.activeTeamId);
  const pickerTarget = useBuilderStore((state) => state.pickerTarget);
  const toast = useBuilderStore((state) => state.toast);
  const undoSnapshot = useBuilderStore((state) => state.undoSnapshot);
  const selectTeam = useBuilderStore((state) => state.selectTeam);
  const renameTeam = useBuilderStore((state) => state.renameTeam);
  const openPicker = useBuilderStore((state) => state.openPicker);
  const closePicker = useBuilderStore((state) => state.closePicker);
  const chooseEntity = useBuilderStore((state) => state.chooseEntity);
  const clearSelection = useBuilderStore((state) => state.clearSelection);
  const clearTeam = useBuilderStore((state) => state.clearTeam);
  const resetAll = useBuilderStore((state) => state.resetAll);
  const undo = useBuilderStore((state) => state.undo);
  const dismissToast = useBuilderStore((state) => state.dismissToast);
  const notify = useBuilderStore((state) => state.notify);

  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  const [teamTransitionPhase, setTeamTransitionPhase] = useState<TeamTransitionPhase>("idle");
  const activeTeamNumber = teams.findIndex((team) => team.id === activeTeam.id) + 1;
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language) ?? "en";

  useEffect(() => {
    const translatedDefaults = APP_LANGUAGES.map((language) => i18n.getFixedT(language));
    const currentTranslation = i18n.getFixedT(currentLanguage);
    useBuilderStore.setState((state) => {
      let changed = false;
      const localizedTeams = state.teams.map((team, index) => {
        const isDefaultName = translatedDefaults.some(
          (translate) => team.name === translate("builder.defaultTeam", { number: index + 1 }),
        );
        if (!isDefaultName) return team;
        const localizedName = currentTranslation("builder.defaultTeam", { number: index + 1 });
        if (localizedName === team.name) return team;
        changed = true;
        return { ...team, name: localizedName };
      });
      return changed ? { teams: localizedTeams } : {};
    });
  }, [currentLanguage, i18n]);

  useEffect(
    () => () => {
      useBuilderStore.getState().closePicker();
      useBuilderStore.getState().cancelImport();
    },
    [],
  );

  const selectTeamWithTransition = useCallback(
    (teamId: string) => {
      if (teamId === activeTeam.id) return;
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setTeamTransitionPhase(reducedMotion ? "idle" : "in");
      selectTeam(teamId);
    },
    [activeTeam.id, selectTeam],
  );

  return (
    <>
      <div className="workspace">
        <TeamRail
          teams={teams}
          activeTeamId={activeTeam.id}
          onSelect={selectTeamWithTransition}
          onReset={resetAll}
        />
        <TeamBoard
          key={activeTeam.id}
          team={activeTeam}
          teamNumber={activeTeamNumber}
          transitionPhase={teamTransitionPhase}
          onTransitionComplete={() => setTeamTransitionPhase("idle")}
          onOpenPicker={openPicker}
          onRename={(name) => renameTeam(activeTeam.id, name)}
          onClearTeam={() => clearTeam(activeTeam.id)}
          onImport={() => setImportOpen(true)}
          onNotify={notify}
        />
        <EntityPicker
          target={pickerTarget}
          teams={teams}
          onChoose={chooseEntity}
          onClear={clearSelection}
          onClose={closePicker}
        />
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <Toast
        message={toast}
        canUndo={Boolean(undoSnapshot)}
        onUndo={undo}
        onDismiss={dismissToast}
      />
    </>
  );
}
