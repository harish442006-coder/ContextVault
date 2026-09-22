import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.CONTEXTVAULT_DB_PATH
  ? path.resolve(process.env.CONTEXTVAULT_DB_PATH)
  : path.resolve(__dirname, "../../data/contextvault.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    external_id TEXT,
    metadata TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(project_id, source, external_id)
  );

  CREATE TABLE IF NOT EXISTS file_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    path TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    size INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(project_id, path)
  );
`);

const activityColumns = db
  .prepare("PRAGMA table_info(activities)")
  .all() as { name: string }[];

const hasExternalId = activityColumns.some(
  column => column.name === "external_id"
  );

  if (!hasExternalId) {
    db.exec(`
      ALTER TABLE activities
      ADD COLUMN external_id TEXT
    `);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_activities_project_source_external
    ON activities(project_id, source, external_id)
  `);

  const existingGitActivities = db
    .prepare(`
      SELECT id, metadata
      FROM activities
      WHERE source = 'GIT'
        AND type = 'COMMIT'
        AND external_id IS NULL
    `)
    .all() as {
      id: string;
      metadata: string;
    }[];

  const updateExternalId = db.prepare(`
    UPDATE activities
    SET external_id = ?
    WHERE id = ?
  `);

  for (const activity of existingGitActivities) {
    const metadata = JSON.parse(activity.metadata) as {
      hash?: string;
    };

    if (metadata.hash) {
      updateExternalId.run(
        metadata.hash,
        activity.id
      );
    }
  }
export default db;