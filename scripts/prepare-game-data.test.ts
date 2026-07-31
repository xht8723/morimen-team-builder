import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const compiler = path.resolve("scripts/prepare-game-data.mjs");
const temporaryRoots: string[] = [];

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value), "utf8");
}

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "morimens-data-"));
  temporaryRoots.push(root);
  const data = path.join(root, "data");
  const records = {
    awakeners: [
      {
        schemaVersion: 3,
        id: "awakener-1",
        kind: "awakener",
        name: "Awakener One",
        lineupToken: "A",
        realm: "CHAOS",
        rarity: "SSR",
        type: "DAMAGE",
      },
    ],
    wheels: [
      {
        schemaVersion: 3,
        id: "wheel-1",
        kind: "wheel",
        name: "Wheel One",
        lineupToken: "W",
        realm: "CHAOS",
        rarity: "SSR",
        mainstatKey: "CRIT_RATE",
      },
    ],
    covenants: [
      {
        schemaVersion: 3,
        id: "covenant-1",
        kind: "covenant",
        name: "Covenant One",
        lineupToken: "C",
      },
    ],
    posses: [
      {
        schemaVersion: 3,
        id: "posse-1",
        kind: "posse",
        name: "Posse One",
        lineupToken: "P",
        realm: "CHAOS",
      },
    ],
  };

  const manifestFiles: Record<string, object> = {};
  const assetEntities: Record<string, Record<string, string>> = {};
  const assets: Record<string, object> = {};
  const options: Record<string, string[]> = {};

  for (const [scope, scopeRecords] of Object.entries(records)) {
    options[scope] = [];
    for (const record of scopeRecords) {
      const recordFile = `records/${scope}/${record.id}.json`;
      manifestFiles[recordFile] = {};
      options[scope].push(record.id);
      await writeJson(path.join(data, recordFile), record);

      const iconId = `${record.id}-icon`;
      const iconPath = `src/assets/icons/${record.id}.webp`;
      assetEntities[record.id] = { icon: iconId };
      assets[iconId] = {
        availability: { status: "available", path: iconPath },
      };
      await mkdir(path.join(data, "assets", "icons"), { recursive: true });
      await writeFile(path.join(data, "assets", "icons", `${record.id}.webp`), "fixture");

      if (record.kind === "posse") {
        const crystalId = `${record.id}-crystal`;
        const crystalPath = `src/assets/crystals/${record.id}.webp`;
        assetEntities[record.id].crystal = crystalId;
        assets[crystalId] = {
          availability: { status: "available", path: crystalPath },
        };
        await mkdir(path.join(data, "assets", "crystals"), { recursive: true });
        await writeFile(path.join(data, "assets", "crystals", `${record.id}.webp`), "fixture");
      }
    }
  }

  for (const realm of ["aequor", "caro", "chaos", "ultra"]) {
    const file = path.join(data, "assets", "ui", `realm-icon-${realm}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "fixture");
  }
  for (const font of ["DroidSerif.woff2", "DroidSerif-Bold.woff2"]) {
    const file = path.join(data, "assets", "fonts", "droid-serif", font);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "fixture");
  }
  const gameIcon = path.join(data, "assets", "icons", "game_icon.jpg");
  await mkdir(path.dirname(gameIcon), { recursive: true });
  await writeFile(gameIcon, "fixture");

  await writeJson(path.join(data, "meta", "manifest.json"), {
    schemaVersion: 3,
    gameDataVersion: "fixture-version",
    buildId: "fixture-build",
    generatedAt: "2026-07-30T00:00:00Z",
    files: manifestFiles,
  });
  await writeJson(path.join(data, "meta", "assets.json"), {
    schemaVersion: 3,
    entities: assetEntities,
    assets,
  });
  await writeJson(path.join(data, "meta", "builder-catalog.json"), {
    schemaVersion: 3,
    options,
  });
  return root;
}

function runCompiler(root: string) {
  return spawnSync(process.execPath, [compiler, "--root", root], {
    cwd: path.dirname(compiler),
    encoding: "utf8",
  });
}

function sourceHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("data compiler", () => {
  it("loads same-schema catalog additions while ignoring stale additive files", async () => {
    const root = await createFixture();
    const data = path.join(root, "data");
    const manifestFile = path.join(data, "meta", "manifest.json");
    const assetsFile = path.join(data, "meta", "assets.json");
    const catalogFile = path.join(data, "meta", "builder-catalog.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    const assets = JSON.parse(await readFile(assetsFile, "utf8"));
    const catalog = JSON.parse(await readFile(catalogFile, "utf8"));

    const added = {
      schemaVersion: 3,
      id: "awakener-2",
      kind: "awakener",
      name: "Awakener Two",
      lineupToken: "B",
      realm: "CARO",
      rarity: "SSR",
      type: "SUPPORT",
    };
    await writeJson(path.join(data, "records", "awakeners", "awakener-2.json"), added);
    manifest.files["records/awakeners/awakener-2.json"] = {};
    catalog.options.awakeners.push("awakener-2");
    assets.entities["awakener-2"] = { icon: "awakener-2-icon" };
    assets.assets["awakener-2-icon"] = {
      availability: { status: "available", path: "src/assets/icons/awakener-2.webp" },
    };
    await writeFile(path.join(data, "assets", "icons", "awakener-2.webp"), "fixture");

    await writeJson(path.join(data, "records", "awakeners", "stale-local-record.json"), {
      ...added,
      id: "stale-local-record",
      name: "Stale",
      lineupToken: "Z",
    });
    await writeJson(manifestFile, manifest);
    await writeJson(assetsFile, assets);
    await writeJson(catalogFile, catalog);

    const result = runCompiler(root);
    expect(result.status, result.stderr).toBe(0);
    const generated = JSON.parse(
      await readFile(path.join(root, "src", "generated", "game-data.json"), "utf8"),
    );
    expect(generated.entities.awakeners.map((entity: { id: string }) => entity.id)).toEqual([
      "awakener-1",
      "awakener-2",
    ]);
  });

  it("fails clearly on schema drift and unavailable referenced assets", async () => {
    const schemaRoot = await createFixture();
    const schemaFile = path.join(schemaRoot, "data", "meta", "manifest.json");
    const manifest = JSON.parse(await readFile(schemaFile, "utf8"));
    manifest.schemaVersion = 4;
    await writeJson(schemaFile, manifest);
    expect(runCompiler(schemaRoot).stderr).toContain("Unsupported public data schema 4");

    const assetRoot = await createFixture();
    const assetFile = path.join(assetRoot, "data", "meta", "assets.json");
    const assetIndex = JSON.parse(await readFile(assetFile, "utf8"));
    assetIndex.assets["wheel-1-icon"].availability.status = "missing";
    await writeJson(assetFile, assetIndex);
    expect(runCompiler(assetRoot).stderr).toContain("Unavailable asset wheel-1-icon");
  });

  it("rejects category token prefix conflicts", async () => {
    const root = await createFixture();
    const data = path.join(root, "data");
    const manifestFile = path.join(data, "meta", "manifest.json");
    const assetsFile = path.join(data, "meta", "assets.json");
    const catalogFile = path.join(data, "meta", "builder-catalog.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    const assets = JSON.parse(await readFile(assetsFile, "utf8"));
    const catalog = JSON.parse(await readFile(catalogFile, "utf8"));

    await writeJson(path.join(data, "records", "wheels", "wheel-2.json"), {
      schemaVersion: 3,
      id: "wheel-2",
      kind: "wheel",
      name: "Wheel Two",
      lineupToken: "WX",
      realm: "CARO",
      rarity: "SSR",
      mainstatKey: "ATTACK",
    });
    manifest.files["records/wheels/wheel-2.json"] = {};
    catalog.options.wheels.push("wheel-2");
    assets.entities["wheel-2"] = { icon: "wheel-2-icon" };
    assets.assets["wheel-2-icon"] = {
      availability: { status: "available", path: "src/assets/icons/wheel-2.webp" },
    };
    await writeFile(path.join(data, "assets", "icons", "wheel-2.webp"), "fixture");
    await writeJson(manifestFile, manifest);
    await writeJson(assetsFile, assets);
    await writeJson(catalogFile, catalog);

    expect(runCompiler(root).stderr).toContain("wheels tokens are not prefix-safe: W, WX");
  });

  it("compiles current entity translations and falls back for stale fields", async () => {
    const root = await createFixture();
    const translationDirectory = path.join(root, "translations", "entities", "zh-CN", "awakeners");
    await writeJson(path.join(translationDirectory, "awakener-1.json"), {
      schemaVersion: 1,
      id: "awakener-1",
      kind: "awakener",
      fields: {
        name: {
          value: "唤醒者一号",
          sourceHash: sourceHash("Awakener One"),
          status: "reviewed",
        },
        description: {
          value: "过期的描述",
          sourceHash: sourceHash("Old description"),
          status: "machine",
        },
      },
    });
    await writeJson(path.join(translationDirectory, "removed-awakener.json"), {
      schemaVersion: 1,
      id: "removed-awakener",
      kind: "awakener",
      fields: {
        name: {
          value: "已移除",
          sourceHash: sourceHash("Removed"),
          status: "machine",
        },
      },
    });

    const result = runCompiler(root);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("description source changed; using English fallback");
    expect(result.stderr).toContain("entity is no longer authoritative; ignored");
    expect(result.stdout).toContain('"name":1');
    expect(result.stdout).toContain('"stale":1');

    const generated = JSON.parse(
      await readFile(path.join(root, "src", "generated", "entity-translations.json"), "utf8"),
    );
    expect(generated.locales["zh-CN"].awakeners).toEqual({
      "awakener-1": { name: "唤醒者一号" },
    });
  });

  it("rejects malformed or incorrectly scoped translation overlays", async () => {
    const root = await createFixture();
    await writeJson(
      path.join(root, "translations", "entities", "zh-CN", "awakeners", "awakener-1.json"),
      {
        schemaVersion: 1,
        id: "awakener-1",
        kind: "wheel",
        fields: {
          name: {
            value: "唤醒者一号",
            sourceHash: sourceHash("Awakener One"),
            status: "machine",
          },
        },
      },
    );

    const result = runCompiler(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("has unexpected kind wheel");
  });
});
