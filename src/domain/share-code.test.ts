import { describe, expect, it } from "vitest";

import { gameCatalog } from "@/data-access/catalog";

import { decodeTeam, encodeTeam } from "./share-code";
import { createDefaultTeams } from "./team-rules";

describe("share-code codec", () => {
  it("encodes all 17 empty fields as the reserved empty token", () => {
    const result = encodeTeam(createDefaultTeams()[0]);

    expect(result).toEqual({ ok: true, code: `@@${"a".repeat(17)}@@` });
  });

  it("round-trips the documented real-game sample exactly", () => {
    const sample = "@@xjwOvyVxhvRxXro6vBnw2@@";
    const decoded = decodeTeam(sample);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(encodeTeam(decoded.team)).toEqual({ ok: true, code: sample });
  });

  it("rejects trailing data and case-changed tokens", () => {
    expect(decodeTeam(`@@${"a".repeat(17)}z@@`)).toMatchObject({ ok: false });

    const tokenWithCaseTwin = gameCatalog.entities.wheels.find((wheel) =>
      gameCatalog.entities.wheels.some(
        (candidate) =>
          candidate.id !== wheel.id &&
          candidate.lineupToken?.toLowerCase() === wheel.lineupToken?.toLowerCase(),
      ),
    );
    expect(tokenWithCaseTwin).toBeDefined();
    if (!tokenWithCaseTwin?.lineupToken) return;

    const team = createDefaultTeams()[0];
    team.slots[0].wheelIds[0] = tokenWithCaseTwin.id;
    const encoded = encodeTeam(team);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const changed = encoded.code.replace(
      tokenWithCaseTwin.lineupToken,
      tokenWithCaseTwin.lineupToken === tokenWithCaseTwin.lineupToken.toUpperCase()
        ? tokenWithCaseTwin.lineupToken.toLowerCase()
        : tokenWithCaseTwin.lineupToken.toUpperCase(),
    );
    const decoded = decodeTeam(changed);
    if (decoded.ok) {
      expect(decoded.team.slots[0].wheelIds[0]).not.toBe(tokenWithCaseTwin.id);
    } else {
      expect(decoded.reason).toMatch(/unknown|trailingData/);
    }
  });

  it("blocks a truthful code when a selected record has no token", () => {
    const tokenless = gameCatalog.entities.posses.find((posse) => !posse.lineupToken);
    expect(tokenless).toBeDefined();
    if (!tokenless) return;

    const team = createDefaultTeams()[0];
    team.posseId = tokenless.id;

    expect(encodeTeam(team)).toMatchObject({
      ok: false,
      reason: "noToken",
      entities: [{ kind: "posse", id: tokenless.id }],
    });
  });
});
