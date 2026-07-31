import { describe, expect, it } from "vitest";

import { gameCatalog } from "./catalog";
import { localizeEntities, resolveEntityText } from "./entity-localization";

describe("entity localization", () => {
  it("keeps canonical entities immutable and falls back to English outside Chinese", () => {
    const entity = gameCatalog.entities.awakeners[0];
    const originalName = entity.name;
    const english = resolveEntityText(entity, "en");
    const unsupported = resolveEntityText(entity, "fr");

    expect(english.name).toBe(entity.name);
    expect(english.description).toBe(entity.description);
    expect(english.fallback).toEqual({ name: true, description: true, aliases: true });
    expect(unsupported).toEqual(english);
    expect(entity.name).toBe(originalName);
  });

  it("resolves complete Chinese names and descriptions for every authoritative entity", () => {
    const entities = Object.values(gameCatalog.entities).flat();

    for (const entity of entities) {
      const text = resolveEntityText(entity, "zh-CN");
      expect(text.name, entity.id).not.toBe(entity.name);
      expect(text.description, entity.id).not.toBe(entity.description);
      expect(text.fallback.name, entity.id).toBe(false);
      expect(text.fallback.description, entity.id).toBe(false);
    }
  });

  it("searches localized and canonical terms together", () => {
    const entity = gameCatalog.entities.awakeners.find(
      (candidate) => candidate.name === "Agrippa",
    )!;
    const [view] = localizeEntities([entity], "zh-CN");

    expect(view.text.name).toBe("阿格里帕");
    expect(view.searchTerms).toContain("阿格里帕");
    expect(view.searchTerms).toContain("Agrippa");
    for (const alias of entity.aliases) expect(view.searchTerms).toContain(alias);
  });
});
