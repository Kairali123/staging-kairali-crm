import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "database-control", "asset-registry.json");
const statePath = path.join(root, "database-control", "state.json");
const publicPath = path.join(root, "public", "database-control-registry.json");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "public",
  "monitoring"
]);
const coverageCategories = [
  "consumer",
  "table_or_view",
  "schema_keys_relationships",
  "indexes_constraints",
  "credential_runtime_configuration",
  "migration_change_history",
  "backup_restore",
  "monitoring_alerting_owner_runbook"
];

function stableId(prefix, value) {
  return `${prefix}-${createHash("sha1").update(value).digest("hex").slice(0, 8).toUpperCase()}`;
}

function posix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

async function walk(directory, output = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, output);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      output.push(absolute);
    }
  }
  return output;
}

function databaseConsumer(content, relativePath) {
  return relativePath === "lib/db.ts" ||
    /(?:@\/lib\/db|from\s+["'][^"']*lib\/db["']|mysql2\/promise)/.test(content) ||
    /\b(?:getPool|executeWithRetry)\s*\(/.test(content);
}

function extractMethods(content) {
  return [...new Set(
    [...content.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)]
      .map(match => match[1])
  )].sort();
}

function extractTables(content) {
  const names = new Set();
  const pattern = /\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM|TABLE)\s+([`A-Za-z0-9_.$-]+)/gi;
  for (const match of content.matchAll(pattern)) {
    const cleaned = match[1]
      .replaceAll("`", "")
      .replace(/^\$\{/, "")
      .replace(/\}$/, "")
      .split(".")
      .at(-1);
    if (!cleaned || cleaned.length < 2) continue;
    if (/^(SELECT|SET|VALUES|WHERE|JSON|DATE|AS)$/i.test(cleaned)) continue;
    if (!/^[A-Za-z0-9_$-]+$/.test(cleaned)) continue;
    names.add(cleaned);
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

function operationClasses(content) {
  const operations = [];
  const rules = [
    ["select", /\bSELECT\b/i],
    ["insert", /\bINSERT\s+INTO\b/i],
    ["update", /\bUPDATE\s+(?:`|[A-Za-z_])/i],
    ["delete", /\bDELETE\s+FROM\b/i],
    ["schema", /\b(?:ALTER|CREATE|DROP|TRUNCATE)\s+(?:TABLE|VIEW|INDEX|DATABASE)\b/i],
    ["transaction", /\b(?:START\s+TRANSACTION|BEGIN|COMMIT|ROLLBACK)\b/i]
  ];
  for (const [name, pattern] of rules) if (pattern.test(content)) operations.push(name);
  return operations;
}

function companyFor(relativePath, tables) {
  const evidence = `${relativePath} ${tables.join(" ")}`.toLowerCase();
  if (/(?:ktahv|villa|reservation|pms|guest_tracker)/.test(evidence)) return "KTAHV";
  if (/\bkappl\b/.test(evidence)) return "KAPPL";
  return "Cross-company";
}

function businessArea(relativePath) {
  const parts = relativePath.split("/");
  if (parts[0] === "app" && parts[1] === "api") return parts[2] || "api-root";
  return parts[0] === "lib" ? "shared-database-runtime" : parts[0];
}

function coverage(relativePath, tables, migrationEvidence) {
  return {
    consumer: {
      state: "discovered",
      evidence: `Repository source scan: ${relativePath}`
    },
    table_or_view: tables.length ? {
      state: "discovered",
      evidence: `Static SQL reference scan found ${tables.length} candidate object(s)`
    } : {
      state: "unverified",
      evidence: "No static object name extracted; dynamic query or runtime metadata review required"
    },
    schema_keys_relationships: {
      state: "unverified",
      evidence: "Requires approved metadata-only live schema reconciliation"
    },
    indexes_constraints: {
      state: "unverified",
      evidence: "Requires approved metadata-only index and constraint reconciliation"
    },
    credential_runtime_configuration: {
      state: "discovered",
      evidence: "Consumer resolves the shared environment-driven lib/db.ts runtime"
    },
    migration_change_history: migrationEvidence,
    backup_restore: {
      state: "unverified",
      evidence: "Provider backup, retention and isolated restore evidence is tracked in GitHub #5"
    },
    monitoring_alerting_owner_runbook: {
      state: "unverified",
      evidence: "Monitoring, alert ownership and operational runbook evidence is tracked in GitHub #8"
    }
  };
}

async function readPreviousRegistry() {
  try {
    return JSON.parse(await readFile(registryPath, "utf8"));
  } catch {
    return { systems: [], assets: [] };
  }
}

function sourceCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const generatedAt = new Date().toISOString();
const previous = await readPreviousRegistry();
const previousSystems = new Map((previous.systems || []).map(system => [system.sourcePath, system]));
const previousAssets = new Map((previous.assets || []).map(asset => [asset.canonicalKey, asset]));
const sourceFiles = (await walk(root)).sort();
const migrationFiles = sourceFiles
  .map(file => posix(path.relative(root, file)))
  .filter(file => /(?:^|\/)(?:migrations?|prisma|drizzle)(?:\/|$)/i.test(file));
const migrationEvidence = migrationFiles.length ? {
  state: "discovered",
  evidence: `Repository scan found ${migrationFiles.length} migration-related source file(s)`
} : {
  state: "checked_none",
  evidence: "Full tracked-source scan found no migration directory or migration source file"
};

const systems = [];
const assetsByKey = new Map();

for (const absolute of sourceFiles) {
  const relativePath = posix(path.relative(root, absolute));
  if (relativePath.startsWith("scripts/database-control-")) continue;
  const content = await readFile(absolute, "utf8");
  if (!databaseConsumer(content, relativePath)) continue;

  const tables = extractTables(content);
  const methods = extractMethods(content);
  const operations = operationClasses(content);
  const writeCapable = operations.some(operation => ["insert", "update", "delete", "schema"].includes(operation));
  const prior = previousSystems.get(relativePath);
  const systemId = prior?.systemId || stableId("DBS", relativePath);
  const consumerAssetKey = `consumer:${relativePath}`;
  const consumerAssetId = previousAssets.get(consumerAssetKey)?.assetId || stableId("DBA", consumerAssetKey);
  const assetIds = [consumerAssetId];

  assetsByKey.set(consumerAssetKey, {
    ...(previousAssets.get(consumerAssetKey) || {}),
    assetId: consumerAssetId,
    canonicalKey: consumerAssetKey,
    type: relativePath === "lib/db.ts" ? "shared_database_runtime" : "database_consumer",
    name: relativePath,
    sourcePath: relativePath,
    lifecycleState: "seen",
    lastSeenAt: generatedAt,
    containsBusinessRows: false,
    containsCredentials: false
  });

  for (const table of tables) {
    const tableKey = `database-object:${table.toLowerCase()}`;
    const priorAsset = previousAssets.get(tableKey);
    const tableAssetId = priorAsset?.assetId || stableId("DBA", tableKey);
    assetIds.push(tableAssetId);
    const existing = assetsByKey.get(tableKey);
    const parentSystemIds = new Set([...(existing?.parentSystemIds || priorAsset?.parentSystemIds || []), systemId]);
    assetsByKey.set(tableKey, {
      ...(priorAsset || {}),
      assetId: tableAssetId,
      canonicalKey: tableKey,
      type: "repository_visible_database_object",
      name: table,
      parentSystemIds: [...parentSystemIds].sort(),
      lifecycleState: "seen",
      lastSeenAt: generatedAt,
      containsBusinessRows: false,
      containsCredentials: false
    });
  }

  const scanEvent = {
    timestamp: generatedAt,
    type: "repository_inventory_scan",
    evidence: `Scanned ${relativePath} at ${sourceCommit()}`
  };
  const priorHistory = prior?.changeHistory || [];
  const changeHistory = priorHistory.at(-1)?.evidence === scanEvent.evidence
    ? priorHistory
    : [...priorHistory, scanEvent];

  systems.push({
    ...(prior || {}),
    systemId,
    sourcePath: relativePath,
    name: relativePath,
    company: companyFor(relativePath, tables),
    businessArea: businessArea(relativePath),
    methods,
    operationClasses: operations,
    writeCapable,
    riskClass: writeCapable ? "high" : "medium",
    lifecycleState: "seen",
    lastSeenAt: generatedAt,
    assetIds: [...new Set(assetIds)].sort(),
    repositoryVisibleObjects: tables,
    coverage: coverage(relativePath, tables, migrationEvidence),
    ownerCompletenessAttested: prior?.ownerCompletenessAttested === true,
    decisionStatus: prior?.decisionStatus || "ai_discovery_required",
    assignedTo: prior?.assignedTo || "CARMA-DB AI",
    nextAction: prior?.nextAction || "Complete automated evidence packet before asking Satyam",
    backupStatus: prior?.backupStatus || "unverified",
    rollbackStatus: prior?.rollbackStatus || "unverified",
    regressionStatus: prior?.regressionStatus || "not_run",
    independentReviewStatus: prior?.independentReviewStatus || "not_requested",
    changeHistory
  });
}

const currentPaths = new Set(systems.map(system => system.sourcePath));
for (const prior of previous.systems || []) {
  if (currentPaths.has(prior.sourcePath)) continue;
  systems.push({
    ...prior,
    lifecycleState: "not_seen_in_latest_scan",
    lastScanAt: generatedAt,
    nextAction: "Reconcile removal or relocation; never silently delete inventory history"
  });
}

for (const [key, prior] of previousAssets) {
  if (assetsByKey.has(key)) continue;
  assetsByKey.set(key, {
    ...prior,
    lifecycleState: "not_seen_in_latest_scan",
    lastScanAt: generatedAt
  });
}

systems.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
const assets = [...assetsByKey.values()].sort((left, right) => left.assetId.localeCompare(right.assetId));
const registry = {
  schemaVersion: 1,
  program: "CARMA-DB",
  generatedAt,
  sourceCommit: sourceCommit(),
  evidenceBoundary: "Repository-visible metadata only. No live rows, credentials, connection strings or unrestricted SQL are stored.",
  coverageCategories,
  summary: {
    registeredSystems: systems.length,
    seenSystems: systems.filter(system => system.lifecycleState === "seen").length,
    writeCapableSystems: systems.filter(system => system.lifecycleState === "seen" && system.writeCapable).length,
    registeredAssets: assets.length,
    repositoryVisibleDatabaseObjects: assets.filter(asset => asset.type === "repository_visible_database_object").length,
    migrationFilesFound: migrationFiles.length
  },
  systems,
  assets
};

await mkdir(path.dirname(registryPath), { recursive: true });
await mkdir(path.dirname(publicPath), { recursive: true });
const serialized = `${JSON.stringify(registry, null, 2)}\n`;
const publicRegistry = {
  schemaVersion: registry.schemaVersion,
  program: registry.program,
  generatedAt: registry.generatedAt,
  evidenceBoundary: "Sanitized aggregate control metadata only. Source paths, database object names, credentials, rows and evidence text are excluded.",
  coverageCategories: registry.coverageCategories,
  summary: registry.summary,
  systems: registry.systems.map(system => ({
    systemId: system.systemId,
    company: system.company,
    writeCapable: system.writeCapable,
    riskClass: system.riskClass,
    lifecycleState: system.lifecycleState,
    coverage: Object.fromEntries(registry.coverageCategories.map(category => [
      category,
      system.coverage?.[category]?.state || "unverified"
    ])),
    ownerCompletenessAttested: system.ownerCompletenessAttested,
    decisionStatus: system.decisionStatus,
    backupStatus: system.backupStatus,
    rollbackStatus: system.rollbackStatus,
    regressionStatus: system.regressionStatus,
    independentReviewStatus: system.independentReviewStatus
  })),
  assetTypeCounts: Object.fromEntries([...new Set(registry.assets.map(asset => asset.type))]
    .sort()
    .map(type => [type, registry.assets.filter(asset => asset.type === type).length]))
};
await writeFile(registryPath, serialized);
await writeFile(publicPath, `${JSON.stringify(publicRegistry, null, 2)}\n`);
const state = JSON.parse(await readFile(statePath, "utf8"));
await writeFile(statePath, `${JSON.stringify({
  ...state,
  lastInventoryRunAt: generatedAt
}, null, 2)}\n`);
console.log(`CARMA-DB inventory: ${registry.summary.seenSystems} systems, ${registry.summary.registeredAssets} assets, ${registry.summary.writeCapableSystems} write-capable systems`);
