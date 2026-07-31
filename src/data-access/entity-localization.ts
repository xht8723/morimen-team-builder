import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import rawTranslations from "@/generated/entity-translations.json";
import { normalizeAppLanguage } from "@/i18n";
import type { AppLanguage } from "@/i18n";
import type { EntityKind, GameEntity } from "@/domain/types";

const localizedFieldsSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  aliases: z.array(z.string()).optional(),
});

const scopeSchema = z.record(z.string(), localizedFieldsSchema);
const translationsSchema = z.object({
  schemaVersion: z.literal(1),
  locales: z.object({
    "zh-CN": z.object({
      awakeners: scopeSchema,
      wheels: scopeSchema,
      covenants: scopeSchema,
      posses: scopeSchema,
    }),
  }),
});

const entityTranslations = translationsSchema.parse(rawTranslations);

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
    aliases: localized?.aliases ?? [],
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
        text.name,
        ...text.aliases,
        entity.name,
        ...entity.aliases,
        ...entity.searchTags,
      ].filter((value, index, values) => value && values.indexOf(value) === index),
    };
  });
}

export function useEntityText(entity: GameEntity | undefined): EntityText | undefined {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(
    () => (entity ? resolveEntityText(entity, language) : undefined),
    [entity, language],
  );
}

export function useLocalizedEntities<T extends GameEntity>(
  entities: readonly T[],
): LocalizedEntityView<T>[] {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => localizeEntities(entities, language), [entities, language]);
}
