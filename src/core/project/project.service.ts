import { randomUUID } from "node:crypto";
import type { Project } from "./project.model.js";
import { ProjectRepository } from "./project.repository.js";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository = new ProjectRepository()) {}

  createProject(name: string, rootPath: string): Project {
    const now = new Date().toISOString();

    const project: Project = {
      id: randomUUID(),
      name,
      rootPath,
      createdAt: now,
      updatedAt: now
    };

    this.repository.createProject(project);

    return project;
  }

  getProjectById(id: string): Project | undefined {
    return this.repository.getProjectById(id);
  }

  getProjectByRootPath(rootPath: string): Project | undefined { 
    return this.repository.getProjectByRootPath(rootPath); 
  }
  
  getAllProjects(): Project[] {
    return this.repository.getAllProjects();
  }
}