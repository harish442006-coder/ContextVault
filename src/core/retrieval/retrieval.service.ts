import type { Memory } from "../memory/memory.model.js";
import { MemoryRepository } from "../memory/memory.repository.js";

export interface ScoredMemory {
  memory: Memory;
  score: number;
}

export class RetrievalService {
  constructor(private memoryRepository: MemoryRepository) {}

  search(projectId: string, query: string): ScoredMemory[] {
    const memories = this.memoryRepository
      .getMemoriesByProjectId(projectId)
      .filter((memory) => memory.status !== "ARCHIVED");

    const keywords = this.extractKeywords(query);

    if (keywords.length === 0 || memories.length === 0) {
      return [];
    }

    const documentFrequencies =
      this.calculateDocumentFrequencies(memories);

    const scoredMemories = memories.map((memory) => {
      const score = this.calculateScore(
        memory,
        keywords,
        memories,
        documentFrequencies
      );

      return {
        memory,
        score,
      };
    });

    const rankedMemories = scoredMemories
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (rankedMemories.length === 0) {
      return [];
    }

    return this.applyRelevanceCutoff(rankedMemories);
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
          .map((word) => word.replace(/^[^\w]+|[^\w]+$/g, ""))
          .filter(
            (word) =>
              word.length > 0 &&
              !stopWords.has(word)
          )
      ),
    ];
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/^[^\w]+|[^\w]+$/g, ""))
      .filter((word) => word.length > 0);
  }

  private calculateDocumentFrequencies(
    memories: Memory[]
  ): Map<string, number> {
    const documentFrequencies = new Map<string, number>();

    for (const memory of memories) {
      const uniqueTerms = new Set([
        ...this.tokenize(memory.title),
        ...this.tokenize(memory.content),
        ...memory.tags.map((tag) => tag.toLowerCase()),
      ]);

      for (const term of uniqueTerms) {
        documentFrequencies.set(
          term,
          (documentFrequencies.get(term) ?? 0) + 1
        );
      }
    }

    return documentFrequencies;
  }
  private calculateTermWeight(
    term: string,
    totalDocuments: number,
    documentFrequencies: Map<string, number>
  ): number {
    const documentFrequency =
      documentFrequencies.get(term) ?? 0;

    return (
      Math.log(
        (totalDocuments + 1) /
          (documentFrequency + 1)
      ) + 1
    );
  }

  private isSpecificTerm(term: string): boolean {
    return (
      term.includes("-") ||
      /\d/.test(term) ||
      term.length >= 10
    );
  }

  private calculateScore(
    memory: Memory,
    keywords: string[],
    memories: Memory[],
    documentFrequencies: Map<string, number>
  ): number {
    let score = 0;
    let matchedKeywords = 0;
    let specificMatches = 0;

    const titleTokens = this.tokenize(memory.title);
    const contentTokens = this.tokenize(memory.content);
    const tags = memory.tags.map((tag) =>
      tag.toLowerCase()
    );

    for (const keyword of keywords) {
      const inTitle = titleTokens.includes(keyword);
      const inContent = contentTokens.includes(keyword);
      const inTags = tags.includes(keyword);

      if (!inTitle && !inContent && !inTags) {
        continue;
      }

      matchedKeywords++;

      const termWeight = this.calculateTermWeight(
        keyword,
        memories.length,
        documentFrequencies
      );

      const specificTerm = this.isSpecificTerm(keyword);

      if (specificTerm) {
        specificMatches++;
      }

      const specificityMultiplier = specificTerm
        ? 2
        : 1;

      const weightedTerm =
        termWeight * specificityMultiplier;

      if (inTitle) {
        score += 6 * weightedTerm;
      }

      if (inTags) {
        score += 5 * weightedTerm;
      }

      if (inContent) {
        score += 2 * weightedTerm;
      }

      const fieldMatches =
        Number(inTitle) +
        Number(inContent) +
        Number(inTags);

      if (fieldMatches >= 2) {
        score += 2 * weightedTerm;
      }
    }

    if (matchedKeywords === 0) {
      return 0;
    }

    /*
     * If the query contains a highly specific term
     * but this memory does not contain that term,
     * this memory is not a strong candidate.
     */
    const queryHasSpecificTerm = keywords.some((keyword) =>
      this.isSpecificTerm(keyword)
    );

    if (queryHasSpecificTerm && specificMatches === 0) {
      return 0;
    }

    const coverage =
      matchedKeywords / keywords.length;

    if (coverage === 1) {
      score += 4;
    }

    if (memory.status === "ACTIVE") {
      score += 1;
    }

    return score;
  }

  private applyRelevanceCutoff(
    rankedMemories: ScoredMemory[]
  ): ScoredMemory[] {
    if (rankedMemories.length <= 1) {
      return rankedMemories;
    }

    const firstMemory = rankedMemories[0];

    if (!firstMemory) {
      return rankedMemories;
    }

    const topScore = firstMemory.score;

    const minimumRelativeScore = topScore * 0.35;

    return rankedMemories.filter(
      (item) =>
        item.score >= minimumRelativeScore
    );
  }
}