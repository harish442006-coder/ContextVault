import test from "node:test";
import assert from "node:assert/strict";

import {
  ProjectScannerService,
  type FileSnapshot,
} from "./project-scanner.service.js";

test("scanner detects new, modified and deleted files", () => {
  const scanner = new ProjectScannerService();

  const previous: FileSnapshot[] = [
    {
      path: "old.ts",
      modifiedAt: "2026-09-18T10:00:00.000Z",
      size: 100,
    },
    {
      path: "app.ts",
      modifiedAt: "2026-09-18T10:00:00.000Z",
      size: 100,
    },
  ];

  const current: FileSnapshot[] = [
    {
      path: "app.ts",
      modifiedAt: "2026-09-19T10:00:00.000Z",
      size: 150,
    },
    {
      path: "new.ts",
      modifiedAt: "2026-09-19T10:00:00.000Z",
      size: 200,
    },
  ];

  const changes = scanner.compareSnapshots(previous, current);

  assert.deepEqual(
    changes.map(change => `${change.type}:${change.path}`).sort(),
    ["DELETED:old.ts", "MODIFIED:app.ts", "NEW:new.ts"].sort()
  );
});

test("scanner throws when project directory does not exist", () => {
  const scanner = new ProjectScannerService();

  assert.throws(() => {
    scanner.scanProject("Z:/contextvault-nonexistent-folder-12345");
  });
});