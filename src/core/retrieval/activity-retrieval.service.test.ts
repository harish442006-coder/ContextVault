import { test } from "node:test";
import assert from "node:assert/strict";

import { ActivityRetrievalService } from "./activity-retrieval.service.js";
import type { Activity } from "../activity/activity.model.js";
import type { ActivityService } from "../activity/activity.service.js";

test("returns matching activity with the expected score", () => {
  const mockActivity: Activity = {
    id: "activity-1",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Add alpha module",
    metadata: {},
    createdAt: "2026-09-21T09:00:00.000Z",
  };

  const mockActivityService = {
    getActivitiesByProjectId: () => [mockActivity],
  } as unknown as ActivityService;

  const retrievalService = new ActivityRetrievalService(
    mockActivityService
  );

  const results = retrievalService.search(
    "project-1",
    "alpha"
  );
  assert.ok(results[0]);

  assert.equal(results.length, 1);
  assert.equal(results[0].activity.id, "activity-1");
  assert.equal(results[0].score, 8);
});
test("matches keywords in file paths and explains the match", () => {
  const mockActivity: Activity = {
    id: "activity-2",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Update module",
    metadata: {
      files: ["src/cart-alpha.txt"],
    },
    createdAt: "2026-09-21T10:00:00.000Z",
  };

  const mockActivityService = {
    getActivitiesByProjectId: () => [mockActivity],
  } as unknown as ActivityService;

  const retrievalService = new ActivityRetrievalService(
    mockActivityService
  );

  const results = retrievalService.search(
    "project-1",
    "cart"
  );
  assert.ok(results[0]);

  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1);

  assert.deepEqual(results[0].matchReasons, [
    'File path contains keyword: "cart" (src/cart-alpha.txt) (+1)',
  ]);
});

test("returns an empty array when no activity matches the query", () => {
  const mockActivity: Activity = {
    id: "activity-3",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Update navigation",
    metadata: {
      files: ["src/navbar.css"],
    },
    createdAt: "2026-09-21T11:00:00.000Z",
  };

  const mockActivityService = {
    getActivitiesByProjectId: () => [mockActivity],
  } as unknown as ActivityService;

  const retrievalService = new ActivityRetrievalService(
    mockActivityService
  );

  const results = retrievalService.search(
    "project-1",
    "database"
  );

  assert.deepEqual(results, []);
});

test("sorts newer activities first when relevance scores are equal", () => {
  const olderActivity: Activity = {
    id: "activity-older",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Update alpha module",
    metadata: {
      files: ["src/cart-alpha.txt"],
    },
    createdAt: "2026-09-18T09:00:00.000Z",
  };

  const newerActivity: Activity = {
    id: "activity-newer",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Update beta module",
    metadata: {
      files: ["src/cart-beta.txt"],
    },
    createdAt: "2026-09-21T09:00:00.000Z",
  };

  const mockActivityService = {
    // Intentionally return older activity first
    getActivitiesByProjectId: () => [
      olderActivity,
      newerActivity,
    ],
  } as unknown as ActivityService;

  const retrievalService = new ActivityRetrievalService(
    mockActivityService
  );

  const results = retrievalService.search(
    "project-1",
    "cart"
  );

  assert.equal(results.length, 2);
  assert.ok(results[0]);
  assert.ok(results[1]);

  // Both activities should have the same score
  assert.equal(results[0].score, 1);
  assert.equal(results[1].score, 1);

  // Newer activity should appear first
  assert.deepEqual(
    results.map((result) => result.activity.id),
    ["activity-newer", "activity-older"]
  );
});

test("sorts higher relevance scores before lower scores", () => {
  const lowerScoreActivity: Activity = {
    id: "activity-low",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Update module",
    metadata: {
      files: ["src/cart-alpha.txt"],
    },
    createdAt: "2026-09-21T12:00:00.000Z",
  };

  const higherScoreActivity: Activity = {
    id: "activity-high",
    projectId: "project-1",
    type: "COMMIT",
    source: "GIT",
    title: "Cart module update",
    metadata: {},
    createdAt: "2026-09-18T09:00:00.000Z",
  };

  const mockActivityService = {
    getActivitiesByProjectId: () => [
      lowerScoreActivity,
      higherScoreActivity,
    ],
  } as unknown as ActivityService;

  const retrievalService = new ActivityRetrievalService(
    mockActivityService
  );

  const results = retrievalService.search(
    "project-1",
    "cart"
  );

  assert.equal(results.length, 2);
  assert.ok(results[0]);
  assert.ok(results[1]);

  // Title match gets higher score than file-path match
  assert.equal(results[0].score, 8);
  assert.equal(results[1].score, 1);

  // Higher relevance must win, even though it's older
  assert.deepEqual(
    results.map((result) => result.activity.id),
    ["activity-high", "activity-low"]
  );
});