export type ActivityType =
  | "COMMIT"
  | "FILE_CHANGE";

export type ActivitySource =
  | "GIT"
  | "FILESYSTEM";

export interface Activity {
  id: string;
  projectId: string;
  type: ActivityType;
  source: ActivitySource;
  title: string;
  externalId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}