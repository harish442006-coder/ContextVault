import { test } from "node:test";
import assert from "node:assert/strict";

import { ContextVaultService } from "./context-vault.service.js";
import type { ScoredMemory } from "../retrieval/retrieval.service.js";
import type { ScoredActivity } from "../retrieval/activity-retrieval.service.js";

test("returns context using the external context contract", () => {
  const memory: ScoredMemory = {
    memory: {
      id: "memory-1",
      projectId: "project-1",
      type: "DECISION",
      title: "Authentication Strategy",
      content:
        "Authentication uses JWT tokens with refresh tokens.",
      tags: ["authentication", "jwt"],
      status: "ACTIVE",
      createdAt: "2026-09-25T10:00:00.000Z",
      updatedAt: "2026-09-25T10:00:00.000Z",
    },
    score: 10,
  };

  const activity: ScoredActivity = {
    activity: {
        id: "activity-1",
        projectId: "project-1",
        type: "FILE_CHANGE",
        source: "FILESYSTEM",
        title: "Modified auth service",
        metadata: {
            path: "src/auth/service.ts",
            changeType: "MODIFIED",
        },
        createdAt: "2026-09-25T11:00:00.000Z",
        },
    score: 5,
    matchReasons: ["title match"],
  };

  const retrievalService = {
    search: () => [memory],
  } as any;

  const activityRetrievalService = {
    search: () => [activity],
  } as any;

  const contextBuilder = {
    buildContext: () => "",
  } as any;

  const service = new ContextVaultService(
    retrievalService,
    contextBuilder,
    activityRetrievalService
  );

  const response = service.getContextResponse(
    {
      projectId: "project-1",
      query: "authentication",
      accessLevel: "READ",
      maxItems: 5,
    },
    "ContextVault",
    "C:/projects/contextvault"
  );

  assert.equal(
    response.project.id,
    "project-1"
  );

  assert.equal(
    response.project.name,
    "ContextVault"
  );

  assert.equal(
    response.query,
    "authentication"
  );

  assert.equal(response.items.length, 2);

  assert.equal(
    response.items[0]?.title,
    "Authentication Strategy"
  );

  assert.equal(
    response.items[0]?.status,
    "CURRENT"
  );

  assert.equal(
    response.items[0]?.provenance.source,
    "MEMORY"
  );

  assert.equal(
    response.items[1]?.provenance.source,
    "FILESYSTEM"
  );

  assert.equal(
    response.items[1]?.content,
    JSON.stringify({
        path: "src/auth/service.ts",
        changeType: "MODIFIED",
    })
    );

  assert.ok(response.generatedAt);
});