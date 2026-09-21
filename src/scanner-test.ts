import {
  ProjectScannerService,
  type FileSnapshot,
} from "./core/scanner/project-scanner.service.js";

const scanner = new ProjectScannerService();

const previous: FileSnapshot[] = [
  {
    path: "src/app.ts",
    modifiedAt: "2026-09-18T10:00:00.000Z",
    size: 100,
  },
  {
    path: "src/old.ts",
    modifiedAt: "2026-09-18T10:00:00.000Z",
    size: 200,
  },
  {
    path: "package.json",
    modifiedAt: "2026-09-18T10:00:00.000Z",
    size: 300,
  },
];

const current: FileSnapshot[] = [
  {
    path: "src/app.ts",
    modifiedAt: "2026-09-18T10:00:00.000Z",
    size: 100,
  },
  {
    path: "src/old.ts",
    modifiedAt: "2026-09-19T10:00:00.000Z",
    size: 250,
  },
  {
    path: "src/new.ts",
    modifiedAt: "2026-09-19T10:00:00.000Z",
    size: 150,
  },
];

const changes = scanner.compareSnapshots(
  previous,
  current
);

console.log(changes);