import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const policy = await readJson("database-control/policy.json");
const state = await readJson("database-control/state.json");
const registry = await readJson("database-control/asset-registry.json");
const generatedAt = new Date().toISOString();
const completeStates = new Set(["discovered", "checked_none"]);

function missingCoverage(system) {
  return registry.coverageCategories.filter(category => !completeStates.has(system.coverage?.[category]?.state));
}

function riskScore(system) {
  let score = system.writeCapable ? 80 : 45;
  score += Math.min(missingCoverage(system).length * 3, 18);
  if (system.backupStatus !== "verified") score += 4;
  if (system.rollbackStatus !== "tested") score += 4;
  return Math.min(score, 100);
}

const seenSystems = registry.systems
  .filter(system => system.lifecycleState === "seen")
  .map(system => ({
    ...system,
    missingCoverage: missingCoverage(system),
    discoveryComplete: missingCoverage(system).length === 0 && system.ownerCompletenessAttested === true,
    riskScore: riskScore(system),
    priority: system.writeCapable ? "P1" : "P2",
    suggestedAction: missingCoverage(system).length
      ? `Complete ${missingCoverage(system)[0]} evidence`
      : "Prepare CARMA-DB gate review"
  }))
  .sort((left, right) => right.riskScore - left.riskScore || left.sourcePath.localeCompare(right.sourcePath));

const discoveryComplete = seenSystems.filter(system => system.discoveryComplete);
const preflight = seenSystems.map(system => ({
  systemId: system.systemId,
  sourcePath: system.sourcePath,
  company: system.company,
  priority: system.priority,
  riskScore: system.riskScore,
  writeCapable: system.writeCapable,
  objects: system.repositoryVisibleObjects,
  missingCoverage: system.missingCoverage,
  suggestedAction: system.suggestedAction
}));
const humanDecisionBatch = seenSystems
  .filter(system => ["ready_for_satyam", "verification_required", "blocked"].includes(system.decisionStatus))
  .map(system => ({
    systemId: system.systemId,
    sourcePath: system.sourcePath,
    company: system.company,
    decisionStatus: system.decisionStatus,
    nextHumanDecision: system.nextAction,
    consequence: "Only the decision-dependent gate pauses; independent AI work continues"
  }));

const companyQueues = Object.fromEntries(policy.companyQueues.map(company => {
  const systems = seenSystems.filter(system => system.company === company);
  return [company, {
    total: systems.length,
    discoveryComplete: systems.filter(system => system.discoveryComplete).length,
    remaining: systems.filter(system => !system.discoveryComplete).length,
    totalRemaining: systems.filter(system => !system.discoveryComplete).length,
    dailyTarget: preflight.filter(system => system.company === company).length,
    top: systems.slice(0, 5).map(system => ({
      systemId: system.systemId,
      sourcePath: system.sourcePath,
      riskScore: system.riskScore
    }))
  }];
}));

const active = preflight[0] || null;
const plan = {
  schemaVersion: 1,
  program: "CARMA-DB",
  generatedAt,
  phase: state.phase || "asset_discovery",
  mode: "repository_autopilot_production_database_writes_disabled",
  inventory: {
    registeredSystems: registry.summary.registeredSystems,
    seenSystems: registry.summary.seenSystems,
    registeredAssets: registry.summary.registeredAssets,
    repositoryVisibleDatabaseObjects: registry.summary.repositoryVisibleDatabaseObjects,
    discoveryCompleteSystems: discoveryComplete.length,
    discoveryRemainingSystems: seenSystems.length - discoveryComplete.length,
    discoveryWave: seenSystems.map(system => ({
      systemId: system.systemId,
      sourcePath: system.sourcePath,
      company: system.company,
      pendingChecks: system.missingCoverage.length,
      missingCoverage: system.missingCoverage
    })),
    repairGate: "Repair promotion is blocked until all eight discovery categories and Satyam's completeness attestation are recorded."
  },
  sprint: {
    expectedFirstPassWorkingDays: policy.sprintWorkingDays,
    workWavesPerDay: policy.workWavesPerDay,
    minimumDailyCases: policy.minimumDailyCases,
    caseLimit: policy.caseLimit,
    ownerMayExpandCaseCount: policy.ownerMayExpandCaseCount
  },
  controls: {
    minimumDailyCases: policy.minimumDailyCases,
    caseLimit: policy.caseLimit,
    humanDecisionLimit: policy.humanDecisionLimit,
    ownerMayExpandCaseCount: policy.ownerMayExpandCaseCount,
    ownerMayTakeAdditionalDecisions: policy.ownerMayTakeAdditionalDecisions,
    automaticRepositoryWriteMinimumConfidence: policy.confidence.automaticRepositoryWriteMinimum,
    productionDatabaseWritesAllowed: policy.automaticRepositoryWriteControls.productionDatabaseWriteAllowed
  },
  ownership: policy.roles,
  companyQueues,
  preflight,
  humanDecisionBatch,
  activeCase: active,
  dailyProgress: state.dailyProgress || {
    localDate: null,
    minimumTarget: policy.minimumDailyCases,
    advancedCount: 0,
    minimumMet: false,
    remainingToMinimum: policy.minimumDailyCases,
    caseLimit: policy.caseLimit,
    ownerMayExpandCaseCount: policy.ownerMayExpandCaseCount,
    advancedSystemIds: []
  },
  communication: policy.communication
};

const publicPath = path.join(root, "public", "database-control-plan.json");
const monitoringPath = path.join(root, "monitoring", "database-control-plan.json");
await mkdir(path.dirname(publicPath), { recursive: true });
await mkdir(path.dirname(monitoringPath), { recursive: true });
const serialized = `${JSON.stringify(plan, null, 2)}\n`;
const publicPlan = {
  ...plan,
  inventory: {
    ...plan.inventory,
    discoveryWave: plan.inventory.discoveryWave.map(({ sourcePath, ...item }) => item)
  },
  ownership: {
    accountableOwner: { github: plan.ownership.accountableOwner.github },
    independentVerifier: { github: plan.ownership.independentVerifier.github },
    sponsor: { github: plan.ownership.sponsor.github },
    automationOwner: { name: plan.ownership.automationOwner.name }
  },
  companyQueues: Object.fromEntries(Object.entries(plan.companyQueues).map(([company, queue]) => [
    company,
    {
      ...queue,
      top: queue.top.map(({ sourcePath, ...item }) => item)
    }
  ])),
  preflight: plan.preflight.map(({ sourcePath, objects, ...item }) => item),
  humanDecisionBatch: plan.humanDecisionBatch.map(({ sourcePath, nextHumanDecision, ...item }) => item),
  activeCase: plan.activeCase
    ? (({ sourcePath, objects, ...item }) => item)(plan.activeCase)
    : null
};
await writeFile(publicPath, `${JSON.stringify(publicPlan, null, 2)}\n`);
await writeFile(monitoringPath, serialized);
await writeFile(path.join(root, "database-control", "state.json"), `${JSON.stringify({
  ...state,
  activeCaseId: active?.systemId || null,
  lastPlanRunAt: generatedAt
}, null, 2)}\n`);
console.log(`CARMA-DB plan: ${preflight.length} preflight cases, ${humanDecisionBatch.length} human decisions, ${discoveryComplete.length}/${seenSystems.length} discovery complete`);
