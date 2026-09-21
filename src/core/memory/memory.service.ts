import { randomUUID } from "node:crypto";
import type { Memory, MemoryStatus, MemoryType } from "./memory.model.js";
import { MemoryRepository } from "./memory.repository.js";

export class MemoryService {
  constructor(private repository: MemoryRepository) {}

  createMemory(
    projectId: string,
    type: MemoryType,
    title: string,
    content: string,
    tags: string[] = []
  ): Memory {
    const now = new Date().toISOString();

    const memory: Memory = {
      id: randomUUID(),
      projectId,
      type,
      title,
      content,
      tags,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    this.repository.createMemory(memory);

    return memory;
  }

  getOrCreateMemory(
    projectId: string,
    type: MemoryType,
    title: string,
    content: string,
    tags: string[] = []
  ): Memory {
    const existingMemory =
      this.repository.getMemoryByProjectAndTitle(
        projectId,
        title
      );

    if (existingMemory) {
      return existingMemory;
    }

    return this.createMemory(
      projectId,
      type,
      title,
      content,
      tags
    );
  }

  getMemoryById(id: string): Memory | null {
    return this.repository.getMemoryById(id);
  }

  getMemoryByProjectAndTitle(
    projectId: string,
    title: string
    ): Memory | null {
      return this.repository.getMemoryByProjectAndTitle(
        projectId,
        title
      );
  }

  getMemoriesByProjectId(projectId: string): Memory[] {
    return this.repository.getMemoriesByProjectId(projectId);
  }

  updateMemory(
    id: string,
    updates: {
      type?: MemoryType;
      title?: string;
      content?: string;
      tags?: string[];
    }
  ): Memory | null {
    const existingMemory = this.repository.getMemoryById(id);

    if (!existingMemory) {
      return null;
    }

    const updatedMemory: Memory = {
      ...existingMemory,
      type: updates.type ?? existingMemory.type,
      title: updates.title ?? existingMemory.title,
      content: updates.content ?? existingMemory.content,
      tags: updates.tags ?? existingMemory.tags,
      updatedAt: new Date().toISOString(),
    };

    this.repository.updateMemory(
      updatedMemory.id,
      updatedMemory.type,
      updatedMemory.title,
      updatedMemory.content,
      updatedMemory.tags
    );

    return updatedMemory;
  }

  updateMemoryStatus(id: string, status: MemoryStatus): void {
    this.repository.updateMemoryStatus(id, status);
  }

  deleteDuplicateMemories(projectId: string): void {
    this.repository.deleteDuplicateMemories(projectId);
  }
}