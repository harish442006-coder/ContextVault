import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("CLI init creates a project in an isolated database", () => {
    const projectRoot = process.cwd();
    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "contextvault-test-")
    );

    const dbPath = path.join(tempDir, "test.db");
    const cliPath = path.join(projectRoot, "src/index.ts");

    try {
        const result = spawnSync(
        process.execPath,
        [
        path.resolve("node_modules/tsx/dist/cli.mjs"),
        cliPath,
        "init",
        ],
        {
            cwd: tempDir,
            encoding: "utf-8",
            env: {
            ...process.env,
            CONTEXTVAULT_DB_PATH: dbPath,
            },
        }
        );

        assert.equal(
        result.status,
        0,
        `CLI failed:\n${result.stderr}\n${result.stdout}`
        );

        assert.ok(fs.existsSync(dbPath), "Database should exist");

        const db = new DatabaseSync(dbPath);

        try {
        const projects = db
            .prepare("SELECT * FROM projects")
            .all();

        assert.equal(projects.length, 1);
        } finally {
        db.close();
        }
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    });

test("CLI memory add saves a memory to the isolated database", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "contextvault-test-")
  );

  const projectRoot = process.cwd();
  const dbPath = path.join(tempDir, "test.db");
  const cliPath = path.join(projectRoot, "src/index.ts");
  const tsxPath = path.join(
    projectRoot,
    "node_modules/tsx/dist/cli.mjs"
  );

  const env = {
    ...process.env,
    CONTEXTVAULT_DB_PATH: dbPath,
  };

  const runCLI = (args: string[]) =>
    spawnSync(
      process.execPath,
      [tsxPath, cliPath, ...args],
      {
        cwd: tempDir,
        encoding: "utf-8",
        env,
      }
    );

  try {
    // First, initialize the project
    const initResult = runCLI(["init"]);

    assert.equal(
      initResult.status,
      0,
      `Init failed:\n${initResult.stderr}\n${initResult.stdout}`
    );

    // Then add a memory
    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Integration Test Memory",
      "This memory was created through the CLI",
      "test,cli",
    ]);

    assert.equal(
      addResult.status,
      0,
      `Memory add failed:\n${addResult.stderr}\n${addResult.stdout}`
    );

    // Verify directly in SQLite
    const db = new DatabaseSync(dbPath);

    try {
      const memories = db
        .prepare(`
          SELECT title, content, type, tags
          FROM memories
        `)
        .all() as {
          title: string;
          content: string;
          type: string;
          tags: string;
        }[];

      assert.equal(memories.length, 1);

        const memory = memories[0];

        assert.ok(memory, "Expected a memory to exist");

        assert.equal(memory.title, "Integration Test Memory");
        assert.equal(
        memory.content,
        "This memory was created through the CLI"
        );
        assert.equal(memory.type, "PROJECT");
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI query retrieves a previously saved memory", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "contextvault-test-")
  );

  const projectRoot = process.cwd();
  const dbPath = path.join(tempDir, "test.db");
  const cliPath = path.join(projectRoot, "src/index.ts");
  const tsxPath = path.join(
    projectRoot,
    "node_modules/tsx/dist/cli.mjs"
  );

  const env = {
    ...process.env,
    CONTEXTVAULT_DB_PATH: dbPath,
  };

  const runCLI = (args: string[]) =>
    spawnSync(
      process.execPath,
      [tsxPath, cliPath, ...args],
      {
        cwd: tempDir,
        encoding: "utf-8",
        env,
      }
    );

  try {
    // 1. Initialize project
    const initResult = runCLI(["init"]);

    assert.equal(
      initResult.status,
      0,
      `Init failed:\n${initResult.stderr}\n${initResult.stdout}`
    );

    // 2. Add a memory
    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Query Integration Memory",
      "ContextVault retrieves relevant project memories",
      "query,integration",
    ]);

    assert.equal(
      addResult.status,
      0,
      `Memory add failed:\n${addResult.stderr}\n${addResult.stdout}`
    );

    // 3. Query the saved memory
    const queryResult = runCLI([
      "query",
      "ContextVault project memories",
    ]);

    assert.equal(
      queryResult.status,
      0,
      `Query failed:\n${queryResult.stderr}\n${queryResult.stdout}`
    );

    // 4. Verify the CLI output
    assert.ok(
      queryResult.stdout.includes("Query Integration Memory"),
      `Expected memory title in output:\n${queryResult.stdout}`
    );

    assert.ok(
      queryResult.stdout.includes(
        "ContextVault retrieves relevant project memories"
      ),
      `Expected memory content in output:\n${queryResult.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI rejects an invalid command", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "contextvault-test-")
  );

  const projectRoot = process.cwd();
  const cliPath = path.join(projectRoot, "src/index.ts");
  const tsxPath = path.join(
    projectRoot,
    "node_modules/tsx/dist/cli.mjs"
  );

  try {
    const result = spawnSync(
      process.execPath,
      [tsxPath, cliPath, "invalid-command"],
      {
        cwd: tempDir,
        encoding: "utf-8",
        env: {
          ...process.env,
          CONTEXTVAULT_DB_PATH: path.join(tempDir, "test.db"),
        },
      }
    );

    // Invalid command should return a non-zero exit code
    assert.notEqual(
      result.status,
      0,
      "Invalid command should fail"
    );

    // CLI should provide some error/help output
    const output = result.stdout + result.stderr;

    assert.ok(
      output.trim().length > 0,
      "CLI should display an error or help message"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});