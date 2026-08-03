import { Database, Languages } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AboutDialog } from "@/features/builder/AboutDialog";
import { BuilderView } from "@/features/builder/BuilderView";
import { RecommendedTeamsView } from "@/features/recommended-teams/RecommendedTeamsView";
import { normalizeAppLanguage } from "@/i18n";

type AppView = "builder" | "recommended";

export function App() {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<AppView>("builder");
  const [aboutOpen, setAboutOpen] = useState(false);
  const tabRefs = useRef<Record<AppView, HTMLButtonElement | null>>({
    builder: null,
    recommended: null,
  });
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

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentView: AppView) {
    let nextView: AppView | null = null;
    if (event.key === "Home") nextView = "builder";
    else if (event.key === "End") nextView = "recommended";
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextView = currentView === "builder" ? "recommended" : "builder";
    }
    if (!nextView) return;
    event.preventDefault();
    setActiveView(nextView);
    tabRefs.current[nextView]?.focus();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
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
        </div>

        <nav className="app-tabs" aria-label={t("navigation.label")} role="tablist">
          <button
            type="button"
            id="builder-tab"
            ref={(element) => {
              tabRefs.current.builder = element;
            }}
            className="app-tab"
            role="tab"
            aria-selected={activeView === "builder"}
            aria-controls="builder-panel"
            tabIndex={activeView === "builder" ? 0 : -1}
            onClick={() => setActiveView("builder")}
            onKeyDown={(event) => handleTabKeyDown(event, "builder")}
          >
            {t("navigation.builder")}
          </button>
          <button
            type="button"
            id="recommended-tab"
            ref={(element) => {
              tabRefs.current.recommended = element;
            }}
            className="app-tab"
            role="tab"
            aria-selected={activeView === "recommended"}
            aria-controls="recommended-panel"
            tabIndex={activeView === "recommended" ? 0 : -1}
            onClick={() => setActiveView("recommended")}
            onKeyDown={(event) => handleTabKeyDown(event, "recommended")}
          >
            {t("navigation.recommended")}
          </button>
        </nav>

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

      {activeView === "builder" ? (
        <div className="app-view" id="builder-panel" role="tabpanel" aria-labelledby="builder-tab">
          <BuilderView />
        </div>
      ) : (
        <div
          className="app-view"
          id="recommended-panel"
          role="tabpanel"
          aria-labelledby="recommended-tab"
        >
          <RecommendedTeamsView />
        </div>
      )}

      <footer className="app-footer">
        <span>{t("app.footer")}</span>
        <button type="button" onClick={() => setAboutOpen(true)}>
          {t("app.attribution")}
        </button>
      </footer>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
