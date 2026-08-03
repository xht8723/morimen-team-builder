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
const recommendedTeamsFile = path.join(dataRoot, "recommended-teams.json");

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
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
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

function validateString(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  invariant(
    typeof value === "string" && value.trim().length > 0,
    `${label} must be a non-empty string`,
  );
}

function validateStringArray(value, label) {
  invariant(Array.isArray(value), `${label} must be an array`);
  for (const [index, entry] of value.entries()) validateString(entry, `${label}[${String(index)}]`);
  invariant(new Set(value).size === value.length, `${label} contains duplicates`);
}

function validateRecommendationText(value, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  validateLocalizedString(value.en, `${label}.en`);
  validateLocalizedString(value["zh-CN"], `${label}.zh-CN`);
  return { en: value.en, "zh-CN": value["zh-CN"] };
}

function normalizeRecommendationMarkdown(value, label) {
  if (typeof value === "string") {
    const normalized = value.replace(/\r\n?/gu, "\n");
    validateLocalizedString(normalized, label);
    return normalized;
  }

  invariant(Array.isArray(value), `${label} must be a string or an array of lines`);
  invariant(value.length > 0, `${label} line array must not be empty`);
  for (const [index, line] of value.entries()) {
    invariant(typeof line === "string", `${label}[${String(index)}] must be a string`);
    invariant(!/[\r\n]/u.test(line), `${label}[${String(index)}] must be a single line`);
    const hasUnsupportedControlCharacter = [...line].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return (codePoint < 32 && codePoint !== 9) || codePoint === 127;
    });
    invariant(
      !hasUnsupportedControlCharacter,
      `${label}[${String(index)}] contains control characters`,
    );
    invariant(
      line === line.normalize("NFC"),
      `${label}[${String(index)}] must use NFC Unicode normalization`,
    );
  }

  const normalized = value.join("\n");
  invariant(normalized.trim().length > 0, `${label} line array must contain Markdown text`);
  return normalized;
}

function validateRecommendationSummary(value, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return {
    en: normalizeRecommendationMarkdown(value.en, `${label}.en`),
    "zh-CN": normalizeRecommendationMarkdown(value["zh-CN"], `${label}.zh-CN`),
  };
}

async function compileRecommendedTeams() {
  const source = await readJson(recommendedTeamsFile);
  invariant(
    source && typeof source === "object" && !Array.isArray(source),
    "recommended-teams.json is not a JSON object",
  );
  invariant(
    source.schemaVersion === 1,
    `recommended-teams.json has unsupported schema ${String(source.schemaVersion)}`,
  );
  invariant(Array.isArray(source.teams), "recommended-teams.json teams must be an array");

  const seenTeamIds = new Set();
  const compiledTeams = source.teams.map((team, teamIndex) => {
    const label = `recommended-teams.json teams[${String(teamIndex)}]`;
    invariant(
      team && typeof team === "object" && !Array.isArray(team),
      `${label} is not an object`,
    );
    validateLocalizedString(team.id, `${label}.id`);
    invariant(!seenTeamIds.has(team.id), `${label}.id duplicates ${team.id}`);
    seenTeamIds.add(team.id);
    const name = validateRecommendationText(team.name, `${label}.name`);
    const summary = validateRecommendationSummary(team.summary, `${label}.summary`);
    validateString(team.code, `${label}.code`);
    invariant(!/[\r\n]/u.test(team.code), `${label}.code must be a single-line string`);

    return { id: team.id, name, summary, code: team.code.trim() };
  });

  return { schemaVersion: 1, teams: compiledTeams };
}

function validateRecord(record, scope, file) {
  invariant(
    record && typeof record === "object" && !Array.isArray(record),
    `${file} is not a JSON object`,
  );
  invariant(record.schemaVersion === 3, `${file} has unsupported schema ${record.schemaVersion}`);
  invariant(record.kind === expectedKinds[scope], `${file} has unexpected kind ${record.kind}`);
  validateString(record.id, `${file} id`);
  validateString(record.name, `${file} name`);
  if (record.lineupToken != null) {
    validateString(record.lineupToken, `${file} lineupToken`);
  }
  validateStringArray(record.aliases ?? [], `${file} aliases`);
  validateStringArray(record.searchTags ?? [], `${file} searchTags`);
  if (record.kind === "awakener") {
    validateString(record.realm, `${file} awakener realm`);
    validateString(record.rarity, `${file} awakener rarity`);
    validateString(record.type, `${file} awakener type`);
    if (record.faction != null) validateString(record.faction, `${file} awakener faction`);
  }
  if (record.kind === "wheel") {
    validateString(record.realm, `${file} wheel realm`);
    validateString(record.rarity, `${file} wheel rarity`);
    validateString(record.mainstatKey, `${file} wheel mainstatKey`);
    if (record.ownerAwakenerName != null)
      validateString(record.ownerAwakenerName, `${file} wheel ownerAwakenerName`);
  }
  if (record.kind === "posse") {
    validateString(record.realm, `${file} posse realm`);
  }
  if ((record.kind === "covenant" || record.kind === "posse") && record.acquisitionSource != null) {
    validateString(record.acquisitionSource, `${file} acquisitionSource`);
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
    invariant(
      !token.startsWith("a"),
      `${scope} token ${token} conflicts with reserved empty token "a"`,
    );
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

function compactRecord(record, assets, selectable) {
  const common = {
    id: record.id,
    kind: record.kind,
    name: record.name,
    lineupToken: record.lineupToken ?? null,
    assets,
    description: getDescription(record),
    aliases: record.aliases ?? [],
    searchTags: record.searchTags ?? [],
    selectable,
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
    const manifestEntry = manifest.files[file];
    invariant(
      manifestEntry && typeof manifestEntry === "object",
      `${file} has no manifest metadata`,
    );
    invariant(
      Number.isSafeInteger(manifestEntry.bytes) && manifestEntry.bytes >= 0,
      `${file} has invalid manifest byte count`,
    );
    invariant(
      typeof manifestEntry.sha256 === "string" && /^[a-f0-9]{64}$/.test(manifestEntry.sha256),
      `${file} has invalid manifest SHA-256`,
    );
    const recordFile = path.join(dataRoot, ...file.split("/"));
    const bytes = await readFile(recordFile);
    invariant(
      bytes.byteLength === manifestEntry.bytes,
      `${file} byte count does not match manifest`,
    );
    const digest = createHash("sha256").update(bytes).digest("hex");
    invariant(digest === manifestEntry.sha256, `${file} SHA-256 does not match manifest`);
    const record = JSON.parse(bytes.toString("utf8"));
    validateRecord(record, scope, file);
    invariant(!recordsById.has(record.id), `${scope} contains duplicate record id ${record.id}`);
    recordsById.set(record.id, record);
  }

  for (const id of builderIds) {
    invariant(recordsById.has(id), `Builder catalog references missing ${scope} record ${id}`);
  }

  const selected = [...builderIds].map((id) => ({ record: recordsById.get(id), selectable: true }));
  for (const record of recordsById.values()) {
    if (!builderIds.has(record.id) && !record.lineupToken) {
      selected.push({ record, selectable: false });
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
  validateString(manifest.gameDataVersion, "Manifest gameDataVersion");
  validateString(manifest.buildId, "Manifest buildId");
  validateString(manifest.generatedAt, "Manifest generatedAt");
  invariant(!Number.isNaN(Date.parse(manifest.generatedAt)), "Manifest generatedAt is not a date");
  invariant(
    manifest.files && typeof manifest.files === "object" && !Array.isArray(manifest.files),
    "Manifest files must be an object",
  );
  invariant(
    assetsIndex.entities &&
      typeof assetsIndex.entities === "object" &&
      !Array.isArray(assetsIndex.entities),
    "Asset index entities must be an object",
  );
  invariant(
    assetsIndex.assets &&
      typeof assetsIndex.assets === "object" &&
      !Array.isArray(assetsIndex.assets),
    "Asset index assets must be an object",
  );
  invariant(
    builderCatalog.options &&
      typeof builderCatalog.options === "object" &&
      !Array.isArray(builderCatalog.options),
    "Builder catalog options must be an object",
  );
  for (const scope of scopes) {
    const options = builderCatalog.options[scope];
    validateStringArray(options, `Builder catalog ${scope}`);
    invariant(options.length > 0, `Builder catalog has no ${scope} options`);
  }

  await rm(generatedSourceRoot, { recursive: true, force: true });
  await rm(generatedAssetsRoot, { recursive: true, force: true });
  await mkdir(generatedSourceRoot, { recursive: true });
  await mkdir(generatedAssetsRoot, { recursive: true });

  const entities = {};
  for (const scope of scopes) {
    const selectedRecords = await getAuthoritativeRecords(scope, builderCatalog, manifest);
    validateTokens(
      scope,
      selectedRecords.map(({ record }) => record),
    );
    entities[scope] = [];
    for (const { record, selectable } of selectedRecords) {
      const assets = await resolveEntityAssets(record, assetsIndex);
      const compacted = compactRecord(record, assets, selectable);
      invariant(
        typeof compacted.description === "string",
        `${scope}/${record.id} emitted description is not a string`,
      );
      entities[scope].push(compacted);
    }
  }

  await copyGeneratedAssets();

  const catalog = {
    schemaVersion: 2,
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

  const translations = await compileEntityTranslations(entities);
  const recommendedTeams = await compileRecommendedTeams();

  await writeFile(
    path.join(generatedSourceRoot, "game-data.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    path.join(generatedSourceRoot, "entity-translations.json"),
    `${JSON.stringify(translations, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    path.join(generatedSourceRoot, "recommended-teams.json"),
    `${JSON.stringify(recommendedTeams, null, 2)}\n`,
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
