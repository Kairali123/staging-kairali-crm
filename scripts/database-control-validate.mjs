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
let workflow = "";
try {
  workflow = await readFile(path.join(root, ".github/workflows/database-control-autopilot.yml"), "utf8");
} catch (error) {
  errors.push(`database-control workflow: ${error.message}`);
}
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
if (policy?.repositoryControlChecks?.requiredWorkflow !== "CARMA-DB repository control") {
  errors.push("CARMA-DB repository-control workflow is not named in policy");
}
if (policy?.repositoryControlChecks?.deploymentPreviewRequired !== false) {
  errors.push("repository-only CARMA-DB approval must not depend on a deployment preview");
}
if (policy?.repositoryControlChecks?.deploymentChecksAffectRepositoryControlApproval !== false) {
  errors.push("deployment status must remain outside repository-only CARMA-DB approval");
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
if (state?.dailyProgress?.localDate && state.dailyProgress.minimumMet !== true) {
  errors.push("started daily wave has not met the minimum database case throughput");
}
if (state?.dailyProgress?.advancedSystemIds) {
  const uniqueAdvanced = new Set(state.dailyProgress.advancedSystemIds);
  const allowedAdvancements = new Set([
    "repository_evidence_packet_ready",
    "live_control_evidence_request_ready",
    "live_control_reconciliation_packet_ready"
  ]);
  if (uniqueAdvanced.size !== state.dailyProgress.advancedSystemIds.length) {
    errors.push("daily progress contains duplicate advanced system IDs");
  }
  if (state.dailyProgress.advancedCount !== uniqueAdvanced.size) {
    errors.push("daily progress advanced count does not match its system IDs");
  }
  for (const systemId of uniqueAdvanced) {
    const system = registry.systems.find(item => item.systemId === systemId);
    if (!system) errors.push(`advanced system is missing from registry: ${systemId}`);
    else if (system.preflightStatus !== "repository_evidence_packet_ready") {
      errors.push(`advanced system lacks a repository evidence packet: ${systemId}`);
    }
    const advancement = state.dailyProgress.advancementsBySystemId?.[systemId];
    if (!advancement) errors.push(`advanced system lacks its auditable stage: ${systemId}`);
    else if (!allowedAdvancements.has(advancement)) errors.push(`advanced system has unsupported stage ${advancement}: ${systemId}`);
    if (advancement === "live_control_evidence_request_ready" && system?.evidenceRequestStatus !== advancement) {
      errors.push(`advanced system lacks its live-control evidence request: ${systemId}`);
    }
    if (advancement === "live_control_reconciliation_packet_ready" && system?.reconciliationPacketStatus !== advancement) {
      errors.push(`advanced system lacks its live-control reconciliation packet: ${systemId}`);
    }
  }
}
for (const system of registry?.systems || []) {
  if (system.reconciliationPacketStatus !== "live_control_reconciliation_packet_ready") continue;
  const packet = system.liveControlReconciliationPacket;
  const controls = packet?.repositoryWriteControls;
  if (system.evidenceRequestStatus !== "live_control_evidence_request_ready") {
    errors.push(`${system.systemId} reconciliation packet was prepared before its evidence request`);
  }
  if (!packet) errors.push(`${system.systemId} reconciliation packet evidence is missing`);
  if (packet?.aggregateAuditEvidence?.mappingStatus !== "aggregate_evidence_unmapped_to_consumer") {
    errors.push(`${system.systemId} reconciliation packet must preserve the unmapped aggregate-audit boundary`);
  }
  if (packet?.productionWriteAllowed !== false) {
    errors.push(`${system.systemId} reconciliation packet must prohibit production writes`);
  }
  if ((controls?.evidenceConfidence || 0) < policy.confidence.automaticRepositoryWriteMinimum) {
    errors.push(`${system.systemId} reconciliation packet lacks automatic-write confidence`);
  }
  if (!controls?.backupReference || !controls?.rollback || !controls?.regressionTest || !controls?.auditEventType) {
    errors.push(`${system.systemId} reconciliation packet lacks backup, rollback, regression or audit controls`);
  }
}
if (!/^permissions:\n\s+contents: write$/m.test(workflow)) {
  errors.push("database-control workflow cannot persist durable repository checkpoints");
}
if (!workflow.includes("carma-db-checkpoint")) {
  errors.push("database-control workflow has no durable checkpoint branch");
}
if (!workflow.includes("Persist append-only CARMA-DB checkpoint")) {
  errors.push("database-control workflow has no checkpoint persistence step");
}
let verificationWorkflow = "";
try {
  verificationWorkflow = await readFile(path.join(root, ".github/workflows/database-control-verify.yml"), "utf8");
} catch (error) {
  errors.push(`database-control verification workflow: ${error.message}`);
}
if (!verificationWorkflow.startsWith("name: CARMA-DB repository control")) {
  errors.push("dedicated CARMA-DB pull-request verification check is missing");
}
if (!verificationWorkflow.includes("contents: read") || !verificationWorkflow.includes("npm run database:control:validate")) {
  errors.push("CARMA-DB pull-request verification is not read-only or does not validate controls");
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
if (state?.dailyProgress?.localDate) {
  console.log(`- ${state.dailyProgress.advancedCount}/${state.dailyProgress.minimumTarget} daily cases advanced`);
}
console.log("- production database writes remain disabled");
