import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootFlagIndex = process.argv.indexOf("--root");
const root = rootFlagIndex >= 0 ? path.resolve(process.argv[rootFlagIndex + 1] ?? "") : scriptRoot;
const dataRoot = path.join(root, "data");
const assetsRoot = path.join(dataRoot, "assets");
const generatedSourceRoot = path.join(root, "src", "generated");
const generatedAssetsRoot = path.join(root, "public", "generated-assets");
const translationsRoot = path.join(root, "translations", "entities");

const scopes = ["awakeners", "wheels", "covenants", "posses"];
const expectedKinds = {
  awakeners: "awakener",
  wheels: "wheel",
  covenants: "covenant",
  posses: "posse",
};
const translationFields = ["name", "description", "aliases"];
const translationStatuses = new Set(["machine", "reference", "reviewed"]);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sourceHash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function validateLocalizedString(value, label) {
  invariant(typeof value === "string" && value.trim().length > 0, `${label} is empty`);
  const hasUnsupportedControlCharacter = [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (codePoint < 32 && ![9, 10, 13].includes(codePoint)) || codePoint === 127;
  });
  invariant(!hasUnsupportedControlCharacter, `${label} contains control characters`);
  invariant(value === value.normalize("NFC"), `${label} must use NFC Unicode normalization`);
}

function validateTranslationField(field, fieldName, file) {
  invariant(
    field && typeof field === "object" && !Array.isArray(field),
    `${file} has invalid ${fieldName} field`,
  );
  invariant(
    typeof field.sourceHash === "string" && /^sha256:[a-f0-9]{64}$/.test(field.sourceHash),
    `${file} has invalid ${fieldName} sourceHash`,
  );
  invariant(translationStatuses.has(field.status), `${file} has invalid ${fieldName} status`);
  if (fieldName === "aliases") {
    invariant(Array.isArray(field.value), `${file} aliases must be an array`);
    for (const [index, alias] of field.value.entries()) {
      validateLocalizedString(alias, `${file} aliases[${String(index)}]`);
    }
    invariant(new Set(field.value).size === field.value.length, `${file} has duplicate aliases`);
    return;
  }
  validateLocalizedString(field.value, `${file} ${fieldName}`);
}

async function listJsonFiles(directory) {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function compileEntityTranslations(entities) {
  const locale = "zh-CN";
  const output = { schemaVersion: 1, locales: { [locale]: {} } };
  const warnings = [];
  const coverage = {};

  for (const scope of scopes) {
    const currentById = new Map(entities[scope].map((entity) => [entity.id, entity]));
    const seenIds = new Set();
    const compiledScope = {};
    const counters = {
      total: currentById.size,
      name: 0,
      description: 0,
      aliases: 0,
      machine: 0,
      reference: 0,
      reviewed: 0,
      stale: 0,
    };
    const directory = path.join(translationsRoot, locale, scope);

    for (const file of await listJsonFiles(directory)) {
      const overlay = await readJson(file);
      const relativeFile = path.relative(root, file).split(path.sep).join("/");
      invariant(
        overlay && typeof overlay === "object" && !Array.isArray(overlay),
        `${relativeFile} is not a JSON object`,
      );
      invariant(
        overlay.schemaVersion === 1,
        `${relativeFile} has unsupported translation schema ${String(overlay.schemaVersion)}`,
      );
      invariant(
        typeof overlay.id === "string" && overlay.id.length > 0,
        `${relativeFile} has no entity id`,
      );
      invariant(
        path.basename(file, ".json") === overlay.id,
        `${relativeFile} filename does not match entity id ${overlay.id}`,
      );
      invariant(
        overlay.kind === expectedKinds[scope],
        `${relativeFile} has unexpected kind ${String(overlay.kind)}`,
      );
      invariant(
        !seenIds.has(overlay.id),
        `${locale}/${scope} contains duplicate translation id ${overlay.id}`,
      );
      seenIds.add(overlay.id);
      invariant(
        overlay.fields && typeof overlay.fields === "object" && !Array.isArray(overlay.fields),
        `${relativeFile} has no translation fields`,
      );
      const providedFields = Object.keys(overlay.fields);
      invariant(providedFields.length > 0, `${relativeFile} has no translated fields`);
      for (const fieldName of providedFields) {
        invariant(
          translationFields.includes(fieldName),
          `${relativeFile} has unsupported field ${fieldName}`,
        );
        validateTranslationField(overlay.fields[fieldName], fieldName, relativeFile);
      }

      const entity = currentById.get(overlay.id);
      if (!entity) {
        warnings.push(`${relativeFile}: entity is no longer authoritative; ignored`);
        continue;
      }

      const compiledFields = {};
      for (const fieldName of translationFields) {
        const field = overlay.fields[fieldName];
        if (!field) continue;
        const canonicalValue = fieldName === "aliases" ? entity.aliases : entity[fieldName];
        if (field.sourceHash !== sourceHash(canonicalValue)) {
          counters.stale += 1;
          warnings.push(`${relativeFile}: ${fieldName} source changed; using English fallback`);
          continue;
        }
        compiledFields[fieldName] = field.value;
        counters[fieldName] += 1;
        counters[field.status] += 1;
      }
      if (Object.keys(compiledFields).length > 0) compiledScope[overlay.id] = compiledFields;
    }

    output.locales[locale][scope] = compiledScope;
    coverage[scope] = counters;
  }

  for (const warning of warnings) console.warn(`Translation warning: ${warning}`);
  console.log(`Entity translation coverage ${locale}: ${JSON.stringify(coverage)}`);
  return output;
}

function validateRecord(record, scope, file) {
  invariant(record && typeof record === "object", `${file} is not a JSON object`);
  invariant(record.schemaVersion === 3, `${file} has unsupported schema ${record.schemaVersion}`);
  invariant(record.kind === expectedKinds[scope], `${file} has unexpected kind ${record.kind}`);
  invariant(typeof record.id === "string" && record.id.length > 0, `${file} has no record id`);
  invariant(typeof record.name === "string" && record.name.length > 0, `${file} has no name`);
  if (record.lineupToken != null) {
    invariant(typeof record.lineupToken === "string", `${file} has a non-string lineupToken`);
  }
  if (record.kind === "awakener") {
    invariant(typeof record.realm === "string", `${file} has no awakener realm`);
    invariant(typeof record.rarity === "string", `${file} has no awakener rarity`);
    invariant(typeof record.type === "string", `${file} has no awakener type`);
  }
  if (record.kind === "wheel") {
    invariant(typeof record.realm === "string", `${file} has no wheel realm`);
    invariant(typeof record.rarity === "string", `${file} has no wheel rarity`);
    invariant(typeof record.mainstatKey === "string", `${file} has no wheel mainstatKey`);
  }
  if (record.kind === "posse") {
    invariant(typeof record.realm === "string", `${file} has no posse realm`);
  }
}

function replaceDescriptionArgs(template = "", args = {}) {
  return template
    .replace(/\[(?:[^:\]]+:)?([A-Za-z0-9_]+)\]/g, (_match, key) => {
      const entry = args[key];
      if (!entry) return key;
      if (entry.kind === "fixed") return String(entry.value ?? "");
      if (Array.isArray(entry.values)) return String(entry.values.at(-1) ?? "");
      return key;
    })
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDescription(record) {
  if (record.kind === "awakener") {
    return (
      record.profile?.storySections?.find((section) => section.kind === "introduction")?.content ??
      `${record.rarity} ${record.type} awakener of the ${record.realm} realm.`
    );
  }
  if (record.kind === "covenant") {
    return (record.setEffects ?? [])
      .map(
        (effect) =>
          `${String(effect.set)}-set: ${replaceDescriptionArgs(
            effect.descriptionTemplate,
            effect.descriptionArgs,
          )}`,
      )
      .join(" ");
  }
  return replaceDescriptionArgs(record.descriptionTemplate, record.descriptionArgs);
}

function sourcePathToLocal(sourcePath) {
  invariant(
    typeof sourcePath === "string" && sourcePath.startsWith("src/assets/"),
    `Unsupported asset source path: ${String(sourcePath)}`,
  );
  return path.join(assetsRoot, ...sourcePath.slice("src/assets/".length).split("/"));
}

function outputUrlForLocal(localPath) {
  const relative = path.relative(assetsRoot, localPath).split(path.sep).join("/");
  return `./generated-assets/${relative}`;
}

const filesToCopy = new Set();

async function registerAsset(localPath) {
  invariant(await exists(localPath), `Referenced asset does not exist: ${localPath}`);
  filesToCopy.add(localPath);
  return outputUrlForLocal(localPath);
}

async function resolveIndexedAsset(assetsIndex, entityId, slot) {
  const assetId = assetsIndex.entities?.[entityId]?.[slot];
  invariant(assetId, `Missing ${slot} asset mapping for ${entityId}`);
  const asset = assetsIndex.assets?.[assetId];
  invariant(asset, `Missing asset record ${assetId}`);
  invariant(
    asset.availability?.status === "available" && asset.availability.path,
    `Unavailable asset ${assetId}`,
  );
  return sourcePathToLocal(asset.availability.path);
}

async function resolveEntityAssets(record, assetsIndex) {
  const icon = await resolveIndexedAsset(assetsIndex, record.id, "icon");
  let thumb = icon;
  let full = icon;

  if (record.kind === "awakener") {
    const portrait = icon.replace(
      `${path.sep}awk-cards${path.sep}`,
      `${path.sep}awk-portraits${path.sep}`,
    );
    if (await exists(portrait)) thumb = portrait;
  }

  if (record.kind === "wheel") {
    const mini = path.join(
      path.dirname(icon),
      "Mini",
      path.basename(icon).replace(/^Weapon_Full_/, "Weapon_Mini_"),
    );
    if (await exists(mini)) thumb = mini;
  }

  if (record.kind === "covenant") {
    const fullArt = icon.replace(
      `${path.sep}covenants${path.sep}Icon${path.sep}`,
      `${path.sep}covenants${path.sep}FullArt${path.sep}`,
    );
    if (await exists(fullArt)) full = fullArt;
  }

  if (record.kind === "posse") {
    full = await resolveIndexedAsset(assetsIndex, record.id, "crystal");
  }

  return {
    thumb: await registerAsset(thumb),
    full: await registerAsset(full),
  };
}

function validateTokens(scope, records) {
  const seen = new Map();
  const tokens = records.flatMap((record) => (record.lineupToken ? [record.lineupToken] : []));

  for (const token of tokens) {
    invariant(token !== "a", `${scope} uses reserved empty token "a"`);
    invariant(/^[A-Za-z0-9]{1,2}$/.test(token), `${scope} has invalid token ${token}`);
    invariant(!seen.has(token), `${scope} has duplicate case-sensitive token ${token}`);
    seen.set(token, true);
  }

  for (const left of tokens) {
    for (const right of tokens) {
      if (left !== right) {
        invariant(
          !right.startsWith(left),
          `${scope} tokens are not prefix-safe: ${left}, ${right}`,
        );
      }
    }
  }
}

function compactRecord(record, assets) {
  const common = {
    id: record.id,
    kind: record.kind,
    name: record.name,
    lineupToken: record.lineupToken ?? null,
    assets,
    description: getDescription(record),
    aliases: record.aliases ?? [],
    searchTags: record.searchTags ?? [],
  };

  if (record.kind === "awakener") {
    return {
      ...common,
      realm: record.realm,
      rarity: record.rarity,
      type: record.type,
      faction: record.faction ?? null,
    };
  }
  if (record.kind === "wheel") {
    return {
      ...common,
      realm: record.realm,
      rarity: record.rarity,
      mainstatKey: record.mainstatKey,
      ownerAwakenerName: record.ownerAwakenerName ?? null,
    };
  }
  if (record.kind === "posse") {
    return {
      ...common,
      realm: record.realm,
      acquisitionSource: record.acquisitionSource ?? null,
    };
  }
  return {
    ...common,
    acquisitionSource: record.acquisitionSource ?? null,
  };
}

async function getAuthoritativeRecords(scope, builderCatalog, manifest) {
  const builderIds = new Set(builderCatalog.options?.[scope] ?? []);
  invariant(builderIds.size > 0, `Builder catalog has no ${scope} options`);

  const manifestPrefix = `records/${scope}/`;
  const manifestFiles = Object.keys(manifest.files ?? {}).filter(
    (file) => file.startsWith(manifestPrefix) && file.endsWith(".json"),
  );
  const recordsById = new Map();

  for (const file of manifestFiles) {
    const record = await readJson(path.join(dataRoot, ...file.split("/")));
    validateRecord(record, scope, file);
    invariant(!recordsById.has(record.id), `${scope} contains duplicate record id ${record.id}`);
    recordsById.set(record.id, record);
  }

  for (const id of builderIds) {
    invariant(recordsById.has(id), `Builder catalog references missing ${scope} record ${id}`);
  }

  const selected = [...builderIds].map((id) => recordsById.get(id));
  for (const record of recordsById.values()) {
    if (!builderIds.has(record.id) && !record.lineupToken) {
      selected.push(record);
    }
  }

  return selected;
}

async function copyGeneratedAssets() {
  for (const source of filesToCopy) {
    const relative = path.relative(assetsRoot, source);
    const destination = path.join(generatedAssetsRoot, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }

  const alwaysCopy = [
    ...["aequor", "caro", "chaos", "ultra"].map((realm) =>
      path.join(assetsRoot, "ui", `realm-icon-${realm}.png`),
    ),
    path.join(assetsRoot, "fonts", "droid-serif", "DroidSerif.woff2"),
    path.join(assetsRoot, "fonts", "droid-serif", "DroidSerif-Bold.woff2"),
    path.join(assetsRoot, "icons", "game_icon.jpg"),
  ];
  for (const source of alwaysCopy) {
    await registerAsset(source);
    const relative = path.relative(assetsRoot, source);
    const destination = path.join(generatedAssetsRoot, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

async function main() {
  invariant(
    rootFlagIndex < 0 || process.argv[rootFlagIndex + 1],
    "The --root option requires a project path",
  );
  const manifest = await readJson(path.join(dataRoot, "meta", "manifest.json"));
  const assetsIndex = await readJson(path.join(dataRoot, "meta", "assets.json"));
  const builderCatalog = await readJson(path.join(dataRoot, "meta", "builder-catalog.json"));

  invariant(
    manifest.schemaVersion === 3,
    `Unsupported public data schema ${manifest.schemaVersion}`,
  );
  invariant(assetsIndex.schemaVersion === 3, "Asset index schema does not match public-v3");
  invariant(builderCatalog.schemaVersion === 3, "Builder catalog schema does not match public-v3");

  await rm(generatedSourceRoot, { recursive: true, force: true });
  await rm(generatedAssetsRoot, { recursive: true, force: true });
  await mkdir(generatedSourceRoot, { recursive: true });
  await mkdir(generatedAssetsRoot, { recursive: true });

  const entities = {};
  for (const scope of scopes) {
    const records = await getAuthoritativeRecords(scope, builderCatalog, manifest);
    validateTokens(scope, records);
    entities[scope] = [];
    for (const record of records) {
      const assets = await resolveEntityAssets(record, assetsIndex);
      entities[scope].push(compactRecord(record, assets));
    }
  }

  await copyGeneratedAssets();

  const catalog = {
    schemaVersion: 1,
    source: {
      schemaVersion: manifest.schemaVersion,
      gameDataVersion: manifest.gameDataVersion,
      buildId: manifest.buildId,
      generatedAt: manifest.generatedAt,
    },
    filters: {
      realms: [...new Set(entities.awakeners.map((record) => record.realm))].sort((a, b) =>
        a.localeCompare(b),
      ),
      wheelMainstats: [...new Set(entities.wheels.map((record) => record.mainstatKey))].sort(
        (a, b) => a.localeCompare(b),
      ),
      wheelRarities: [...new Set(entities.wheels.map((record) => record.rarity))].sort((a, b) =>
        a.localeCompare(b),
      ),
      posseRealms: [...new Set(entities.posses.map((record) => record.realm))].sort((a, b) =>
        a.localeCompare(b),
      ),
    },
    entities,
  };

  await writeFile(
    path.join(generatedSourceRoot, "game-data.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8",
  );

  const translations = await compileEntityTranslations(entities);
  await writeFile(
    path.join(generatedSourceRoot, "entity-translations.json"),
    `${JSON.stringify(translations, null, 2)}\n`,
    "utf8",
  );

  const counts = Object.fromEntries(scopes.map((scope) => [scope, entities[scope].length]));
  console.log(
    `Prepared Morimens data ${manifest.gameDataVersion}: ${JSON.stringify(counts)}, ${String(
      filesToCopy.size,
    )} referenced assets.`,
  );
}

main().catch((error) => {
  console.error(
    `Data preparation failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
