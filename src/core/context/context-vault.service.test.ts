import { test } from "node:test";
import assert from "node:assert/strict";

import { ContextVaultService } from "./context-vault.service.js";
import { RetrievalService } from "../retrieval/retrieval.service.js";
import { ActivityRetrievalService } from "../retrieval/activity-retrieval.service.js";
import { ContextBuilderService } from "./context-builder.service.js";

test("retrieves memories and activities and returns built context", () => {
  let memorySearchArgs: unknown[] = [];
  let activitySearchArgs: unknown[] = [];
  let buildContextArgs: unknown[] = [];

  const expectedContext = "<CONTEXTVAULT_CONTEXT>Test context</CONTEXTVAULT_CONTEXT>";

  const retrievalService = {
    search: (projectId: string, query: string) => {
      memorySearchArgs = [projectId, query];
      return [];
    },
  } as unknown as RetrievalService;

  const activityRetrievalService = {
    search: (projectId: string, query: string) => {
      activitySearchArgs = [projectId, query];
      return [];
    },
  } as unknown as ActivityRetrievalService;

  const contextBuilder = {
    buildContext: (
      projectName: string,
      projectPath: string,
      memories: unknown[],
      activities: unknown[]
    ) => {
      buildContextArgs = [
        projectName,
        projectPath,
        memories,
        activities,
      ];

      return expectedContext;
    },
  } as unknown as ContextBuilderService;

  const service = new ContextVaultService(
    retrievalService,
    contextBuilder,
    activityRetrievalService
  );

  const result = service.getContext(
    "project-1",
    "ContextVault",
    "C:/projects/contextvault",
    "database"
  );

  assert.deepEqual(memorySearchArgs, ["project-1", "database"]);

  assert.deepEqual(activitySearchArgs, ["project-1", "database"]);

  assert.deepEqual(buildContextArgs, [
    "ContextVault",
    "C:/projects/contextvault",
    [],
    [],
  ]);

  assert.equal(result, expectedContext);
});

test("passes retrieved memories and activities to the context builder", () => {
  const memoryResults = [
    { memory: { id: "memory-1" }, score: 8 },
  ];

  const activityResults = [
    { activity: { id: "activity-1" }, score: 5, matchReasons: ["title match"] },
  ];

  let receivedMemories: unknown[] = [];
  let receivedActivities: unknown[] = [];

  const retrievalService = {
    search: () => memoryResults,
  } as unknown as RetrievalService;

  const activityRetrievalService = {
    search: () => activityResults,
  } as unknown as ActivityRetrievalService;

  const contextBuilder = {
    buildContext: (
      _projectName: string,
      _projectPath: string,
      memories: unknown[],
      activities: unknown[]
    ) => {
      receivedMemories = memories;
      receivedActivities = activities;

      return "built context";
    },
  } as unknown as ContextBuilderService;

  const service = new ContextVaultService(
    retrievalService,
    contextBuilder,
    activityRetrievalService
  );

  const result = service.getContext(
    "project-1",
    "ContextVault",
    "C:/projects/contextvault",
    "database"
  );

  assert.strictEqual(receivedMemories, memoryResults);
  assert.strictEqual(receivedActivities, activityResults);
  assert.equal(result, "built context");
});

test("propagates errors when memory retrieval fails", () => {
  const retrievalService = {
    search: () => {
      throw new Error("Memory retrieval failed");
    },
  } as unknown as RetrievalService;

  const activityRetrievalService = {
    search: () => [],
  } as unknown as ActivityRetrievalService;

  const contextBuilder = {
    buildContext: () => "built context",
  } as unknown as ContextBuilderService;

  const service = new ContextVaultService(
    retrievalService,
    contextBuilder,
    activityRetrievalService
  );

  assert.throws(
    () =>
      service.getContext(
        "project-1",
        "ContextVault",
        "C:/projects/contextvault",
        "database"
      ),
    {
      message: "Memory retrieval failed",
    }
  );
});

test("propagates errors when activity retrieval fails", () => {
  const retrievalService = {
    search: () => [],
  } as unknown as RetrievalService;

  const activityRetrievalService = {
    search: () => {
      throw new Error("Activity retrieval failed");
    },
  } as unknown as ActivityRetrievalService;

  const contextBuilder = {
    buildContext: () => "built context",
  } as unknown as ContextBuilderService;

  const service = new ContextVaultService(
    retrievalService,
    contextBuilder,
    activityRetrievalService
  );

  assert.throws(
    () =>
      service.getContext(
        "project-1",
        "ContextVault",
        "C:/projects/contextvault",
        "database"
      ),
    {
      message: "Activity retrieval failed",
    }
  );
});