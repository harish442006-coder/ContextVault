#!/usr/bin/env node
import db from "./database/database.js";
import type { MemoryType } from "./core/memory/memory.model.js";

import { ProjectScannerService } from "./core/scanner/project-scanner.service.js";
import { FileSnapshotRepository } from "./core/scanner/file-snapshot.repository.js";

import { ProjectRepository } from "./core/project/project.repository.js";
import { ProjectService } from "./core/project/project.service.js";

import { MemoryRepository } from "./core/memory/memory.repository.js";
import { MemoryService } from "./core/memory/memory.service.js";

import { RetrievalService } from "./core/retrieval/retrieval.service.js";
import { ContextBuilderService } from "./core/context/context-builder.service.js";
import { ContextVaultService } from "./core/context/context-vault.service.js";

import { ActivityRepository } from "./core/activity/activity.repository.js";
import { ActivityService } from "./core/activity/activity.service.js";
import { GitService } from "./core/git/git.service.js";
import { ActivityRetrievalService } from "./core/retrieval/activity-retrieval.service.js";

import { SyncService } from "./core/sync/sync.service.js";

import { seedDemoData } from "./seed.js";

function showHelp() {
  console.log(`
  ContextVault - Project memory context system

  Usage:
    contextvault init
    contextvault seed
    contextvault sync

    contextvault memory add <TYPE> "<TITLE>" "<CONTENT>" "<TAGS>"
    contextvault memory list
    contextvault memory update <MEMORY_ID>
    contextvault memory archive <MEMORY_ID>

    contextvault activity list
    contextvault activity list --limit <N>
    contextvault activity list --type <TYPE>
    contextvault activity list --type <TYPE> --limit <N>

    contextvault query "<question>"
    contextvault --help

  Activity Types:
    COMMIT
    FILE_CHANGE

  Examples:
    contextvault activity list --limit 5
    contextvault activity list --type COMMIT
    contextvault activity list --type FILE_CHANGE --limit 3
  `);
}


function isValidMemoryType(
  value: string
  ): value is MemoryType {
    return [
      "DECISION",
      "WORKING",
      "HISTORY",
      "PROJECT"
    ].includes(value as MemoryType);
  }

// Repositories
const projectRepository = new ProjectRepository(db);
const memoryRepository = new MemoryRepository(db);
const activityRepository = new ActivityRepository(db);

// Services
const projectService = new ProjectService(projectRepository);
const memoryService = new MemoryService(memoryRepository);

const retrievalService = new RetrievalService(memoryRepository);
const contextBuilder = new ContextBuilderService();

const activityService = new ActivityService(
  activityRepository
);

const activityRetrievalService =
  new ActivityRetrievalService(activityService);

const contextVault = new ContextVaultService(
  retrievalService,
  contextBuilder,
  activityRetrievalService
);

const gitService = new GitService();

const projectScanner = new ProjectScannerService(
    process.env.CONTEXTVAULT_DB_PATH
);

const fileSnapshotRepository =
  new FileSnapshotRepository(db);

const syncService = new SyncService(
  gitService,
  projectScanner,
  fileSnapshotRepository,
  activityService
);

const command = process.argv[2];
const query = process.argv[3];
const subcommand = process.argv[3];
const memoryType = process.argv[4];
const memoryTitle = process.argv[5];
const memoryContent = process.argv[6];
const memoryTags = process.argv[7];


//memory add
if (command === "memory" && subcommand === "add") {
  
  if (!memoryType || !memoryTitle || !memoryContent) {
    console.log(
      'Usage: contextvault memory add <TYPE> "<TITLE>" "<CONTENT>" "<TAGS>"'
    );
    process.exit(1);
  }

  if (!isValidMemoryType(memoryType)) {
    console.log(
      "Invalid memory type. Use: DECISION, WORKING, HISTORY, PROJECT"
    );
    process.exit(1);
  }

  const tags = memoryTags
    ? memoryTags.split(",").map(tag => tag.trim()).filter(Boolean)
    : [];

  const projectPath = process.cwd();

  const project = projectService.getProjectByRootPath(
    projectPath
  );

  if (!project) {
    console.log("No project found. Run: contextvault init");
    process.exit(1);
  }

  const memory = memoryService.createMemory(
    project.id,
    memoryType,
    memoryTitle,
    memoryContent,
    tags
  );

  console.log("Memory created:", memory.title);
  process.exit(0);
}


//memory update
if (command === "memory" && subcommand === "update") {
  const memoryId = process.argv[4];

  if (!memoryId) {
    console.log(
      "Usage: contextvault memory update <MEMORY_ID> [options]"
    );
    process.exit(1);
  }

  let updateTitle: string | undefined;
  let updateContent: string | undefined;
  let updateTags: string[] | undefined;
  let updateType: MemoryType | undefined;

  for (let i = 5; i < process.argv.length; i++) {
    const option = process.argv[i];

    if (option === "--title") {
      updateTitle = process.argv[++i];
    } else if (option === "--content") {
      updateContent = process.argv[++i];
    } else if (option === "--tags") {
      updateTags = process.argv[++i]
        ?.split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
    } else if (option === "--type") {
      const value = process.argv[++i];

      if (!value || !isValidMemoryType(value)) {
        console.log(
          "Invalid memory type. Use: DECISION, WORKING, HISTORY, PROJECT"
        );
        process.exit(1);
      }

      updateType = value;
    } else {
      console.log(`Unknown option: ${option}`);
      process.exit(1);
    }
  }

  if (
    updateTitle === undefined &&
    updateContent === undefined &&
    updateTags === undefined &&
    updateType === undefined
  ) {
    console.log("Please provide at least one field to update.");
    process.exit(1);
  }

  const projectPath = process.cwd();

  const project = projectService.getProjectByRootPath(
    projectPath
  );

  if (!project) {
    console.log("No project found. Run: contextvault init");
    process.exit(1);
  }

  const memory = memoryService.getMemoryById(memoryId);

  if (!memory) {
    console.log("Memory not found.");
    process.exit(1);
  }

  if (memory.projectId !== project.id) {
    console.log("Memory does not belong to this project.");
    process.exit(1);
  }

  const updatedMemory = memoryService.updateMemory(
    memoryId,
    {
      ...(updateTitle !== undefined && { title: updateTitle }),
      ...(updateContent !== undefined && { content: updateContent }),
      ...(updateTags !== undefined && { tags: updateTags }),
      ...(updateType !== undefined && { type: updateType }),
    }
  );

  if (!updatedMemory) {
    console.log("Memory not found.");
    process.exit(1);
  }

  console.log("Memory updated:", updatedMemory.title);

  process.exit(0);
}


//memory list
if (command === "memory" && subcommand === "list") {
    const projectPath = process.cwd();

    const project = projectService.getProjectByRootPath(
      projectPath
    );

    if (!project) {
      console.log("No project found. Run: contextvault init");
      process.exit(1);
    }

    const memories =
      memoryService.getMemoriesByProjectId(project.id);

    console.log(`Memories for: ${project.name}`);
    console.log("");

    if (memories.length === 0) {
      console.log("No memories found.");
      process.exit(0);
    }

    memories.forEach((memory, index) => {
      console.log(`${index + 1}. [${memory.type}] ${memory.title}`);
      console.log(`   ID: ${memory.id}`);
      console.log(`   ${memory.content}`);
      console.log(`   Tags: ${memory.tags.join(", ")}`);
      console.log("");
    });

    process.exit(0);
}


//memory archive
if (command === "memory" && subcommand === "archive") {
  const memoryId = process.argv[4];

  if (!memoryId) {
    console.log(
      "Usage: contextvault memory archive <MEMORY_ID>"
    );
    process.exit(1);
  }

  const projectPath = process.cwd();

  const project = projectService.getProjectByRootPath(
    projectPath
  );

  if (!project) {
    console.log("No project found. Run: contextvault init");
    process.exit(1);
  }

  const memory = memoryService.getMemoryById(memoryId);

  if (!memory) {
    console.log("Memory not found.");
    process.exit(1);
  }

  if (memory.projectId !== project.id) {
    console.log("Memory does not belong to this project.");
    process.exit(1);
  }

  memoryService.updateMemoryStatus(
    memoryId,
    "ARCHIVED"
  );

  console.log(`Memory archived: ${memory.title}`);

  process.exit(0);
}

// activity list
if (command === "activity" && subcommand === "list") {
  const projectPath = process.cwd();

  const project = projectService.getProjectByRootPath(
    projectPath
  );

  if (!project) {
    console.log("No project found. Run: contextvault init");
    process.exit(1);
  }

  const limitIndex = process.argv.indexOf("--limit");

  let limit: number | undefined;

  if (limitIndex !== -1) {
    const limitValue = process.argv[limitIndex + 1];
    const parsedLimit = Number(limitValue);

    if (
      !limitValue ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit <= 0
    ) {
      console.log("Invalid limit. Use a positive integer.");
      process.exit(1);
    }

    limit = parsedLimit;
  }
  const typeIndex = process.argv.indexOf("--type");

  let activityType: string | undefined;

  if (typeIndex !== -1) {
    const typeValue = process.argv[typeIndex + 1];

    if (
      typeValue !== "COMMIT" &&
      typeValue !== "FILE_CHANGE"
    ) {
      console.log(
        "Invalid type. Use COMMIT or FILE_CHANGE."
      );
      process.exit(1);
    }

    activityType = typeValue;
  }

  const activities =
    activityService.getActivitiesByProjectId(project.id);

  console.log(`Activities for: ${project.name}`);
  console.log("");
  const filteredActivities = activityType
    ? activities.filter(
        (activity) => activity.type === activityType
      )
    : activities;

  const displayedActivities =
    limit !== undefined
      ? filteredActivities.slice(0, limit)
      : filteredActivities;

  if (displayedActivities.length === 0) {
    console.log("No activities found.");
    process.exit(0);
  }

  displayedActivities.forEach((activity, index) => {
    console.log(
      `${index + 1}. [${activity.type} | ${activity.source}] ${activity.title}`
    );

    console.log(`   ID: ${activity.id}`);
    console.log(
      `   Date: ${new Date(activity.createdAt).toLocaleString()}`
    );
    console.log("");
  });

  process.exit(0);
}

//sync
if (command === "sync") {
  const projectPath = process.cwd();

  const project = projectService.getProjectByRootPath(
    projectPath
  );

  if (!project) {
    console.log(
      "No project found. Run: contextvault init"
    );
    process.exit(1);
  }

  try {
    const result = syncService.syncProject(
      project.id,
      projectPath
    );

    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error("Sync failed.");

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  }
}

//help
if (command === "--help") {
  showHelp();
  process.exit(0);
}


//init
if (command === "init") {
  const projectPath = process.cwd();
  const projectName = projectPath.split(/[\\/]/).pop() || "Unnamed Project";

  const existingProject =
    projectService.getProjectByRootPath(projectPath);

  if (existingProject) {
    console.log("Project already initialized.");
    process.exit(0);
  }

  const project = projectService.createProject(
    projectName,
    projectPath
  );

  console.log(`Initialized project: ${project.name}`);
  console.log(`Path: ${project.rootPath}`);

  process.exit(0);
}

//seed
if (command === "seed") {
  const projectPath = process.cwd();

  const project = projectService.getProjectByRootPath(
    projectPath
  );

  if (!project) {
    console.log("No project found. Run: contextvault init");
    process.exit(1);
  }

  seedDemoData(
    project,
    memoryService
  );

  console.log("Demo data seeded.");
  process.exit(0);
}

//query
if (command === "query") {

  if (!query || !query.trim()) {
      console.log('Please provide a query.');
      process.exit(1);
  }
    const projectPath = process.cwd();

    const project = projectService.getProjectByRootPath(
      projectPath
    );

  if (!project) {
    console.log("No project found. Run: contextvault seed");
    process.exit(1);
  }

    const context = contextVault.getContext(
      project.id,
      project.name,
      project.rootPath,
      query
   );


// --------------------------------------------------
// 5. Final AI Context
// --------------------------------------------------

  console.log(context);
} else {
    console.log(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
