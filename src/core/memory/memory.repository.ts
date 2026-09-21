import { DatabaseSync } from "node:sqlite";
import type { Memory } from "./memory.model.js";

export class MemoryRepository {
  constructor(private db: DatabaseSync) {}

  createMemory(memory: Memory): void {
    const statement = this.db.prepare(`
      INSERT INTO memories (
        id,
        project_id,
        type,
        title,
        content,
        tags,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      memory.id,
      memory.projectId,
      memory.type,
      memory.title,
      memory.content,
      JSON.stringify(memory.tags),
      memory.status,
      memory.createdAt,
      memory.updatedAt
    );
  }

  getMemoryById(id: string): Memory | null {
    const statement = this.db.prepare(`
      SELECT
        id,
        project_id,
        type,
        title,
        content,
        tags,
        status,
        created_at,
        updated_at
      FROM memories
      WHERE id = ?
    `);

    const row = statement.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      projectId: row.project_id,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: JSON.parse(row.tags),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getMemoryByProjectAndTitle( projectId: string, title: string ): Memory | null { 
    const statement = this.db.prepare(` SELECT id, project_id, type, title, content, tags, status, created_at, updated_at FROM memories WHERE project_id = ? AND title = ? `); 
    const row = statement.get( projectId, title ) as any; if (!row) 
      { return null; }
      return { id: row.id,
          projectId: row.project_id,
            type: row.type,
            title: row.title, 
            content: row.content, 
            tags: JSON.parse(row.tags), 
            status: row.status, 
            createdAt: row.created_at,
              updatedAt: row.updated_at, 
        }; 
      }

  getMemoriesByProjectId(projectId: string): Memory[] {
    const statement = this.db.prepare(`
      SELECT
        id,
        project_id,
        type,
        title,
        content,
        tags,
        status,
        created_at,
        updated_at
      FROM memories
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);

    const rows = statement.all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: JSON.parse(row.tags),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  updateMemoryStatus(id: string, status: Memory["status"]): void {
    const statement = this.db.prepare(`
      UPDATE memories
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    statement.run(
      status,
      new Date().toISOString(),
      id
    );
  }

  updateMemory(
    id: string,
    type: Memory["type"],
    title: string,
    content: string,
    tags: string[]
  ): void {
    const statement = this.db.prepare(`
      UPDATE memories
      SET
        type = ?,
        title = ?,
        content = ?,
        tags = ?,
        updated_at = ?
      WHERE id = ?
    `);

    statement.run(
      type,
      title,
      content,
      JSON.stringify(tags),
      new Date().toISOString(),
      id
    );
  }

  deleteDuplicateMemories(projectId: string): void {
   const statement = this.db.prepare(`
      DELETE FROM memories
      WHERE project_id = ?
        AND id NOT IN (
          SELECT MIN(id)
          FROM memories
          WHERE project_id = ?
          GROUP BY title
        )
    `);

    statement.run(projectId, projectId);
  }

}