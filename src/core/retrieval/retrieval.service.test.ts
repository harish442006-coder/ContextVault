import { test } from "node:test";
import assert from "node:assert/strict";

import { RetrievalService } from "./retrieval.service.js";
import type { Memory } from "../memory/memory.model.js";
import type { MemoryRepository } from "../memory/memory.repository.js";

function createMemory(
  overrides: Partial<Memory> = {}
): Memory {
  return {
    id: "memory-1",
    projectId: "project-1",
    type: "PROJECT",
    title: "Backend Technology",
    content: "Node.js is used for backend development.",
    tags: ["nodejs", "backend"],
    status: "ACTIVE",
    createdAt: "2026-09-21T09:00:00.000Z",
    updatedAt: "2026-09-21T09:00:00.000Z",
    ...overrides,
  };
}

function createRetrievalService(
  memories: Memory[]
): RetrievalService {
  const mockRepository = {
    getMemoriesByProjectId: () => memories,
  } as unknown as MemoryRepository;

  return new RetrievalService(mockRepository);
}

test("returns memory when query matches its title", () => {
  const memory = createMemory({
    title: "Authentication Strategy",
    content: "JWT tokens are used.",
    tags: ["security"],
  });

  const service = createRetrievalService([memory]);

  const results = service.search(
    "project-1",
    "authentication"
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.memory.id, "memory-1");
  assert.ok((results[0]?.score ?? 0) > 0);
});

test("returns memory when query matches its tags", () => {
  const memory = createMemory({
    title: "Backend Setup",
    content: "The server handles requests.",
    tags: ["mongodb"],
  });

  const service = createRetrievalService([memory]);

  const results = service.search("project-1", "mongodb");

  assert.equal(results.length, 1);
  assert.equal(results[0]?.memory.id, "memory-1");
});

test("excludes archived memories from search results", () => {
  const archivedMemory = createMemory({
    status: "ARCHIVED",
    title: "Authentication Strategy",
  });

  const service = createRetrievalService([archivedMemory]);

  const results = service.search(
    "project-1",
    "authentication"
  );

  assert.deepEqual(results, []);
});

test("returns empty array when query has no matching keywords", () => {
  const memory = createMemory();

  const service = createRetrievalService([memory]);

  const results = service.search(
    "project-1",
    "database"
  );

  assert.deepEqual(results, []);
});

test("returns empty array when query contains only stop words", () => {
  const service = createRetrievalService([createMemory()]);

  const results = service.search(
    "project-1",
    "what is the"
  );

  assert.deepEqual(results, []);
});

test("ranks title match higher than content match", () => {
  const titleMatch = createMemory({
    id: "memory-title",
    title: "Authentication",
    content: "Security implementation details",
    tags: [],
  });

  const contentMatch = createMemory({
    id: "memory-content",
    title: "Security Setup",
    content: "Authentication is implemented here",
    tags: [],
  });

  const service = createRetrievalService([
    titleMatch,
    contentMatch,
  ]);

  const results = service.search(
    "project-1",
    "authentication"
  );

  assert.equal(results.length, 2);
  assert.equal(results[0]?.memory.id, "memory-title");

  assert.ok(
    (results[0]?.score ?? 0) >
      (results[1]?.score ?? 0)
  );
});

test("gives active memories a score bonus", () => {
  const activeMemory = createMemory({
    id: "active-memory",
    status: "ACTIVE",
  });

  const supersededMemory = createMemory({
    id: "superseded-memory",
    status: "SUPERSEDED",
  });

  const service = createRetrievalService([
    activeMemory,
    supersededMemory,
  ]);

  const results = service.search(
    "project-1",
    "backend"
  );

  const activeResult = results.find(
    (item) => item.memory.id === "active-memory"
  );

  const supersededResult = results.find(
    (item) => item.memory.id === "superseded-memory"
  );

  assert.ok(activeResult);
  assert.ok(supersededResult);

  assert.equal(
    activeResult.score - supersededResult.score,
    1
  );
});

test("removes memories below the relevance cutoff", () => {
  const strongMatch = createMemory({
    id: "strong-match",
    title: "Authentication Authentication",
    content: "Authentication",
    tags: ["authentication"],
  });

  const weakMatch = createMemory({
    id: "weak-match",
    title: "General Notes",
    content: "Authentication",
    tags: [],
  });

  const service = createRetrievalService([
    strongMatch,
    weakMatch,
  ]);

  const results = service.search(
    "project-1",
    "authentication"
  );

  assert.ok(
    results.some((item) => item.memory.id === "strong-match")
  );

  assert.ok(
    !results.some((item) => item.memory.id === "weak-match")
  );
});

test("returns memory when it matches a specific query term", () => {
  const memory = createMemory({
    title: "Deployment Guide",
    content: "deployment123 configuration details",
    tags: [],
  });

  const service = createRetrievalService([memory]);

  const results = service.search(
    "project-1",
    "deployment123"
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.memory.id, "memory-1");
});

test("rejects memory when it does not match the query's specific term", () => {
  const memory = createMemory({
    title: "Server Guide",
    content: "The server handles incoming requests.",
    tags: [],
  });

  const service = createRetrievalService([memory]);

  const results = service.search(
    "project-1",
    "server deployment123"
  );

  assert.deepEqual(results, []);
});

test("returns memory when it matches one of multiple specific query terms", () => {
  const memory = createMemory({
    title: "Deployment Guide",
    content: "deployment123 setup instructions",
    tags: [],
  });

  const service = createRetrievalService([memory]);

  const results = service.search(
    "project-1",
    "deployment123 authentication456"
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.memory.id, "memory-1");
});