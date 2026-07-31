import { Database, ExternalLink, Scale, X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { gameCatalog } from "@/data-access/catalog";

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  const generated = new Date(gameCatalog.source.generatedAt);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog-panel about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <span className="picker-kicker">{t("about.kicker")}</span>
            <h2 id="about-title">{t("about.title")}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("about.close")}
            autoFocus
          >
            <X size={18} />
          </button>
        </header>
        <div className="about-grid">
          <article>
            <Database size={20} />
            <strong>{t("about.currentData")}</strong>
            <span>{gameCatalog.source.gameDataVersion}</span>
            <small>
              {t("about.generated", {
                date: Number.isNaN(generated.valueOf())
                  ? gameCatalog.source.generatedAt
                  : generated.toLocaleDateString(i18n.resolvedLanguage ?? i18n.language),
              })}
            </small>
            <small>
              {t("about.counts", {
                awakeners: gameCatalog.entities.awakeners.length,
                wheels: gameCatalog.entities.wheels.length,
                covenants: gameCatalog.entities.covenants.length,
                posses: gameCatalog.entities.posses.length,
              })}
            </small>
          </article>
          <article>
            <Scale size={20} />
            <strong>{t("about.noncommercial")}</strong>
            <span>{t("about.notAffiliated")}</span>
          </article>
        </div>
        <p>{t("about.skeydbNotice")}</p>
        <p>{t("about.huijiNotice")}</p>
        <a
          className="button button--ghost"
          href="https://github.com/dansa/SKeyDB"
          target="_blank"
          rel="noreferrer"
        >
          {t("about.source")}
          <ExternalLink size={15} />
        </a>
      </section>
    </div>
  );
}
