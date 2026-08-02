import { Database, Languages } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Toast } from "@/components/ui/Toast";
import { AboutDialog } from "@/features/builder/AboutDialog";
import { useBuilderStore } from "@/features/builder/builder-store";
import { EntityPicker } from "@/features/builder/EntityPicker";
import { ImportDialog } from "@/features/builder/ImportDialog";
import { TeamBoard } from "@/features/builder/TeamBoard";
import { TeamRail } from "@/features/builder/TeamRail";
import { APP_LANGUAGES, normalizeAppLanguage } from "@/i18n";

type TeamTransitionPhase = "idle" | "in";

export function App() {
  const { t, i18n } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
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
  const nextLanguage = currentLanguage === "en" ? "zh-CN" : "en";
  const languageSwitchLabel =
    nextLanguage === "zh-CN" ? t("app.switchToChinese") : t("app.switchToEnglish");

  useEffect(() => {
    document.title = t("app.title");
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    description.content = t("app.metaDescription");
  }, [currentLanguage, t]);

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
    <div className="app-shell">
      <header className="app-header">
        <img
          className="brand-mark"
          src="./generated-assets/icons/game_icon.jpg"
          alt=""
          width="32"
          height="32"
        />
        <div className="app-heading">
          <span>{t("app.eyebrow")}</span>
          <h1 title={t("app.title")}>{t("app.title")}</h1>
        </div>
        <div className="app-header__actions">
          <button
            type="button"
            className="button language-toggle"
            aria-label={languageSwitchLabel}
            title={languageSwitchLabel}
            onClick={() => void i18n.changeLanguage(nextLanguage)}
          >
            <Languages size={14} />
            <span>{nextLanguage === "zh-CN" ? t("app.chineseShort") : t("app.englishShort")}</span>
          </button>
          <button type="button" className="button" onClick={() => setAboutOpen(true)}>
            <Database size={14} />
            {t("app.about")}
          </button>
        </div>
      </header>

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

      <footer className="app-footer">
        <span>{t("app.footer")}</span>
        <button type="button" onClick={() => setAboutOpen(true)}>
          {t("app.attribution")}
        </button>
      </footer>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <Toast
        message={toast}
        canUndo={Boolean(undoSnapshot)}
        onUndo={undo}
        onDismiss={dismissToast}
      />
    </div>
  );
}
