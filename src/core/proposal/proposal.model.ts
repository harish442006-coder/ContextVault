export type ProposalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export interface MemoryProposal {
  id: string;
  memoryId: string;
  type?: "PROJECT" | "DECISION" | "WORKING" | "HISTORY";
  title?: string;
  content?: string;
  tags?: string[];
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}