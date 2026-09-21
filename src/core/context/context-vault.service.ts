import { RetrievalService } from "../retrieval/retrieval.service.js";
import { ContextBuilderService } from "./context-builder.service.js";
import { ActivityRetrievalService } from "../retrieval/activity-retrieval.service.js";

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
}