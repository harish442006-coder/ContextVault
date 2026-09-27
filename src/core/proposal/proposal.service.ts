import { randomUUID } from "node:crypto";
import type { MemoryType } from "../memory/memory.model.js";
import type { MemoryProposal } from "./proposal.model.js";
import { ProposalRepository } from "./proposal.repository.js";

export class ProposalService {
  constructor(
    private repository: ProposalRepository
  ) {}

  createMemoryUpdateProposal(
    memoryId: string,
    updates: {
      type?: MemoryType;
      title?: string;
      content?: string;
      tags?: string[];
    }
  ): MemoryProposal {
    const now =
      new Date().toISOString();

    const proposal: MemoryProposal = {
      id: randomUUID(),
      memoryId,
      ...(updates.type !== undefined
        ? { type: updates.type }
        : {}),
      ...(updates.title !== undefined
        ? { title: updates.title }
        : {}),
      ...(updates.content !== undefined
        ? { content: updates.content }
        : {}),
      ...(updates.tags !== undefined
        ? { tags: updates.tags }
        : {}),
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };

    this.repository.createProposal(
      proposal
    );

    return proposal;
  }

  getProposalById(
    id: string
  ): MemoryProposal | null {
    return this.repository.getProposalById(
      id
    );
  }

  approveProposal(id: string): void {
    this.repository.updateProposalStatus(
      id,
      "APPROVED"
    );
  }

  rejectProposal(id: string): void {
    this.repository.updateProposalStatus(
      id,
      "REJECTED"
    );
  }
}