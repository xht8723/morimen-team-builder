import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import rawTranslations from "@/generated/entity-translations.json";
import { normalizeAppLanguage } from "@/i18n";
import type { AppLanguage } from "@/i18n";
import type { EntityKind, GameEntity } from "@/domain/types";

interface LocalizedFields {
  name?: string;
  description?: string;
  aliases?: string[];
}

type LocalizedScope = Record<string, LocalizedFields>;

interface EntityTranslations {
  schemaVersion: 1;
  locales: {
    "zh-CN": Record<"awakeners" | "wheels" | "covenants" | "posses", LocalizedScope>;
  };
}

const entityTranslations = rawTranslations as EntityTranslations;

const scopeByKind = {
  awakener: "awakeners",
  wheel: "wheels",
  covenant: "covenants",
  posse: "posses",
} as const satisfies Record<EntityKind, string>;

export interface EntityText {
  name: string;
  description: string;
  aliases: string[];
  fallback: {
    name: boolean;
    description: boolean;
    aliases: boolean;
  };
}

export interface LocalizedEntityView<T extends GameEntity = GameEntity> {
  entity: T;
  text: EntityText;
  searchTerms: string[];
}

function resolvedLanguage(language: string | null | undefined): AppLanguage {
  return normalizeAppLanguage(language) ?? "en";
}

export function resolveEntityText(
  entity: GameEntity,
  language: string | null | undefined,
): EntityText {
  if (resolvedLanguage(language) !== "zh-CN") {
    return {
      name: entity.name,
      description: entity.description,
      aliases: entity.aliases,
      fallback: { name: true, description: true, aliases: true },
    };
  }

  const scope = scopeByKind[entity.kind];
  const localized = entityTranslations.locales["zh-CN"][scope][entity.id];
  return {
    name: localized?.name ?? entity.name,
    description: localized?.description ?? entity.description,
    aliases: localized?.aliases ?? entity.aliases,
    fallback: {
      name: !localized?.name,
      description: !localized?.description,
      aliases: !localized?.aliases,
    },
  };
}

export function localizeEntities<T extends GameEntity>(
  entities: readonly T[],
  language: string | null | undefined,
): LocalizedEntityView<T>[] {
  return entities.map((entity) => {
    const text = resolveEntityText(entity, language);
    return {
      entity,
      text,
      searchTerms: [
        ...new Set([
          text.name,
          ...text.aliases,
          entity.name,
          ...entity.aliases,
          ...entity.searchTags,
        ]),
      ],
    };
  });
}

export function useLocalizedEntities<T extends GameEntity>(
  entities: readonly T[],
): LocalizedEntityView<T>[] {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => localizeEntities(entities, language), [entities, language]);
}
