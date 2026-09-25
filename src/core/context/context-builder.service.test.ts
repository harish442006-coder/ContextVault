import { test } from "node:test";
import assert from "node:assert/strict";

import { ContextBuilderService } from "./context-builder.service.js";
import type { ScoredMemory } from "../retrieval/retrieval.service.js";

test("builds context with project details and active memory", () => {
  const builder = new ContextBuilderService();

  const memories: ScoredMemory[] = [
    {
      memory: {
        id: "memory-1",
        projectId: "project-1",
        type: "PROJECT",
        title: "Backend Technology",
        content: "Node.js is used for backend development.",
        tags: ["nodejs", "backend"],
        status: "ACTIVE",
        createdAt: "2026-09-21T09:00:00.000Z",
        updatedAt: "2026-09-21T09:00:00.000Z",
      },
      score: 10,
    },
  ];

  const context = builder.buildContext(
    "ContextVault",
    "C:/projects/contextvault",
    memories,
    []
  );

  assert.ok(context.includes("Name: ContextVault"));
  assert.ok(context.includes("Path: C:/projects/contextvault"));

  assert.ok(context.includes("CURRENT CONTEXT"));
  assert.ok(context.includes("[PROJECT]"));
  assert.ok(context.includes("Title: Backend Technology"));
  assert.ok(context.includes("Tags: nodejs, backend"));
  assert.ok(
    context.includes("Node.js is used for backend development.")
  );

  assert.ok(context.includes("</CONTEXTVAULT_CONTEXT>"));
});

test("builds valid context when no memories or activities exist", () => {
  const builder = new ContextBuilderService();

  const context = builder.buildContext(
    "ContextVault",
    "C:/projects/contextvault",
    [],
    []
  );

  assert.ok(context.includes("<CONTEXTVAULT_CONTEXT>"));
  assert.ok(context.includes("Name: ContextVault"));
  assert.ok(context.includes("CURRENT CONTEXT"));
  assert.ok(context.includes("HISTORICAL CONTEXT"));
  assert.ok(context.includes("RELEVANT ACTIVITIES"));
  assert.ok(context.includes("</CONTEXTVAULT_CONTEXT>"));
});

test("places superseded memories in historical context", () => {
  const builder = new ContextBuilderService();

  const memories: ScoredMemory[] = [
    {
      memory: {
        id: "memory-2",
        projectId: "project-1",
        type: "DECISION",
        title: "Old Database Decision",
        content: "The project previously used MongoDB.",
        tags: ["database", "mongodb"],
        status: "SUPERSEDED",
        createdAt: "2026-09-20T09:00:00.000Z",
        updatedAt: "2026-09-20T09:00:00.000Z",
      },
      score: 5,
    },
  ];

  const context = builder.buildContext(
    "ContextVault",
    "C:/projects/contextvault",
    memories,
    []
  );

  const historicalIndex =
    context.indexOf("HISTORICAL CONTEXT");

  const activitiesIndex =
    context.indexOf("RELEVANT ACTIVITIES");

  const memoryIndex =
    context.indexOf("Title: Old Database Decision");

  assert.ok(historicalIndex !== -1);
  assert.ok(memoryIndex > historicalIndex);
  assert.ok(memoryIndex < activitiesIndex);

  assert.ok(context.includes("Status: SUPERSEDED"));
  assert.ok(
    context.includes("The project previously used MongoDB.")
  );
});
test("limits active memories to five", () => {
  const builder = new ContextBuilderService();

  const memories: ScoredMemory[] = Array.from(
    { length: 6 },
    (_, index) => ({
      memory: {
        id: `memory-${index + 1}`,
        projectId: "project-1",
        type: "PROJECT" as const,
        title: `Active Memory ${index + 1}`,
        content: `Content for memory ${index + 1}`,
        tags: ["test"],
        status: "ACTIVE" as const,
        createdAt: "2026-09-21T09:00:00.000Z",
        updatedAt: "2026-09-21T09:00:00.000Z",
      },
      score: 10 - index,
    })
  );

  const context = builder.buildContext(
    "ContextVault",
    "C:/projects/contextvault",
    memories,
    []
  );

  for (let i = 1; i <= 5; i++) {
    assert.ok(context.includes(`Title: Active Memory ${i}`));
  }

  assert.ok(!context.includes("Title: Active Memory 6"));
});

test("keeps context within the maximum character limit", () => {
  const builder = new ContextBuilderService();

  const memories: ScoredMemory[] = [
    {
      memory: {
        id: "memory-large",
        projectId: "project-1",
        type: "PROJECT",
        title: "Large Memory",
        content: "A".repeat(13000),
        tags: ["test"],
        status: "ACTIVE",
        createdAt: "2026-09-21T09:00:00.000Z",
        updatedAt: "2026-09-21T09:00:00.000Z",
      },
      score: 10,
    },
  ];

  const context = builder.buildContext(
    "ContextVault",
    "C:/projects/contextvault",
    memories,
    []
  );

  assert.ok(context.length <= 12000);
  assert.ok(context.includes("</CONTEXTVAULT_CONTEXT>"));
  assert.ok(!context.includes("Title: Large Memory"));
});