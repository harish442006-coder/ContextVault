import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { FileSnapshot } from "./project-scanner.service.js";

export class FileSnapshotRepository {
  constructor(private db: DatabaseSync) {}

  getSnapshotsByProjectId(
    projectId: string
  ): FileSnapshot[] {
    const statement = this.db.prepare(`
      SELECT path, modified_at, size
      FROM file_snapshots
      WHERE project_id = ?
    `);

    const rows = statement.all(projectId) as {
      path: string;
      modified_at: string;
      size: number;
    }[];

    return rows.map(row => ({
      path: row.path,
      modifiedAt: row.modified_at,
      size: row.size,
    }));
  }

  saveSnapshots(
    projectId: string,
    snapshots: FileSnapshot[]
    ): void {
    const statement = this.db.prepare(`
        INSERT INTO file_snapshots (
        id,
        project_id,
        path,
        modified_at,
        size
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(project_id, path)
        DO UPDATE SET
        modified_at = excluded.modified_at,
        size = excluded.size
    `);

    this.db.exec("BEGIN");

    try {
        const deleteStatement = this.db.prepare(`
        DELETE FROM file_snapshots
        WHERE project_id = ?
        `);

        deleteStatement.run(projectId);

        for (const snapshot of snapshots) {
        statement.run(
            randomUUID(),
            projectId,
            snapshot.path,
            snapshot.modifiedAt,
            snapshot.size
        );
        }

        this.db.exec("COMMIT");
    } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
    }
    }
}