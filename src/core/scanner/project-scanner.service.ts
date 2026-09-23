import fs from "node:fs";
import path from "node:path";

export interface FileSnapshot {
  path: string;
  modifiedAt: string;
  size: number;
}

export type FileChangeType =
  | "NEW"
  | "MODIFIED"
  | "DELETED";

export interface FileChange {
  type: FileChangeType;
  path: string;
  previous?: FileSnapshot;
  current?: FileSnapshot;
}

export class ProjectScannerService {
  private ignoredDirectories = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
  ]);

  private ignoredFiles = new Set([
    "contextvault.db",
    "contextvault.db-wal",
    "contextvault.db-shm",
    ]);

  private ignoredPaths: Set<string>;

  constructor(databasePath?: string) {
    this.ignoredPaths = new Set(
      databasePath
        ? [
            path.resolve(databasePath),
            path.resolve(`${databasePath}-wal`),
            path.resolve(`${databasePath}-shm`),
          ]
        : []
    );
  }

  scanProject(projectPath: string): FileSnapshot[] {
    const snapshots: FileSnapshot[] = [];

    this.scanDirectory(projectPath, projectPath, snapshots);

    return snapshots;
  }

  compareSnapshots(
    previous: FileSnapshot[],
    current: FileSnapshot[]
    ): FileChange[] {
    const changes: FileChange[] = [];

    const previousMap = new Map(
        previous.map(file => [file.path, file])
    );

    const currentMap = new Map(
        current.map(file => [file.path, file])
    );

    for (const file of current) {
        const oldFile = previousMap.get(file.path);

        if (!oldFile) {
        changes.push({
            type: "NEW",
            path: file.path,
            current: file,
        });

        continue;
        }

        if (
        oldFile.modifiedAt !== file.modifiedAt ||
        oldFile.size !== file.size
        ) {
        changes.push({
            type: "MODIFIED",
            path: file.path,
            previous: oldFile,
            current: file,
        });
        }
    }

    for (const file of previous) {
        if (!currentMap.has(file.path)) {
        changes.push({
            type: "DELETED",
            path: file.path,
            previous: file,
        });
        }
    }

    return changes;
    }

  private scanDirectory(
    rootPath: string,
    currentPath: string,
    snapshots: FileSnapshot[]
  ): void {
    const entries = fs.readdirSync(currentPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (this.ignoredDirectories.has(entry.name)) {
          continue;
        }

        this.scanDirectory(rootPath, fullPath, snapshots);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }
      if (this.ignoredPaths.has(path.resolve(fullPath))) {
        continue;
      }
      if (this.ignoredFiles.has(entry.name)) {
        continue;
       }
      const stats = fs.statSync(fullPath);

      snapshots.push({
        path: path.relative(rootPath, fullPath).replace(/\\/g, "/"),
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size,
      });
    }
  }
}