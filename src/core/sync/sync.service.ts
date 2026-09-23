import { GitService } from "../git/git.service.js";
import { ProjectScannerService } from "../scanner/project-scanner.service.js";
import { FileSnapshotRepository } from "../scanner/file-snapshot.repository.js";
import { ActivityService } from "../activity/activity.service.js";

export class SyncService {
  constructor(
    private gitService: GitService,
    private projectScanner: ProjectScannerService,
    private fileSnapshotRepository: FileSnapshotRepository,
    private activityService: ActivityService
  ) {}

  syncProject(
    projectId: string,
    projectPath: string
  ): string {
    // Non-Git project: filesystem sync
    if (!this.gitService.isGitRepository(projectPath)) {
      const currentSnapshots =
        this.projectScanner.scanProject(projectPath);

      const previousSnapshots =
        this.fileSnapshotRepository.getSnapshotsByProjectId(
          projectId
        );

      // First scan: establish baseline
      if (previousSnapshots.length === 0) {
        this.fileSnapshotRepository.saveSnapshots(
          projectId,
          currentSnapshots
        );

        return `Initial scan complete. ${currentSnapshots.length} files indexed.`;
      }

      const changes = this.projectScanner.compareSnapshots(
        previousSnapshots,
        currentSnapshots
      );

      let syncedCount = 0;

      for (const change of changes) {
        const snapshot = change.current ?? change.previous;

        if (!snapshot) {
          continue;
        }

        const externalId = [
          "FILE_CHANGE",
          change.type,
          change.path,
          snapshot.modifiedAt,
          snapshot.size,
        ].join(":");

        const existingActivity =
          this.activityService.getActivityByExternalId(
            projectId,
            "FILESYSTEM",
            externalId
          );

        if (existingActivity) {
          continue;
        }

        this.activityService.createActivity(
          projectId,
          "FILE_CHANGE",
          "FILESYSTEM",
          `${change.type}: ${change.path}`,
          {
            changeType: change.type,
            path: change.path,
            previous: change.previous,
            current: change.current,
          },
          externalId
        );

        syncedCount++;
      }

      this.fileSnapshotRepository.saveSnapshots(
        projectId,
        currentSnapshots
      );

      return `Filesystem sync complete. ${syncedCount} new activities.`;
    }

    // Git repository: sync recent commits
    const commits = this.gitService.getRecentCommits(
      projectPath,
      5
    );

    let syncedCount = 0;

    for (const commit of commits) {
      if (!commit.hash) {
        continue;
      }

      const existingActivity =
        this.activityService.getActivityByExternalId(
          projectId,
          "GIT",
          commit.hash
        );

      if (existingActivity) {
        continue;
      }

      this.activityService.createActivity(
        projectId,
        "COMMIT",
        "GIT",
        commit.message,
        {
          hash: commit.hash,
          files: commit.files,
        },
        commit.hash
      );

      syncedCount++;
    }

    return `Synced ${syncedCount} new Git activities.`;
  }
}