import { DatabaseSync } from "node:sqlite";
import type { Activity } from "./activity.model.js";

export class ActivityRepository {
  constructor(private db: DatabaseSync) {}

  createActivity(activity: Activity): void {
    const statement = this.db.prepare(`
      INSERT INTO activities (
        id,
        project_id,
        type,
        source,
        title,
        external_id,
        metadata,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?,?)
    `);

    statement.run(
      activity.id,
      activity.projectId,
      activity.type,
      activity.source,
      activity.title,
      activity.externalId ?? null,
      JSON.stringify(activity.metadata),
      activity.createdAt
    );
  }

  getActivitiesByProjectId(
    projectId: string
  ): Activity[] {
    const statement = this.db.prepare(`
      SELECT
        id,
        project_id,
        type,
        source,
        title,
        external_id,
        metadata,
        created_at
      FROM activities
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);

    const rows = statement.all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      type: row.type,
      source: row.source,
      title: row.title,
      externalId: row.external_id ?? undefined,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
    }));
  }

  getActivityByExternalId(
    projectId: string,
    source: Activity["source"],
    externalId: string
    ): Activity | null {
    const statement = this.db.prepare(`
        SELECT
        id,
        project_id,
        type,
        source,
        title,
        external_id,
        metadata,
        created_at
        FROM activities
        WHERE project_id = ?
        AND source = ?
        AND external_id = ?
    `);

    const row = statement.get(
        projectId,
        source,
        externalId
    ) as any;

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        source: row.source,
        title: row.title,
        externalId: row.external_id ?? undefined,
        metadata: JSON.parse(row.metadata),
        createdAt: row.created_at,
    };
    }
  deleteBlankGitActivities(projectId: string): number {
    const statement = this.db.prepare(`
      DELETE FROM activities
      WHERE project_id = ?
        AND source = 'GIT'
        AND type = 'COMMIT'
        AND TRIM(title) = ''
    `);

    const result = statement.run(projectId);

    return Number(result.changes);
  }
}