import { getEntity } from "@/data-access/catalog";
import { resolveEntityText } from "@/data-access/entity-localization";
import type { CodecFailure } from "@/domain/share-code";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function formatCodecFailure(
  failure: CodecFailure,
  language: string | null | undefined,
  translate: Translate,
) {
  if (failure.reason === "noToken") {
    const names = (failure.entities ?? []).map((reference) => {
      const entity = getEntity(reference.kind, reference.id);
      return entity ? resolveEntityText(entity, language).name : reference.id;
    });
    return translate("errors.noToken", { names: names.join(", ") });
  }

  const keys = {
    invalidWrapper: "errors.invalidWrapper",
    unknownAwakener: "errors.unknownAwakener",
    unknownWheel: "errors.unknownWheel",
    unknownCovenantToken: "errors.unknownCovenantToken",
    unknownPosse: "errors.unknownPosse",
    trailingData: "errors.trailingData",
    duplicateEntity: "errors.duplicateEntity",
    importRealm: "errors.importRealm",
  } as const;
  return translate(keys[failure.reason]);
}
