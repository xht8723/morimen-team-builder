import { ArrowRight, CircleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { EntityArtwork } from "@/components/ui/EntityArtwork";
import { awakenersById, getEntity, possesById } from "@/data-access/catalog";
import { resolveEntityText } from "@/data-access/entity-localization";

import { useBuilderStore } from "./builder-store";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [source, setSource] = useState("");
  const preview = useBuilderStore((state) => state.importPreview);
  const error = useBuilderStore((state) => state.importError);
  const previewImport = useBuilderStore((state) => state.previewImport);
  const cancelImport = useBuilderStore((state) => state.cancelImport);
  const confirmImport = useBuilderStore((state) => state.confirmImport);
  const teams = useBuilderStore((state) => state.teams);

  useEffect(() => {
    if (!open) {
      setSource("");
      cancelImport();
    }
  }, [cancelImport, open]);

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

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog-panel import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <span className="picker-kicker">{t("import.format")}</span>
            <h2 id="import-title">{t("import.title")}</h2>
            <p>{t("import.description")}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("import.close")}
          >
            <X size={18} />
          </button>
        </header>

        <textarea
          className="code-input"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={t("import.placeholder")}
          aria-label={t("import.inputLabel")}
          autoFocus
        />

        {error && (
          <div className="inline-alert">
            <CircleAlert size={16} />
            {error}
          </div>
        )}

        {preview && (
          <div className="import-preview">
            <div className="import-preview__lineup">
              {preview.team.slots.map((slot, index) => (
                <div key={String(index)}>
                  <EntityArtwork
                    entity={slot.awakenerId ? awakenersById.get(slot.awakenerId) : undefined}
                  />
                  <span>
                    {slot.awakenerId
                      ? resolveEntityText(awakenersById.get(slot.awakenerId)!, language).name
                      : t("import.empty")}
                  </span>
                </div>
              ))}
              <ArrowRight size={18} />
              <div>
                <EntityArtwork
                  entity={preview.team.posseId ? possesById.get(preview.team.posseId) : undefined}
                />
                <span>
                  {preview.team.posseId
                    ? resolveEntityText(possesById.get(preview.team.posseId)!, language).name
                    : t("import.noPosse")}
                </span>
              </div>
            </div>
            <div className="import-conflicts">
              <strong>{t("import.conflicts")}</strong>
              {preview.conflicts.length === 0 ? (
                <p>{t("import.noConflicts")}</p>
              ) : (
                <ul>
                  {preview.conflicts.map((conflict) => (
                    <li key={`${conflict.entity.kind}-${conflict.entity.id}`}>
                      {t("import.conflictItem", {
                        entity: (() => {
                          const entity = getEntity(conflict.entity.kind, conflict.entity.id);
                          return entity
                            ? resolveEntityText(entity, language).name
                            : conflict.entity.id;
                        })(),
                        team:
                          teams.find((team) => team.id === conflict.teamId)?.name ??
                          conflict.teamId,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <footer className="dialog-actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            {t("import.cancel")}
          </button>
          {preview ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                confirmImport();
                onClose();
              }}
            >
              {t("import.confirm")}
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary"
              disabled={!source.trim()}
              onClick={() => previewImport(source)}
            >
              {t("import.preview")}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
