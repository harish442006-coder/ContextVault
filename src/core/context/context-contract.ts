export type ContextSource =
  | "MEMORY"
  | "FILESYSTEM"
  | "GIT";

export type ContextStatus =
  | "CURRENT"
  | "HISTORICAL";

export type ContextAccessLevel =
  | "READ"
  | "PROPOSE"
  | "WRITE";

export interface ContextProvenance {
  source: ContextSource;
  sourceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContextItem {
  id: string;
  title: string;
  content: string;
  status: ContextStatus;
  provenance: ContextProvenance;
}

export interface ContextRequest {
  projectId: string;
  query: string;
  accessLevel?: ContextAccessLevel;
  maxItems?: number;
}

export interface ContextResponse {
  project: {
    id: string;
    name: string;
    rootPath: string;
  };

  query: string;

  items: ContextItem[];

  generatedAt: string;
}