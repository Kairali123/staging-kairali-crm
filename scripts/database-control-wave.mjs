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
const completedSystemIds = new Set(state.completedSystemIds || []);
const registryBySystemId = new Map(registry.systems.map(system => [system.systemId, system]));
const nextAdvancement = system => {
  if (system.preflightStatus !== "repository_evidence_packet_ready") {
    return "repository_evidence_packet_ready";
  }
  if (system.evidenceRequestStatus !== "live_control_evidence_request_ready") {
    return "live_control_evidence_request_ready";
  }
  if (system.reconciliationPacketStatus !== "live_control_reconciliation_packet_ready") {
    return "live_control_reconciliation_packet_ready";
  }
  return null;
};
const remainingToMinimum = Math.max(0, policy.minimumDailyCases - alreadyAdvanced.size);
const selectionCapacity = remainingToMinimum > 0
  ? remainingToMinimum
  : policy.maxAutomaticWritesPerRun;
const selected = (plan.preflight || [])
  .filter(item => !alreadyAdvanced.has(item.systemId) && !completedSystemIds.has(item.systemId))
  .map(item => ({
    ...item,
    advancement: nextAdvancement(registryBySystemId.get(item.systemId))
  }))
  .filter(item => item.advancement)
  .slice(0, selectionCapacity);
const selectedIds = new Set(selected.map(item => item.systemId));

const systems = registry.systems.map(system => {
  if (!selectedIds.has(system.systemId)) return system;
  const item = selected.find(candidate => candidate.systemId === system.systemId);
  if (item.advancement === "live_control_reconciliation_packet_ready") {
    const event = {
      timestamp: generatedAt,
      type: "live_control_reconciliation_packet_prepared",
      evidence: `Prepared a value-free consumer reconciliation packet for ${system.systemId}; aggregate audit evidence remains unmapped and non-certifying`
    };
    return {
      ...system,
      reconciliationPacketStatus: "live_control_reconciliation_packet_ready",
      lastAdvancedAt: generatedAt,
      lastAdvancedLocalDate: localDate,
      liveControlReconciliationPacket: {
        requestedCoverage: item.missingCoverage,
        repositoryCandidateCount: system.repositoryVisibleObjects.length,
        aggregateAuditEvidence: {
          mappingStatus: "aggregate_evidence_unmapped_to_consumer",
          findingIssueNumbers: state.latestAuditReconciliation?.individualFindingIssues || [],
          positiveForeignKeyChecks: state.latestAuditReconciliation?.positiveForeignKeyChecks || 0,
          positiveForeignKeyOrphans: state.latestAuditReconciliation?.positiveForeignKeyOrphans || 0
        },
        accountableOwner: policy.roles.accountableOwner.github,
        independentVerifier: policy.roles.independentVerifier.github,
        evidenceBoundary: "Value-free control mapping only; no credentials, connection strings, customer data, raw rows, object names or unrestricted SQL",
        productionWriteAllowed: false,
        repositoryWriteControls: {
          evidenceConfidence: 1,
          backupReference: registry.sourceCommit,
          rollback: "Restore the prior registry, state and monitoring artifacts from the Git parent",
          regressionTest: "npm run database:control:validate",
          auditEventType: event.type
        }
      },
      nextAction: "Map approved sanitized live metadata to this consumer; keep all unresolved categories unverified",
      changeHistory: [...(system.changeHistory || []), event]
    };
  }
  if (item.advancement === "live_control_evidence_request_ready") {
    const event = {
      timestamp: generatedAt,
      type: "live_control_evidence_request_prepared",
      evidence: `Prepared a sanitized live-control evidence request for ${system.systemId}; no live evidence or production mutation was performed`
    };
    return {
      ...system,
      evidenceRequestStatus: "live_control_evidence_request_ready",
      lastAdvancedAt: generatedAt,
      lastAdvancedLocalDate: localDate,
      liveControlEvidenceRequest: {
        requestedCoverage: item.missingCoverage,
        accountableOwner: policy.roles.accountableOwner.github,
        independentVerifier: policy.roles.independentVerifier.github,
        evidenceBoundary: "Sanitized control evidence only; no credentials, connection strings, customer data, raw rows or unrestricted SQL",
        productionWriteAllowed: false
      },
      nextAction: item.missingCoverage.length
        ? `Obtain approved sanitized evidence for ${item.missingCoverage[0]}`
        : "Obtain Satyam completeness attestation",
      changeHistory: [...(system.changeHistory || []), event]
    };
  }
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
const advancementsBySystemId = {
  ...(priorProgress.advancementsBySystemId || {}),
  ...Object.fromEntries(selected.map(item => [item.systemId, item.advancement]))
};
const waveRun = {
  generatedAt,
  advancedCount: selected.length,
  advancedSystemIds: selected.map(item => item.systemId),
  note: selected.length
    ? "Repository-only control packets advanced; no live database or production mutation performed"
    : advancedSystemIds.length >= policy.minimumDailyCases
      ? "Daily minimum already met; no duplicate case advancement"
      : "No new repository-only control stage was eligible; completed stages were not counted again"
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
  advancementsBySystemId,
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
  optionalExpansionThisRun: alreadyAdvanced.size >= policy.minimumDailyCases ? selected.length : 0,
  caseLimit: policy.caseLimit,
  productionDatabaseWritesPerformed: false,
  selectionRule: "Exclude completed and already-advanced-today systems; advance only the next incomplete repository-safe control stage",
  remainingUnpreparedRepositoryPackets: systems.filter(
    system => system.preflightStatus !== "repository_evidence_packet_ready" && !completedSystemIds.has(system.systemId)
  ).length,
  remainingLiveControlEvidenceRequests: systems.filter(
    system => system.evidenceRequestStatus !== "live_control_evidence_request_ready" && !completedSystemIds.has(system.systemId)
  ).length,
  remainingLiveControlReconciliationPackets: systems.filter(
    system => system.reconciliationPacketStatus !== "live_control_reconciliation_packet_ready" && !completedSystemIds.has(system.systemId)
  ).length,
  waveRuns: dailyProgress.waveRuns,
  cases: advancedSystemIds.map(systemId => planBySystemId.get(systemId)).filter(Boolean).map(item => ({
    systemId: item.systemId,
    company: item.company,
    priority: item.priority,
    riskScore: item.riskScore,
    writeCapable: item.writeCapable,
    missingCoverage: item.missingCoverage,
    advancement: advancementsBySystemId[item.systemId]
  }))
};

await mkdir(path.join(root, "monitoring"), { recursive: true });
await writeFile(path.join(root, "database-control", "asset-registry.json"), `${JSON.stringify(nextRegistry, null, 2)}\n`);
await writeFile(path.join(root, "database-control", "state.json"), `${JSON.stringify({
  ...state,
  dailyProgress,
  lastWaveRunAt: generatedAt
}, null, 2)}\n`);
await writeFile(path.join(root, "monitoring", "database-control-wave.json"), `${JSON.stringify(waveArtifact, null, 2)}\n`);

console.log(`CARMA-DB wave: advanced ${selected.length} case(s); ${advancedSystemIds.length}/${policy.minimumDailyCases} minimum completed for ${localDate}`);
console.log("- repository evidence only; production database writes performed: 0");
