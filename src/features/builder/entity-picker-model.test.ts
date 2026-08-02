import { describe, expect, it } from "vitest";

import { gameCatalog } from "@/data-access/catalog";
import { localizeEntities } from "@/data-access/entity-localization";
import { createDefaultTeams } from "@/domain/team-rules";

import { buildPickerViews, entitiesForTarget } from "./entity-picker-model";

describe("entity picker model", () => {
  it("excludes compatibility entities and keeps availability groups ordered", () => {
    const target = { kind: "posse", teamId: "team-1" } as const;
    const entities = entitiesForTarget(target);
    expect(entities.every((entity) => entity.selectable)).toBe(true);
    expect(entities).toHaveLength(
      gameCatalog.entities.posses.filter((entity) => entity.selectable).length,
    );

    const teams = createDefaultTeams();
    teams[1].posseId = entities[0].id;
    const views = buildPickerViews({
      entities: localizeEntities(entities, "en"),
      target,
      teams,
      query: "",
      filter: "ALL",
      rarity: "ALL",
      collator: new Intl.Collator("en"),
    });
    expect(views.at(-1)).toMatchObject({ entity: { id: entities[0].id }, used: true });
  });
});
