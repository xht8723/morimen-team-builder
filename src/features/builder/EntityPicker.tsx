import clsx from "clsx";
import Fuse from "fuse.js";
import { Eraser, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EntityArtwork, RealmBadge } from "@/components/ui/EntityArtwork";
import { formatEnumLabel, gameCatalog } from "@/data-access/catalog";
import { useLocalizedEntities, type LocalizedEntityView } from "@/data-access/entity-localization";
import {
  canAssignAwakener,
  describeTarget,
  getTargetEntity,
  isEntityAssigned,
} from "@/domain/team-rules";
import type { GameEntity, PickerTarget, Team } from "@/domain/types";

interface EntityPickerProps {
  target: PickerTarget | null;
  teams: Team[];
  onChoose: (entityId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const hiddenPosseNamePattern = /^primordial memory(?:·|\b)/i;

function getPickerTargetKey(target: PickerTarget | null) {
  if (!target) return "empty";
  if (target.kind === "posse") return `posse:${target.teamId}`;
  const slotKey = `${target.kind}:${target.teamId}:${String(target.slotIndex)}`;
  return target.kind === "wheel" ? `${slotKey}:${String(target.wheelIndex)}` : slotKey;
}

function entitiesForTarget(target: PickerTarget): GameEntity[] {
  if (target.kind === "awakener") return gameCatalog.entities.awakeners;
  if (target.kind === "wheel") return gameCatalog.entities.wheels;
  if (target.kind === "covenant") return gameCatalog.entities.covenants;
  return gameCatalog.entities.posses.filter((posse) => !hiddenPosseNamePattern.test(posse.name));
}

function getEntityMeta(entity: GameEntity, translateEnum: (value: string) => string) {
  if (entity.kind === "wheel") return `${entity.rarity} · ${translateEnum(entity.mainstatKey)}`;
  return null;
}

const wheelRarityOrder = ["SSR", "SR", "R", "N"];
const wheelRealmOrder = [...gameCatalog.filters.realms, "NEUTRAL"];

interface PickerEntityView extends LocalizedEntityView {
  used: boolean;
  blocked: boolean;
}

function getAvailabilityRank({ used, blocked }: PickerEntityView) {
  if (used) return 1;
  return blocked ? 2 : 0;
}

function compareRankedValues(left: string, right: string, order: string[]) {
  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);
  const leftRank = leftIndex === -1 ? order.length : leftIndex;
  const rightRank = rightIndex === -1 ? order.length : rightIndex;

  if (leftRank !== rightRank) return leftRank - rightRank;
  if (leftRank === order.length) {
    const categoryComparison = left.localeCompare(right);
    if (categoryComparison !== 0) return categoryComparison;
  }
  return 0;
}

function comparePickerEntities(
  left: PickerEntityView,
  right: PickerEntityView,
  collator: Intl.Collator,
) {
  const availabilityComparison = getAvailabilityRank(left) - getAvailabilityRank(right);
  if (availabilityComparison !== 0) return availabilityComparison;

  const leftEntity = left.entity;
  const rightEntity = right.entity;
  if (leftEntity.kind !== rightEntity.kind) return leftEntity.kind.localeCompare(rightEntity.kind);

  let categoryComparison = 0;
  if (leftEntity.kind === "wheel" && rightEntity.kind === "wheel") {
    const rarityComparison = compareRankedValues(
      leftEntity.rarity,
      rightEntity.rarity,
      wheelRarityOrder,
    );
    categoryComparison =
      rarityComparison || compareRankedValues(leftEntity.realm, rightEntity.realm, wheelRealmOrder);
  } else if (leftEntity.kind === "awakener" && rightEntity.kind === "awakener") {
    categoryComparison = compareRankedValues(
      leftEntity.realm,
      rightEntity.realm,
      gameCatalog.filters.realms,
    );
  } else if (leftEntity.kind === "posse" && rightEntity.kind === "posse") {
    categoryComparison = compareRankedValues(
      leftEntity.realm,
      rightEntity.realm,
      gameCatalog.filters.posseRealms,
    );
  }

  return categoryComparison || collator.compare(left.text.name, right.text.name);
}

export function EntityPicker({ target, teams, onChoose, onClear, onClose }: EntityPickerProps) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [rarity, setRarity] = useState("ALL");
  const pickerTargetKey = getPickerTargetKey(target);
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
      if (event.key === "Escape") onClose();
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
  const fuse = useMemo(
    () =>
      new Fuse(allEntities, {
        keys: ["searchTerms"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [allEntities],
  );

  const filtered = useMemo(() => {
    const searched = query.trim()
      ? fuse.search(query.trim()).map((result) => result.item)
      : allEntities;
    return [...searched]
      .filter(({ entity }) => {
        if (filter === "ALL") return true;
        if (entity.kind === "awakener" || entity.kind === "posse") return entity.realm === filter;
        if (entity.kind === "wheel") return entity.mainstatKey === filter;
        return true;
      })
      .filter(
        ({ entity }) => entity.kind !== "wheel" || rarity === "ALL" || entity.rarity === rarity,
      )
      .map((view) => ({
        ...view,
        used:
          target !== null &&
          view.entity.kind !== "covenant" &&
          isEntityAssigned(teams, view.entity.kind, view.entity.id),
        blocked:
          target !== null &&
          view.entity.kind === "awakener" &&
          !canAssignAwakener(teams, target, view.entity.id),
      }))
      .sort((left, right) => comparePickerEntities(left, right, collator));
  }, [allEntities, collator, filter, fuse, query, rarity, target, teams]);

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
  const filters =
    target.kind === "awakener"
      ? gameCatalog.filters.realms
      : target.kind === "wheel"
        ? gameCatalog.filters.wheelMainstats
        : target.kind === "posse"
          ? gameCatalog.filters.posseRealms
          : [];

  return (
    <aside
      key={pickerTargetKey}
      className="entity-picker"
      data-picker-target={pickerTargetKey}
      aria-label={t("picker.label", { target: describeTarget(target) })}
    >
      <header className="entity-picker__header">
        <div>
          <span className="picker-kicker">{t("picker.nowEditing")}</span>
          <h2>{describeTarget(target)}</h2>
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
          const meta = getEntityMeta(entity, translateEnum);
          const hasStatus = blocked || !entity.lineupToken;
          return (
            <button
              type="button"
              className={clsx(
                "picker-card",
                used && "picker-card--used",
                hasStatus && "picker-card--status",
              )}
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
