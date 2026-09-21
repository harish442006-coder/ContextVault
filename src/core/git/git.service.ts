import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export class GitService {
  isGitRepository(projectPath: string): boolean {
    const gitPath = path.join(projectPath, ".git");

    return fs.existsSync(gitPath);
  }
    getRecentCommits(projectPath: string, limit = 5) {
        if (!this.isGitRepository(projectPath)) {
            return [];
        }

        const output = execFileSync(
            "git",
            [
            "log",
            `--max-count=${limit}`,
            "--format=%H%x1f%s",
            ],
            {
            cwd: projectPath,
            encoding: "utf-8",
            }
        );

        const commitLines = output
            .split(/\r?\n/)
            .filter(Boolean);

        return commitLines.map((line) => {
            const separatorIndex = line.indexOf("\x1f");

            const hash = line.slice(0, separatorIndex);
            const message = line.slice(separatorIndex + 1);

            const filesOutput = execFileSync(
            "git",
            [
                "diff-tree",
                "--root",
                "--no-commit-id",
                "--name-only",
                "-r",
                hash,
            ],
            {
                cwd: projectPath,
                encoding: "utf-8",
            }
            );

            const files = filesOutput
            .split(/\r?\n/)
            .map((file) => file.trim())
            .filter(Boolean);

            return {
            hash,
            message,
            files,
            };
        });
        }
}