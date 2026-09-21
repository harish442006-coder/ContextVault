export type MemoryType =
  | "PROJECT"
  | "DECISION"
  | "WORKING"
  | "HISTORY";

export type MemoryStatus =
  | "ACTIVE"
  | "SUPERSEDED"
  | "ARCHIVED";

export interface Memory {
  id: string;
  projectId: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
}