import { randomUUID } from "node:crypto";
import type {
  Activity,
  ActivitySource,
  ActivityType
} from "./activity.model.js";
import { ActivityRepository } from "./activity.repository.js";

export class ActivityService {
  constructor(
    private repository: ActivityRepository
  ) {}

  createActivity(
    projectId: string,
    type: ActivityType,
    source: ActivitySource,
    title: string,
    metadata: Record<string, unknown>,
    externalId?: string
  ): Activity {
    const activity: Activity = {
        id: randomUUID(),
        projectId,
        type,
        source,
        title,
        ...(externalId !== undefined && { externalId }),
        metadata,
        createdAt: new Date().toISOString(),
    };

    this.repository.createActivity(activity);

    return activity;
  }

  getActivitiesByProjectId(
    projectId: string
  ): Activity[] {
    return this.repository.getActivitiesByProjectId(
      projectId
    );
  }

  getActivityByExternalId(
    projectId: string,
    source: ActivitySource,
    externalId: string
    ): Activity | null {
    return this.repository.getActivityByExternalId(
        projectId,
        source,
        externalId
    );
    }
  
  deleteBlankGitActivities(projectId: string): number {
    return this.repository.deleteBlankGitActivities(projectId);
  }
}