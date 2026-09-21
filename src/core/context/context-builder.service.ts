import type { ScoredMemory } from "../retrieval/retrieval.service.js";
import type { ScoredActivity } from "../retrieval/activity-retrieval.service.js";

export class ContextBuilderService {
  private readonly MAX_ACTIVE_MEMORIES = 5;
  private readonly MAX_SUPERSEDED_MEMORIES = 5;
  private readonly MAX_ACTIVITIES = 10;
  private readonly MAX_CONTEXT_CHARS = 12000;

    private formatActivityMetadata(
      activity: ScoredActivity["activity"]
    ): string {
      const metadata = activity.metadata;
      const lines: string[] = [];

      const addSnapshot = (
        label: string,
        value: unknown
      ) => {
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          return;
        }

        const snapshot = value as Record<string, unknown>;

        if (typeof snapshot.size === "number") {
          lines.push(`${label} Size: ${snapshot.size} bytes`);
        }

        if (typeof snapshot.modifiedAt === "string") {
          lines.push(`${label} Modified: ${snapshot.modifiedAt}`);
        }
      };

      if (activity.source === "FILESYSTEM") {
        if (typeof metadata.changeType === "string") {
          lines.push(`Change Type: ${metadata.changeType}`);
        }

        if (typeof metadata.path === "string") {
          lines.push(`File: ${metadata.path}`);
        }

        addSnapshot("Previous", metadata.previous);
        addSnapshot("Current", metadata.current);
      }

      if (activity.source === "GIT") {
        if (typeof metadata.hash === "string") {
          lines.push(`Commit Hash: ${metadata.hash}`);
        }

        if (Array.isArray(metadata.files)) {
          const files = metadata.files
            .filter((file): file is string =>
              typeof file === "string"
            )
            .slice(0, 20);

          if (files.length > 0) {
            lines.push(`Changed Files: ${files.join(", ")}`);
          }
        }
      }

      return lines.length > 0
        ? `${lines.join("\n")}\n`
        : "";
    }

 buildContext(
    projectName: string,
    projectPath: string,
    memories: ScoredMemory[],
    activities: ScoredActivity[]
  ): string {
    const closingTag = `</CONTEXTVAULT_CONTEXT>`;

    let context =
      `<CONTEXTVAULT_CONTEXT>\n\n` +
      `PROJECT\n` +
      `Name: ${projectName}\n` +
      `Path: ${projectPath}\n\n` +
      `CURRENT CONTEXT\n\n` +
      `HISTORICAL CONTEXT\n\n` +
      `RELEVANT ACTIVITIES\n\n`;

    const activeMemories = memories
      .filter((item) => item.memory.status === "ACTIVE")
      .slice(0, this.MAX_ACTIVE_MEMORIES);

    const supersededMemories = memories
      .filter((item) => item.memory.status === "SUPERSEDED")
      .slice(0, this.MAX_SUPERSEDED_MEMORIES);

    const relevantActivities = activities.slice(
      0,
      this.MAX_ACTIVITIES
    );

    const appendEntry = (entry: string): boolean => {
      if (
        context.length + entry.length + closingTag.length >
        this.MAX_CONTEXT_CHARS
      ) {
        return false;
      }

      context += entry;
      return true;
    };

    for (const item of activeMemories) {
      const memory = item.memory;

      const entry =
        `[${memory.type}]\n` +
        `Title: ${memory.title}\n` +
        `Tags: ${memory.tags.join(", ")}\n` +
        `Content:\n${memory.content}\n\n`;

      if (!appendEntry(entry)) {
        break;
      }
    }

    for (const item of supersededMemories) {
      const memory = item.memory;

      const entry =
        `[${memory.type}]\n` +
        `Title: ${memory.title}\n` +
        `Status: SUPERSEDED\n` +
        `Tags: ${memory.tags.join(", ")}\n` +
        `Content:\n${memory.content}\n\n`;

      if (!appendEntry(entry)) {
        break;
      }
    }

      for (const item of relevantActivities) {
        const activity = item.activity;

        const metadataText =
          this.formatActivityMetadata(activity);

        const matchReasonsText =
          item.matchReasons.length > 0
            ? `Match Reasons:\n${item.matchReasons
                .map((reason) => `- ${reason}`)
                .join("\n")}\n`
            : "";

        const entry =
          `[${activity.type} | ${activity.source}]\n` +
          `Title: ${activity.title}\n` +
          metadataText +
          `Date: ${activity.createdAt}\n` +
          `Relevance Score: ${item.score}\n` +
          matchReasonsText +
          `\n`;

        if (!appendEntry(entry)) {
          break;
        }
      }
    return context + closingTag;
  }
}