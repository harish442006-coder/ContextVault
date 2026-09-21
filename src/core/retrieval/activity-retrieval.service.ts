import type { Activity } from "../activity/activity.model.js";
import { ActivityService } from "../activity/activity.service.js";

export interface ScoredActivity {
  activity: Activity;
  score: number;
  matchReasons: string[];
}

export class ActivityRetrievalService {
  constructor(
    private activityService: ActivityService
  ) {}

  search(
    projectId: string,
    query: string
  ): ScoredActivity[] {
    const activities =
      this.activityService.getActivitiesByProjectId(projectId);

    const normalizedQuery = this.normalizeText(query);
    const keywords = this.extractKeywords(normalizedQuery);

    if (keywords.length === 0 || activities.length === 0) {
      return [];
    }

    const scoredActivities: ScoredActivity[] =
      activities.map((activity) => {
        const title = this.normalizeText(activity.title);

        const metadata = this.normalizeText(
          JSON.stringify(activity.metadata)
        );

        const files = Array.isArray(activity.metadata.files)
          ? activity.metadata.files.filter(
              (file): file is string => typeof file === "string"
            )
          : [];

        let score = 0;
        const matchReasons: string[] = [];

        // Exact phrase match in title
        if (
          normalizedQuery.length > 0 &&
          title.includes(normalizedQuery)
        ) {
          score += 5;
          matchReasons.push(
            `Exact query match in title: "${normalizedQuery}" (+5)`
          );
        }

        // Keyword-based scoring
        for (const keyword of keywords) {
          if (title.includes(keyword)) {
            score += 3;

            matchReasons.push(
              `Title contains keyword: "${keyword}" (+3)`
            );
          } else if (metadata.includes(keyword)) {
            score += 1;

            const matchingFile = files.find((file) =>
              this.normalizeText(file).includes(keyword)
            );

            if (matchingFile) {
              matchReasons.push(
                `File path contains keyword: "${keyword}" (${matchingFile}) (+1)`
              );
            } else {
              matchReasons.push(
                `Metadata contains keyword: "${keyword}" (+1)`
              );
            }
          }
        }

        return {
          activity,
          score,
          matchReasons,
        };
      });

    return scoredActivities
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        // Higher relevance score first
        const scoreDifference = b.score - a.score;

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        // If scores are equal, newer activity first
        return (
          new Date(b.activity.createdAt).getTime() -
          new Date(a.activity.createdAt).getTime()
        );
      })
      .slice(0, 10);
  }

  private normalizeText(text: string): string {
    return text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      "the",
      "is",
      "are",
      "was",
      "were",
      "a",
      "an",
      "and",
      "or",
      "to",
      "of",
      "in",
      "on",
      "for",
      "we",
      "why",
      "what",
      "how",
      "when",
      "where",
      "which",
      "do",
      "did",
    ]);

    return [
      ...new Set(
        query
          .toLowerCase()
          .split(/\s+/)
          .map((word) =>
            word.replace(/^[^\w]+|[^\w]+$/g, "")
          )
          .filter(
            (word) =>
              word.length > 0 && !stopWords.has(word)
          )
      ),
    ];
  }
}