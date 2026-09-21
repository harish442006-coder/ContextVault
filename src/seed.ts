import type { Project } from "./core/project/project.model.js";
import { MemoryService } from "./core/memory/memory.service.js";
export function seedDemoData(
  project: Project,
  memoryService: MemoryService
) {
   
    memoryService.getOrCreateMemory(
    project.id,
    "DECISION",
    "Database Choice",
    "We are using Node's built-in SQLite API instead of better-sqlite3.",
    ["database", "sqlite", "architecture"]
    );

    memoryService.getOrCreateMemory(
    project.id,
    "DECISION",
    "Authentication Strategy",
    "Authentication will use JWT tokens with refresh tokens for user sessions.",
    ["authentication", "jwt", "security"]
    );

    memoryService.getOrCreateMemory(
    project.id,
    "DECISION",
    "API Architecture",
    "The backend will follow a REST API architecture with separate routes for users and projects.",
    ["api", "rest", "backend", "architecture"]
    );

    memoryService.getOrCreateMemory(
    project.id,
    "WORKING",
    "Current Task",
    "Currently implementing the memory system and retrieval pipeline.",
    ["memory", "retrieval", "development"]
    );

    memoryService.getOrCreateMemory(
    project.id,
    "HISTORY",
    "SQLite Installation Issue",
    "better-sqlite3 caused native compilation and node-gyp problems, so we moved to Node's built-in SQLite API.",
    ["sqlite", "node-gyp", "bug", "history"]
    );

    memoryService.getOrCreateMemory(
    project.id,
    "PROJECT",
    "Frontend Technology",
    "The frontend will eventually use React, while the current focus is on the backend core.",
    ["react", "frontend", "backend", "project"]
    );
}