import { RetrievalService } from "../retrieval/retrieval.service.js";
import { ContextBuilderService } from "./context-builder.service.js";
import { ActivityRetrievalService } from "../retrieval/activity-retrieval.service.js";
import type {
  ContextRequest,
  ContextResponse,
  ContextItem,
} from "./context-contract.js";

export class ContextVaultService {
  constructor(
    private retrievalService: RetrievalService,
    private contextBuilder: ContextBuilderService,
    private activityRetrievalService: ActivityRetrievalService
  ) {}

  getContext(
    projectId: string,
    projectName: string,
    projectPath: string,
    query: string
  ): string {
    const memoryResults = this.retrievalService.search(
      projectId,
      query
    );

    const activityResults =
      this.activityRetrievalService.search(
        projectId,
        query
      );

    return this.contextBuilder.buildContext(
      projectName,
      projectPath,
      memoryResults,
      activityResults
    );
  }

  getContextResponse(
    request: ContextRequest,
    projectName: string,
    projectPath: string
  ): ContextResponse {
    const memoryResults = this.retrievalService.search(
      request.projectId,
      request.query
    );

    const activityResults =
      this.activityRetrievalService.search(
        request.projectId,
        request.query
      );

    const items: ContextItem[] = [];

    for (const result of memoryResults) {
      const memory = result.memory;

      items.push({
        id: memory.id,
        title: memory.title,
        content: memory.content,
        status:
          memory.status === "ACTIVE"
            ? "CURRENT"
            : "HISTORICAL",
        provenance: {
          source: "MEMORY",
          sourceId: memory.id,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt,
        },
      });
    }

    for (const result of activityResults) {
      const activity = result.activity;

      items.push({
        id: activity.id,
        title: activity.title,
        content: JSON.stringify(activity.metadata),
        status: "CURRENT",
        provenance: {
          source:
            activity.source === "FILESYSTEM"
              ? "FILESYSTEM"
              : "GIT",
          sourceId: activity.id,
          createdAt: activity.createdAt,
        },
      });
    }

    const limitedItems =
      typeof request.maxItems === "number"
        ? items.slice(0, request.maxItems)
        : items;

    return {
      project: {
        id: request.projectId,
        name: projectName,
        rootPath: projectPath,
      },
      query: request.query,
      items: limitedItems,
      generatedAt: new Date().toISOString(),
    };
  }
}