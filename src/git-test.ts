import { GitService } from "./core/git/git.service.js";

const gitService = new GitService();

const projectPath = process.cwd();

const commits = gitService.getRecentCommits(projectPath);

console.log(commits);