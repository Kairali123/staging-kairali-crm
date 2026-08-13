import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];
const readJson = async relative => {
  try {
    return JSON.parse(await readFile(path.join(root, relative), "utf8"));
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
    return null;
  }
};

const policy = await readJson("database-control/policy.json");
const state = await readJson("database-control/state.json");
const registry = await readJson("database-control/asset-registry.json");
const plan = await readJson("monitoring/database-control-plan.json");
const publicPlan = await readJson("public/database-control-plan.json");
const publicRegistry = await readJson("public/database-control-registry.json");
const allowedCoverageStates = new Set(["discovered", "checked_none", "unverified", "blocked"]);

if (policy?.program !== "CARMA-DB") errors.push("policy program must be CARMA-DB");
if (state?.program !== "CARMA-DB") errors.push("state program must be CARMA-DB");
if (registry?.program !== "CARMA-DB") errors.push("registry program must be CARMA-DB");
if (plan?.program !== "CARMA-DB") errors.push("plan program must be CARMA-DB");
if (publicPlan?.program !== "CARMA-DB") errors.push("public plan program must be CARMA-DB");
if (publicRegistry?.program !== "CARMA-DB") errors.push("public registry program must be CARMA-DB");
if (!policy?.roles?.accountableOwner?.github) errors.push("accountable owner is missing");
if (!policy?.roles?.independentVerifier?.github) errors.push("independent verifier is missing");
if (policy?.automaticRepositoryWriteControls?.productionDatabaseWriteAllowed !== false) {
  errors.push("production database writes must remain disabled");
}
if (policy?.minimumDailyCases < 25) errors.push("minimum daily database cases must be at least 25");
if (policy?.caseLimit !== null) errors.push("Satyam's database case count must not have an upper limit");
if (policy?.humanDecisionLimit !== null) errors.push("Satyam's decision count must not have an upper limit");
if (policy?.ownerMayExpandCaseCount !== true) errors.push("Satyam must be allowed to expand the case count");
if (policy?.ownerMayTakeAdditionalDecisions !== true) errors.push("Satyam must be allowed to take additional decisions");
if (!Array.isArray(registry?.systems) || registry.systems.length === 0) errors.push("registry has no systems");
if (!Array.isArray(registry?.assets) || registry.assets.length === 0) errors.push("registry has no assets");

const systemIds = new Set();
const sourcePaths = new Set();
for (const system of registry?.systems || []) {
  if (!system.systemId || systemIds.has(system.systemId)) errors.push(`duplicate or missing system ID: ${system.systemId}`);
  if (!system.sourcePath || sourcePaths.has(system.sourcePath)) errors.push(`duplicate or missing source path: ${system.sourcePath}`);
  systemIds.add(system.systemId);
  sourcePaths.add(system.sourcePath);
  for (const category of registry.coverageCategories || []) {
    const item = system.coverage?.[category];
    if (!item) errors.push(`${system.systemId} missing coverage category ${category}`);
    else if (!allowedCoverageStates.has(item.state)) errors.push(`${system.systemId} has invalid ${category} state ${item.state}`);
    else if (!item.evidence) errors.push(`${system.systemId} ${category} has no evidence`);
  }
}

const assetIds = new Set();
const canonicalKeys = new Set();
for (const asset of registry?.assets || []) {
  if (!asset.assetId || assetIds.has(asset.assetId)) errors.push(`duplicate or missing asset ID: ${asset.assetId}`);
  if (!asset.canonicalKey || canonicalKeys.has(asset.canonicalKey)) errors.push(`duplicate or missing asset key: ${asset.canonicalKey}`);
  assetIds.add(asset.assetId);
  canonicalKeys.add(asset.canonicalKey);
  if (asset.containsBusinessRows !== false) errors.push(`${asset.assetId} must not contain business rows`);
  if (asset.containsCredentials !== false) errors.push(`${asset.assetId} must not contain credentials`);
}

const serialized = JSON.stringify(registry);
for (const forbidden of [/mysql:\/\//i, /DB_PASSWORD\s*=/i, /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/i]) {
  if (forbidden.test(serialized)) errors.push(`registry contains forbidden sensitive pattern ${forbidden}`);
}

if (plan?.controls?.productionDatabaseWritesAllowed !== false) errors.push("plan must keep production writes disabled");
if (plan?.controls?.minimumDailyCases < 25) errors.push("plan minimum daily cases must be at least 25");
if (plan?.controls?.caseLimit !== null) errors.push("plan must not impose a case limit on Satyam");
if (plan?.controls?.humanDecisionLimit !== null) errors.push("plan must not impose a decision limit on Satyam");
if ((plan?.preflight?.length || 0) < Math.min(registry?.summary?.seenSystems || 0, policy?.minimumDailyCases || 25)) {
  errors.push("plan does not expose the minimum ready-case working set");
}
if (plan?.inventory?.seenSystems !== registry?.summary?.seenSystems) errors.push("plan and registry system counts differ");
if (publicPlan?.inventory?.seenSystems !== registry?.summary?.seenSystems) errors.push("public plan and registry system counts differ");
if (publicRegistry?.summary?.seenSystems !== registry?.summary?.seenSystems) errors.push("public registry and private registry system counts differ");

const publicSerialized = JSON.stringify({ publicPlan, publicRegistry });
for (const forbiddenPublicField of ["sourcePath", "repositoryVisibleObjects", "canonicalKey", "parentSystemIds", "changeHistory"]) {
  if (publicSerialized.includes(`\"${forbiddenPublicField}\"`)) {
    errors.push(`public control artifacts expose forbidden field ${forbiddenPublicField}`);
  }
}
function collectStringValues(value, output = new Set()) {
  if (typeof value === "string") output.add(value);
  else if (Array.isArray(value)) value.forEach(item => collectStringValues(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach(item => collectStringValues(item, output));
  return output;
}
const publicStringValues = collectStringValues({ publicPlan, publicRegistry });
for (const asset of registry?.assets || []) {
  if (asset.type === "repository_visible_database_object" && asset.name && publicStringValues.has(asset.name)) {
    errors.push(`public control artifacts expose database object name for ${asset.assetId}`);
  }
}

if (errors.length) {
  console.error("CARMA-DB VALIDATION: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("CARMA-DB VALIDATION: PASS");
console.log(`- ${registry.summary.seenSystems} repository-visible database systems`);
console.log(`- ${registry.summary.registeredAssets} metadata-only controlled assets`);
console.log("- production database writes remain disabled");
