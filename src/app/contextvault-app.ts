import db from "../database/database.js";

import { ProjectRepository } from "../core/project/project.repository.js";
import { ProjectService } from "../core/project/project.service.js";

import { MemoryRepository } from "../core/memory/memory.repository.js";
import { MemoryService } from "../core/memory/memory.service.js";

import { ActivityRepository } from "../core/activity/activity.repository.js";
import { ActivityService } from "../core/activity/activity.service.js";

import { RetrievalService } from "../core/retrieval/retrieval.service.js";
import { ActivityRetrievalService } from "../core/retrieval/activity-retrieval.service.js";

import { ContextBuilderService } from "../core/context/context-builder.service.js";
import { ContextVaultService } from "../core/context/context-vault.service.js";

import { GitService } from "../core/git/git.service.js";
import { ProjectScannerService } from "../core/scanner/project-scanner.service.js";
import { FileSnapshotRepository } from "../core/scanner/file-snapshot.repository.js";
import { SyncService } from "../core/sync/sync.service.js";

import { ProposalRepository } from "../core/proposal/proposal.repository.js";
import { ProposalService } from "../core/proposal/proposal.service.js";

export function createContextVaultApp() {
  const projectRepository = new ProjectRepository(db);
  const memoryRepository = new MemoryRepository(db);
  const activityRepository = new ActivityRepository(db);
  const proposalRepository =new ProposalRepository(db);

  const projectService =
    new ProjectService(projectRepository);

  const memoryService =
    new MemoryService(memoryRepository);

  const retrievalService =
    new RetrievalService(memoryRepository);

  const contextBuilder =
    new ContextBuilderService();

  const activityService =
    new ActivityService(activityRepository);

  const activityRetrievalService =
    new ActivityRetrievalService(activityService);

  const contextVault =
    new ContextVaultService(
      retrievalService,
      contextBuilder,
      activityRetrievalService
    );

  const gitService =
    new GitService();

  const projectScanner =
    new ProjectScannerService(
      process.env.CONTEXTVAULT_DB_PATH
    );

  const proposalService =
      new ProposalService(
        proposalRepository
      );
    
  const fileSnapshotRepository =
    new FileSnapshotRepository(db);

  const syncService =
    new SyncService(
      gitService,
      projectScanner,
      fileSnapshotRepository,
      activityService
    );


  return {
    projectService,
    memoryService,
    activityService,
    retrievalService,
    activityRetrievalService,
    contextBuilder,
    contextVault,
    gitService,
    projectScanner,
    fileSnapshotRepository,
    syncService,
    proposalService,
  };
}