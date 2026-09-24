import test from "node:test";
import assert from "node:assert/strict";

import { SyncService } from "./sync.service.js";
import { GitService } from "../git/git.service.js";
import { ProjectScannerService } from "../scanner/project-scanner.service.js";
import { FileSnapshotRepository } from "../scanner/file-snapshot.repository.js";
import { ActivityService } from "../activity/activity.service.js";

import type { FileSnapshot } from "../scanner/project-scanner.service.js";

test("filesystem sync establishes initial baseline without creating activities", () => {
  const snapshots: FileSnapshot[] = [
    {
      path: "notes.txt",
      modifiedAt: "2026-09-20T10:00:00.000Z",
      size: 100,
    },
  ];

  let savedSnapshots: FileSnapshot[] = [];
  let activityCreated = false;

  const gitService = {
    isGitRepository: () => false,
  };

  const scanner = {
    scanProject: () => snapshots,
  };

  const snapshotRepository = {
    getSnapshotsByProjectId: () => [],
    saveSnapshots: (_projectId: string, files: FileSnapshot[]) => {
      savedSnapshots = files;
    },
  };

  const activityService = {
    createActivity: () => {
      activityCreated = true;
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    scanner as unknown as ProjectScannerService,
    snapshotRepository as unknown as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  const result = syncService.syncProject("project-1", "/test/project");

  assert.equal(result, "Initial scan complete. 1 files indexed.");
  assert.equal(savedSnapshots.length, 1);
  assert.equal(activityCreated, false);
});

test("filesystem sync creates activity for a new file", () => {
  const previous: FileSnapshot[] = [];
  const current: FileSnapshot[] = [
    {
      path: "new.txt",
      modifiedAt: "2026-09-20T10:00:00.000Z",
      size: 50,
    },
  ];

  const createdActivities: unknown[][] = [];

  const gitService = {
    isGitRepository: () => false,
  };

  const scanner = {
    scanProject: () => current,
    compareSnapshots: () => [
      {
        type: "NEW",
        path: "new.txt",
        current: current[0],
      },
    ],
  };

  const snapshotRepository = {
    getSnapshotsByProjectId: () => [
      {
        path: "old.txt",
        modifiedAt: "2026-09-19T10:00:00.000Z",
        size: 20,
      },
    ],
    saveSnapshots: () => {},
  };

  const activityService = {
    getActivityByExternalId: () => null,
    createActivity: (...args: unknown[]) => {
      createdActivities.push(args);
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    scanner as unknown as ProjectScannerService,
    snapshotRepository as unknown as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  const result = syncService.syncProject("project-1", "/test/project");

  assert.equal(result, "Filesystem sync complete. 1 new activities.");
  assert.equal(createdActivities.length, 1);
  const firstActivity = createdActivities[0];

    assert.ok(firstActivity, "Expected an activity to be created");

    assert.equal(firstActivity[1], "FILE_CHANGE");
    assert.equal(firstActivity[2], "FILESYSTEM");
    assert.equal(firstActivity[3], "NEW: new.txt");
});

test("filesystem sync skips an existing activity", () => {
  const current: FileSnapshot[] = [
    {
      path: "new.txt",
      modifiedAt: "2026-09-20T10:00:00.000Z",
      size: 50,
    },
  ];

  let createActivityCalls = 0;

  const gitService = {
    isGitRepository: () => false,
  };

  const scanner = {
    scanProject: () => current,
    compareSnapshots: () => [
      {
        type: "NEW",
        path: "new.txt",
        current: current[0],
      },
    ],
  };

  const snapshotRepository = {
    getSnapshotsByProjectId: () => [
      {
        path: "old.txt",
        modifiedAt: "2026-09-19T10:00:00.000Z",
        size: 20,
      },
    ],
    saveSnapshots: () => {},
  };

  const activityService = {
    getActivityByExternalId: () => ({ id: "existing-activity" }),
    createActivity: () => {
      createActivityCalls++;
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    scanner as unknown as ProjectScannerService,
    snapshotRepository as unknown as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  const result = syncService.syncProject("project-1", "/test/project");

  assert.equal(result, "Filesystem sync complete. 0 new activities.");
  assert.equal(createActivityCalls, 0);
});

test("Git sync creates activities for new commits", () => {
  let createActivityCalls = 0;

  const gitService = {
    isGitRepository: () => true,
    getRecentCommits: () => [
      {
        hash: "commit-123",
        message: "Add feature",
        files: ["feature.ts"],
      },
    ],
  };

  const scanner = {};
  const snapshotRepository = {};

  const activityService = {
    getActivityByExternalId: () => null,
    createActivity: () => {
      createActivityCalls++;
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    scanner as unknown as ProjectScannerService,
    snapshotRepository as unknown as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  const result = syncService.syncProject("project-1", "/test/project");

  assert.equal(result, "Synced 1 new Git activities.");
  assert.equal(createActivityCalls, 1);
});

test("Git sync skips an existing commit activity", () => {
  let createActivityCalls = 0;

  const gitService = {
    isGitRepository: () => true,
    getRecentCommits: () => [
      {
        hash: "commit-123",
        message: "Add feature",
        files: ["feature.ts"],
      },
    ],
  };

  const activityService = {
    getActivityByExternalId: () => ({
      id: "existing-activity",
    }),
    createActivity: () => {
      createActivityCalls++;
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    {} as ProjectScannerService,
    {} as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  const result = syncService.syncProject(
    "project-1",
    "/test/project"
  );

  assert.equal(result, "Synced 0 new Git activities.");
  assert.equal(createActivityCalls, 0);
});

test("Git sync skips commits without a hash", () => {
  let createActivityCalls = 0;

  const gitService = {
    isGitRepository: () => true,
    getRecentCommits: () => [
      {
        hash: "",
        message: "Commit without hash",
        files: [],
      },
    ],
  };

  const activityService = {
    getActivityByExternalId: () => null,
    createActivity: () => {
      createActivityCalls++;
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    {} as ProjectScannerService,
    {} as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  const result = syncService.syncProject(
    "project-1",
    "/test/project"
  );

  assert.equal(result, "Synced 0 new Git activities.");
  assert.equal(createActivityCalls, 0);
});

test("filesystem sync propagates scanner errors without saving snapshots", () => {
  let saveSnapshotsCalls = 0;

  const gitService = {
    isGitRepository: () => false,
  };

  const scanner = {
    scanProject: () => {
      throw new Error("Scanner failed");
    },
  };

  const snapshotRepository = {
    getSnapshotsByProjectId: () => [],
    saveSnapshots: () => {
      saveSnapshotsCalls++;
    },
  };

  const activityService = {};

  const syncService = new SyncService(
    gitService as unknown as GitService,
    scanner as unknown as ProjectScannerService,
    snapshotRepository as unknown as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  assert.throws(
    () => syncService.syncProject("project-1", "/test/project"),
    {
      message: "Scanner failed",
    }
  );

  assert.equal(saveSnapshotsCalls, 0);
});

test("Git sync propagates errors when retrieving commits fails", () => {
  let createActivityCalls = 0;

  const gitService = {
    isGitRepository: () => true,
    getRecentCommits: () => {
      throw new Error("Git log failed");
    },
  };

  const activityService = {
    getActivityByExternalId: () => null,
    createActivity: () => {
      createActivityCalls++;
    },
  };

  const syncService = new SyncService(
    gitService as unknown as GitService,
    {} as ProjectScannerService,
    {} as FileSnapshotRepository,
    activityService as unknown as ActivityService
  );

  assert.throws(
    () => syncService.syncProject("project-1", "/test/project"),
    {
      message: "Git log failed",
    }
  );

  assert.equal(createActivityCalls, 0);
});