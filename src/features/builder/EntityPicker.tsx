import clsx from "clsx";
import { Eraser, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EntityArtwork, RealmBadge } from "@/components/ui/EntityArtwork";
import { formatEnumLabel, gameCatalog } from "@/data-access/catalog";
import { useLocalizedEntities } from "@/data-access/entity-localization";
import { getTargetEntity, targetKey } from "@/domain/team-rules";
import type { PickerTarget, Team } from "@/domain/types";

import {
  buildPickerViews,
  describeTarget,
  entitiesForTarget,
  filtersForTarget,
  getEntityMeta,
} from "./entity-picker-model";

interface EntityPickerProps {
  target: PickerTarget | null;
  teams: Team[];
  onChoose: (entityId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function EntityPicker({ target, teams, onChoose, onClear, onClose }: EntityPickerProps) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [rarity, setRarity] = useState("ALL");
  const pickerTargetKey = targetKey(target);
  const translateEnum = (value: string) =>
    t(`enums.${value}`, { defaultValue: formatEnumLabel(value) });

  useEffect(() => {
    setQuery("");
    setFilter("ALL");
    setRarity("ALL");
  }, [target?.kind]);

  useEffect(() => {
    if (!target) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector('[aria-modal="true"]')
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, target]);

  const canonicalEntities = useMemo(() => (target ? entitiesForTarget(target) : []), [target]);
  const allEntities = useLocalizedEntities(canonicalEntities);
  const collator = useMemo(
    () => new Intl.Collator(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );
  const filtered = useMemo(
    () =>
      target
        ? buildPickerViews({
            entities: allEntities,
            target,
            teams,
            query,
            filter,
            rarity,
            collator,
          })
        : [],
    [allEntities, collator, filter, query, rarity, target, teams],
  );

  if (!target) {
    return (
      <aside
        key={pickerTargetKey}
        className="entity-picker entity-picker--empty"
        data-picker-target={pickerTargetKey}
      >
        <span className="picker-orbit" aria-hidden="true">
          <span />
        </span>
        <h2>{t("picker.emptyTitle")}</h2>
      </aside>
    );
  }

  const currentEntity = getTargetEntity(teams, target);
  const filters = filtersForTarget(target);
  const targetDescription = describeTarget(target, t);

  return (
    <aside
      key={pickerTargetKey}
      className="entity-picker"
      data-picker-target={pickerTargetKey}
      aria-label={t("picker.label", { target: targetDescription })}
    >
      <header className="entity-picker__header">
        <div>
          <span className="picker-kicker">{t("picker.nowEditing")}</span>
          <h2>{targetDescription}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t("picker.close")}
        >
          <X size={18} />
        </button>
      </header>

      <label className="search-field">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("picker.search")}
          aria-label={t("picker.searchLabel")}
          autoFocus
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t("picker.clearSearch")}>
            <X size={15} />
          </button>
        )}
      </label>

      {filters.length > 0 && (
        <div className="filter-strip" aria-label={t("picker.primaryFilters")}>
          {["ALL", ...filters].map((value) => (
            <button
              type="button"
              key={value}
              data-active={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "ALL" ? t("picker.all") : translateEnum(value)}
            </button>
          ))}
        </div>
      )}

      {target.kind === "wheel" && (
        <div
          className="filter-strip filter-strip--secondary"
          aria-label={t("picker.rarityFilters")}
        >
          {["ALL", ...gameCatalog.filters.wheelRarities].map((value) => (
            <button
              type="button"
              key={value}
              data-active={rarity === value}
              onClick={() => setRarity(value)}
            >
              {value === "ALL" ? t("picker.allRarity") : value}
            </button>
          ))}
        </div>
      )}

      <div className="picker-results-meta">
        <span>{t("picker.recordCount", { count: filtered.length })}</span>
        {currentEntity && (
          <button type="button" onClick={onClear}>
            <Eraser size={14} />
            {t("picker.clearSlot")}
          </button>
        )}
      </div>

      <div className="picker-grid">
        {filtered.map(({ entity, text, used, blocked }) => {
          const meta = getEntityMeta(entity, t);
          const hasStatus = blocked || !entity.lineupToken;
          return (
            <button
              type="button"
              className={clsx("picker-card", used && "picker-card--used")}
              key={entity.id}
              disabled={blocked}
              onClick={() => onChoose(entity.id)}
              title={
                blocked
                  ? `${text.description}\n\n${t("picker.realmLimitDetail")}`
                  : text.description
              }
            >
              <span className="picker-card__visual">
                <EntityArtwork entity={entity} size="medium" />
                {(entity.kind === "awakener" || entity.kind === "posse") && (
                  <RealmBadge realm={entity.realm} iconOnly />
                )}
                {used && <span className="picker-card__used-overlay">{t("picker.replace")}</span>}
              </span>
              <span className="picker-card__body">
                <strong title={text.name}>{text.name}</strong>
                {meta && <small>{meta}</small>}
                {hasStatus && (
                  <span className="picker-card__footer">
                    {blocked ? (
                      <b className="status-chip status-chip--blocked">{t("picker.realmLimit")}</b>
                    ) : (
                      <b className="status-chip status-chip--warning">{t("picker.planningOnly")}</b>
                    )}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="no-results">{t("picker.noResults")}</p>}
      </div>
    </aside>
  );
}
