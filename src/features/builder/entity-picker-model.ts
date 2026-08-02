import Fuse from "fuse.js";

import { formatEnumLabel, gameCatalog } from "@/data-access/catalog";
import type { LocalizedEntityView } from "@/data-access/entity-localization";
import { canAssignAwakener, isEntityAssigned } from "@/domain/team-rules";
import type { GameEntity, PickerTarget, Team } from "@/domain/types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface PickerEntityView extends LocalizedEntityView {
  used: boolean;
  blocked: boolean;
}

export function entitiesForTarget(target: PickerTarget): GameEntity[] {
  const entities =
    target.kind === "awakener"
      ? gameCatalog.entities.awakeners
      : target.kind === "wheel"
        ? gameCatalog.entities.wheels
        : target.kind === "covenant"
          ? gameCatalog.entities.covenants
          : gameCatalog.entities.posses;
  return entities.filter((entity) => entity.selectable);
}

export function filtersForTarget(target: PickerTarget): string[] {
  if (target.kind === "awakener") return gameCatalog.filters.realms;
  if (target.kind === "wheel") return gameCatalog.filters.wheelMainstats;
  if (target.kind === "posse") return gameCatalog.filters.posseRealms;
  return [];
}

export function describeTarget(target: PickerTarget, translate: Translate): string {
  if (target.kind === "posse") return translate("target.posse");
  if (target.kind === "awakener") {
    return translate("target.awakener", { number: target.slotIndex + 1 });
  }
  if (target.kind === "wheel") {
    return translate("target.wheel", {
      slot: target.slotIndex + 1,
      wheel: target.wheelIndex + 1,
    });
  }
  return translate("target.covenant", { slot: target.slotIndex + 1 });
}

export function getEntityMeta(entity: GameEntity, translate: Translate): string | null {
  if (entity.kind !== "wheel") return null;
  return `${entity.rarity} · ${translate(`enums.${entity.mainstatKey}`, {
    defaultValue: formatEnumLabel(entity.mainstatKey),
  })}`;
}

const wheelRarityOrder = ["SSR", "SR", "R", "N"];
const wheelRealmOrder = [...gameCatalog.filters.realms, "NEUTRAL"];

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
  return leftRank === order.length ? left.localeCompare(right) : 0;
}

export function comparePickerEntities(
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
    categoryComparison =
      compareRankedValues(leftEntity.rarity, rightEntity.rarity, wheelRarityOrder) ||
      compareRankedValues(leftEntity.realm, rightEntity.realm, wheelRealmOrder);
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

interface BuildPickerViewsOptions {
  entities: LocalizedEntityView[];
  target: PickerTarget;
  teams: Team[];
  query: string;
  filter: string;
  rarity: string;
  collator: Intl.Collator;
}

export function buildPickerViews({
  entities,
  target,
  teams,
  query,
  filter,
  rarity,
  collator,
}: BuildPickerViewsOptions): PickerEntityView[] {
  const normalizedQuery = query.trim();
  const searched = normalizedQuery
    ? new Fuse(entities, {
        keys: ["searchTerms"],
        threshold: 0.3,
        ignoreLocation: true,
      })
        .search(normalizedQuery)
        .map((result) => result.item)
    : entities;

  return searched
    .filter(({ entity }) => {
      if (filter === "ALL") return true;
      if (entity.kind === "awakener" || entity.kind === "posse") return entity.realm === filter;
      if (entity.kind === "wheel") return entity.mainstatKey === filter;
      return true;
    })
    .filter(({ entity }) => entity.kind !== "wheel" || rarity === "ALL" || entity.rarity === rarity)
    .map((view) => ({
      ...view,
      used:
        view.entity.kind !== "covenant" &&
        isEntityAssigned(teams, view.entity.kind, view.entity.id),
      blocked: view.entity.kind === "awakener" && !canAssignAwakener(teams, target, view.entity.id),
    }))
    .sort((left, right) => comparePickerEntities(left, right, collator));
}
