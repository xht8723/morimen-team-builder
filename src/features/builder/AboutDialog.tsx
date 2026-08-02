import { Database, ExternalLink, Scale, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Modal } from "@/components/ui/Modal";
import { gameCatalog } from "@/data-access/catalog";

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const generated = new Date(gameCatalog.source.generatedAt);
  return (
    <Modal open={open} onClose={onClose} labelledBy="about-title" className="about-dialog">
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
      <a className="button" href="https://github.com/dansa/SKeyDB" target="_blank" rel="noreferrer">
        {t("about.source")}
        <ExternalLink size={15} />
      </a>
    </Modal>
  );
}
