import { describe, expect, it } from "vitest";

import { gameCatalog } from "@/data-access/catalog";
import { encodeTeam } from "@/domain/share-code";
import { createDefaultTeams } from "@/domain/team-rules";
import type { RecommendedTeamDefinition, RecommendedTeamsCatalog } from "@/domain/types";

import { resolveRecommendedTeams } from "./recommended-teams";

const validCode = "@@oMh69yJeyIfySyeyTkmthj@@";

function definition(
  id: string,
  code: string,
  name = { en: "Readable team", "zh-CN": "可读队伍" },
): RecommendedTeamDefinition {
  return {
    id,
    name,
    summary: { en: "Runtime fixture.", "zh-CN": "运行时测试。" },
    code,
  };
}

function catalog(...teams: RecommendedTeamDefinition[]): RecommendedTeamsCatalog {
  return { schemaVersion: 1, teams };
}

describe("recommended team resolution", () => {
  it("decodes valid codes while preserving source metadata and code", () => {
    const source = definition("valid", validCode);

    expect(resolveRecommendedTeams(catalog(source))).toEqual([
      expect.objectContaining({
        ...source,
        team: expect.objectContaining({ id: "recommended-valid", name: "Readable team" }),
      }),
    ]);
  });

  it("requires an exact wrapper and silently omits invalid or outdated codes", () => {
    const resolved = resolveRecommendedTeams(
      catalog(
        definition("valid", validCode),
        definition("prefixed", `prefix${validCode}`),
        definition("outdated", "@@zzzz@@"),
        definition("malformed", "not-a-team-code"),
      ),
    );

    expect(resolved.map((recommendation) => recommendation.id)).toEqual(["valid"]);
  });

  it("silently omits duplicate-entity and realm-invalid codes", () => {
    const duplicateTeam = createDefaultTeams()[0];
    const duplicateAwakener = gameCatalog.entities.awakeners.find(
      (awakener) => awakener.lineupToken,
    );
    expect(duplicateAwakener).toBeDefined();
    if (!duplicateAwakener) return;
    duplicateTeam.slots[0].awakenerId = duplicateAwakener.id;
    duplicateTeam.slots[1].awakenerId = duplicateAwakener.id;
    const duplicateCode = encodeTeam(duplicateTeam);
    expect(duplicateCode.ok).toBe(true);
    if (!duplicateCode.ok) return;

    const realmTeam = createDefaultTeams()[0];
    const realmAwakeners = ["AEQUOR", "CARO", "CHAOS"].map((realm) =>
      gameCatalog.entities.awakeners.find(
        (awakener) => awakener.realm === realm && awakener.lineupToken,
      ),
    );
    expect(realmAwakeners.every(Boolean)).toBe(true);
    realmAwakeners.forEach((awakener, index) => {
      realmTeam.slots[index].awakenerId = awakener?.id ?? null;
    });
    const realmCode = encodeTeam(realmTeam);
    expect(realmCode.ok).toBe(true);
    if (!realmCode.ok) return;

    expect(
      resolveRecommendedTeams(
        catalog(definition("duplicate", duplicateCode.code), definition("realms", realmCode.code)),
      ),
    ).toEqual([]);
  });

  it("returns an empty list when every code is invalid", () => {
    expect(
      resolveRecommendedTeams(catalog(definition("one", ""), definition("two", "@@unknown@@"))),
    ).toEqual([]);
  });
});
