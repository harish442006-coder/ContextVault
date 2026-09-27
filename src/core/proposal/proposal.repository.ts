import { DatabaseSync } from "node:sqlite";
import type { MemoryProposal } from "./proposal.model.js";

export class ProposalRepository {
  constructor(private db: DatabaseSync) {}

  createProposal(
    proposal: MemoryProposal
  ): void {
    const statement = this.db.prepare(`
      INSERT INTO memory_proposals (
        id,
        memory_id,
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
      proposal.id,
      proposal.memoryId,
      proposal.type ?? null,
      proposal.title ?? null,
      proposal.content ?? null,
      proposal.tags
        ? JSON.stringify(proposal.tags)
        : null,
      proposal.status,
      proposal.createdAt,
      proposal.updatedAt
    );
  }

  getProposalById(
    id: string
  ): MemoryProposal | null {
    const statement = this.db.prepare(`
      SELECT
        id,
        memory_id,
        type,
        title,
        content,
        tags,
        status,
        created_at,
        updated_at
      FROM memory_proposals
      WHERE id = ?
    `);

    const row = statement.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      memoryId: row.memory_id,
      ...(row.type !== null
        ? { type: row.type }
        : {}),
      ...(row.title !== null
        ? { title: row.title }
        : {}),
      ...(row.content !== null
        ? { content: row.content }
        : {}),
      ...(row.tags !== null
        ? { tags: JSON.parse(row.tags) }
        : {}),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  updateProposalStatus(
    id: string,
    status: MemoryProposal["status"]
  ): void {
    const statement = this.db.prepare(`
      UPDATE memory_proposals
      SET
        status = ?,
        updated_at = ?
      WHERE id = ?
    `);

    statement.run(
      status,
      new Date().toISOString(),
      id
    );
  }
}