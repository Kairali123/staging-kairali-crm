import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const policy = await readJson("database-control/policy.json");
const state = await readJson("database-control/state.json");
const registry = await readJson("database-control/asset-registry.json");
const plan = await readJson("monitoring/database-control-plan.json");
const generatedAt = new Date().toISOString();
const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const priorProgress = state.dailyProgress?.localDate === localDate
  ? state.dailyProgress
  : { localDate, minimumTarget: policy.minimumDailyCases, advancedSystemIds: [], waveRuns: [] };
const alreadyAdvanced = new Set(priorProgress.advancedSystemIds || []);
const remainingToMinimum = Math.max(0, policy.minimumDailyCases - alreadyAdvanced.size);
const selected = (plan.preflight || [])
  .filter(item => !alreadyAdvanced.has(item.systemId))
  .slice(0, remainingToMinimum);
const selectedIds = new Set(selected.map(item => item.systemId));

const systems = registry.systems.map(system => {
  if (!selectedIds.has(system.systemId)) return system;
  const item = selected.find(candidate => candidate.systemId === system.systemId);
  const event = {
    timestamp: generatedAt,
    type: "repository_preflight_advanced",
    evidence: `Prepared a sanitized repository evidence packet for ${system.systemId}; live control categories remain explicitly unverified`
  };
  return {
    ...system,
    preflightStatus: "repository_evidence_packet_ready",
    lastAdvancedAt: generatedAt,
    lastAdvancedLocalDate: localDate,
    preflightEvidence: {
      sourceCommit: registry.sourceCommit,
      sourcePath: system.sourcePath,
      methods: system.methods,
      operationClasses: system.operationClasses,
      writeCapable: system.writeCapable,
      repositoryVisibleObjects: system.repositoryVisibleObjects,
      missingCoverage: item.missingCoverage,
      evidenceBoundary: "Repository metadata only; no rows, credentials, connection strings or unrestricted SQL"
    },
    nextAction: item.missingCoverage.length
      ? `Collect approved evidence for ${item.missingCoverage[0]}`
      : "Prepare Satyam completeness attestation",
    changeHistory: [...(system.changeHistory || []), event]
  };
});

const advancedSystemIds = [...new Set([
  ...(priorProgress.advancedSystemIds || []),
  ...selected.map(item => item.systemId)
])];
const waveRun = {
  generatedAt,
  advancedCount: selected.length,
  advancedSystemIds: selected.map(item => item.systemId),
  note: selected.length
    ? "Repository evidence packets prepared; no live database or production mutation performed"
    : "Daily minimum already met; no duplicate case advancement"
};
const dailyProgress = {
  localDate,
  minimumTarget: policy.minimumDailyCases,
  advancedCount: advancedSystemIds.length,
  minimumMet: advancedSystemIds.length >= policy.minimumDailyCases,
  remainingToMinimum: Math.max(0, policy.minimumDailyCases - advancedSystemIds.length),
  caseLimit: policy.caseLimit,
  ownerMayExpandCaseCount: policy.ownerMayExpandCaseCount,
  advancedSystemIds,
  waveRuns: [...(priorProgress.waveRuns || []), waveRun]
};
const planBySystemId = new Map((plan.preflight || []).map(item => [item.systemId, item]));
const nextRegistry = {
  ...registry,
  generatedAt,
  systems
};
const waveArtifact = {
  schemaVersion: 1,
  program: "CARMA-DB",
  generatedAt,
  localDate,
  minimumTarget: policy.minimumDailyCases,
  advancedThisRun: selected.length,
  advancedToday: advancedSystemIds.length,
  minimumMet: dailyProgress.minimumMet,
  caseLimit: policy.caseLimit,
  productionDatabaseWritesPerformed: false,
  waveRuns: dailyProgress.waveRuns,
  cases: advancedSystemIds.map(systemId => planBySystemId.get(systemId)).filter(Boolean).map(item => ({
    systemId: item.systemId,
    company: item.company,
    priority: item.priority,
    riskScore: item.riskScore,
    writeCapable: item.writeCapable,
    missingCoverage: item.missingCoverage,
    advancement: "repository_evidence_packet_ready"
  }))
};

await mkdir(path.join(root, "monitoring"), { recursive: true });
await writeFile(path.join(root, "database-control", "asset-registry.json"), `${JSON.stringify(nextRegistry, null, 2)}\n`);
await writeFile(path.join(root, "database-control", "state.json"), `${JSON.stringify({
  ...state,
  dailyProgress,
  lastInventoryRunAt: registry.generatedAt,
  lastWaveRunAt: generatedAt
}, null, 2)}\n`);
await writeFile(path.join(root, "monitoring", "database-control-wave.json"), `${JSON.stringify(waveArtifact, null, 2)}\n`);

console.log(`CARMA-DB wave: advanced ${selected.length} case(s); ${advancedSystemIds.length}/${policy.minimumDailyCases} minimum completed for ${localDate}`);
console.log("- repository evidence only; production database writes performed: 0");
