import { test } from "node:test";
import assert from "node:assert/strict";

import type {
  ContextItem,
  ContextRequest,
  ContextResponse,
} from "./context-contract.js";

test("context contract represents current project context", () => {
  const item: ContextItem = {
    id: "memory-1",
    title: "Authentication Strategy",
    content:
      "Authentication uses JWT tokens with refresh tokens.",
    status: "CURRENT",
    provenance: {
      source: "MEMORY",
      sourceId: "memory-1",
    },
  };

  const request: ContextRequest = {
    projectId: "project-1",
    query: "authentication",
    accessLevel: "READ",
    maxItems: 5,
  };

  const response: ContextResponse = {
    project: {
      id: "project-1",
      name: "ContextVault",
      rootPath: "C:/projects/contextvault",
    },
    query: request.query,
    items: [item],
    generatedAt: "2026-09-25T00:00:00.000Z",
  };

  assert.equal(response.project.id, request.projectId);
  assert.equal(response.query, "authentication");
  assert.equal(response.items.length, 1);

  assert.equal(
    response.items[0]?.status,
    "CURRENT"
  );

  assert.equal(
    response.items[0]?.provenance.source,
    "MEMORY"
  );
});