import { DatabaseSync } from "node:sqlite";
import defaultDb from "../../database/database.js";
import type { Project } from "./project.model.js";

export class ProjectRepository {
  constructor(private readonly db: DatabaseSync = defaultDb) {}

  createProject(project: Project): void {
    const statement = this.db.prepare(`
      INSERT INTO projects
      (id, name, root_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    statement.run(
      project.id,
      project.name,
      project.rootPath,
      project.createdAt,
      project.updatedAt
    );
  }

  getProjectById(id: string): Project | undefined {
    const statement = this.db.prepare(`
      SELECT
        id,
        name,
        root_path AS rootPath,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM projects
      WHERE id = ?
    `);

    return statement.get(id) as Project | undefined;
  }

  getAllProjects(): Project[] {
    const statement = this.db.prepare(`
      SELECT
        id,
        name,
        root_path AS rootPath,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM projects
    `);

    return statement.all() as unknown as Project[];
  }


  getProjectByRootPath(rootPath: string): Project | undefined {
    const statement = this.db.prepare(`
      SELECT
        id,
        name,
        root_path AS rootPath,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM projects
      WHERE root_path = ?
    `);

    return statement.get(rootPath) as Project | undefined;
  }


}