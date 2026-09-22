import { test } from "node:test";
import assert from "node:assert/strict";
import {
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();

const cliPath = path.join(projectRoot, "src/index.ts");

const tsxPath = path.join(
  projectRoot,
  "node_modules/tsx/dist/cli.mjs"
);

// Reusable isolated test environment
function withTempProject(
  callback: (context: {
    tempDir: string;
    dbPath: string;
    runCLI: (
        args: string[],
        cwd?: string
        ) => SpawnSyncReturns<string>;
    openDB: () => DatabaseSync;
  }) => void
) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "contextvault-test-")
  );

  const dbPath = path.join(tempDir, "test.db");

  const runCLI = (args: string[],cwd=tempDir) =>
    spawnSync(
      process.execPath,
      [tsxPath, cliPath, ...args],
      {
        cwd,
        encoding: "utf-8",
        env: {
          ...process.env,
          CONTEXTVAULT_DB_PATH: dbPath,
        },
      }
    );

  const openDB = () => new DatabaseSync(dbPath);

  try {
    callback({
      tempDir,
      dbPath,
      runCLI,
      openDB,
    });
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

// Helper to assert CLI success
function assertCLISuccess(
  result: SpawnSyncReturns<string>,
  command: string
) {
  assert.equal(
    result.status,
    0,
    `${command} failed:\n${result.stderr}\n${result.stdout}`
  );
}

// Test 1: Init
test("CLI init creates a project in an isolated database", () => {
  withTempProject(({ dbPath, runCLI, openDB }) => {
    const result = runCLI(["init"]);

    assertCLISuccess(result, "Init");

    assert.ok(fs.existsSync(dbPath), "Database should exist");

    const db = openDB();

    try {
      const projects = db
        .prepare("SELECT * FROM projects")
        .all();

      assert.equal(projects.length, 1);
    } finally {
      db.close();
    }
  });
});

// Test 2: Memory add
test("CLI memory add saves a memory to the isolated database", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Integration Test Memory",
      "This memory was created through the CLI",
      "test,cli",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const db = openDB();

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
  });
});

// Test 3: Query retrieves saved memory
test("CLI query retrieves a previously saved memory", () => {
  withTempProject(({ runCLI }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Query Integration Memory",
      "ContextVault retrieves relevant project memories",
      "query,integration",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const queryResult = runCLI([
      "query",
      "ContextVault project memories",
    ]);

    assertCLISuccess(queryResult, "Query");

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
  });
});

// Test 4: Invalid command
test("CLI rejects an invalid command", () => {
  withTempProject(({ runCLI }) => {
    const result = runCLI(["invalid-command"]);

    assert.notEqual(
      result.status,
      0,
      "Invalid command should fail"
    );

    const output = result.stdout + result.stderr;

    assert.ok(
      output.trim().length > 0,
      "CLI should display an error or help message"
    );
  });
});

// Test 5: Invalid memory type
test("CLI rejects an invalid memory type without inserting a memory", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "UNKNOWN",
      "Invalid Type Test",
      "This memory should not be saved",
      "test",
    ]);

    assert.notEqual(
      addResult.status,
      0,
      "Invalid memory type should fail"
    );

    const db = openDB();

    try {
      const result = db
        .prepare("SELECT COUNT(*) AS count FROM memories")
        .get() as { count: number };

      assert.equal(
        result.count,
        0,
        "No memory should be inserted for an invalid type"
      );
    } finally {
      db.close();
    }
  });
});

// Test 6: Query without initialized project
test("CLI query handles a missing project gracefully", () => {
  withTempProject(({ runCLI }) => {
    const result = runCLI(["query", "test query"]);

    assert.notEqual(
      result.status,
      0,
      "Query without a project should fail"
    );

    const output = result.stdout + result.stderr;

    assert.ok(
      output.includes("No project found"),
      `Expected missing-project message:\n${output}`
    );
  });
});

// Test 7: Query without search term
test("CLI rejects query without a search term", () => {
  withTempProject(({ runCLI }) => {
    const result = runCLI(["query"]);

    assert.notEqual(
      result.status,
      0,
      "Query without a search term should fail"
    );

    const output = result.stdout + result.stderr;

    assert.ok(
      output.trim().length > 0,
      "CLI should display an error message"
    );
  });
});

//TEST 8 : memory update test
test("CLI memory update modifies an existing memory", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Original Title",
      "Original content",
      "test,cli",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const db = openDB();

    try {
      const memory = db
        .prepare("SELECT id FROM memories")
        .get() as { id: string } | undefined;

      assert.ok(memory, "Expected a memory to exist");

      const updateResult = runCLI([
        "memory",
        "update",
        memory.id,
        "--title",
        "Updated Title",
        "--content",
        "Updated content",
      ]);

      assertCLISuccess(updateResult, "Memory update");

      assert.match(
        updateResult.stdout,
        /Memory updated: Updated Title/
      );

      const updatedMemory = db
        .prepare(`
          SELECT title, content
          FROM memories
          WHERE id = ?
        `)
        .get(memory.id) as {
          title: string;
          content: string;
        } | undefined;

      assert.ok(updatedMemory, "Expected updated memory");

      assert.equal(updatedMemory.title, "Updated Title");
      assert.equal(updatedMemory.content, "Updated content");
    } finally {
      db.close();
    }
  });
});

test("CLI memory archive changes memory status to ARCHIVED", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Memory to Archive",
      "This memory will be archived",
      "test,cli",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const db = openDB();

    try {
      const memory = db
        .prepare("SELECT id FROM memories")
        .get() as { id: string } | undefined;

      assert.ok(memory, "Expected a memory to exist");

      const archiveResult = runCLI([
        "memory",
        "archive",
        memory.id,
      ]);

      assertCLISuccess(archiveResult, "Memory archive");

      assert.match(
        archiveResult.stdout,
        /Memory archived: Memory to Archive/
      );

      const archivedMemory = db
        .prepare(`
          SELECT status
          FROM memories
          WHERE id = ?
        `)
        .get(memory.id) as { status: string } | undefined;

      assert.ok(archivedMemory, "Expected archived memory");

      assert.equal(archivedMemory.status, "ARCHIVED");
    } finally {
      db.close();
    }
  });
});

test("CLI memory update rejects an invalid memory ID", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const result = runCLI([
      "memory",
      "update",
      "invalid-memory-id",
      "--title",
      "Should Not Update",
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stdout, /Memory not found\./);

    const db = openDB();

    try {
      const memories = db
        .prepare("SELECT id FROM memories")
        .all();

      assert.equal(memories.length, 0);
    } finally {
      db.close();
    }
  });
});

test("CLI prevents updating memory from another project", () => {
  withTempProject(({ runCLI, openDB, tempDir }) => {
    // Project A
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Project A init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Project A Memory",
      "Original content",
      "test,cli",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const db = openDB();

    try {
      const memory = db
        .prepare("SELECT id FROM memories")
        .get() as { id: string } | undefined;

      assert.ok(memory, "Expected Project A memory");

      // Project B: separate directory, same database
      const projectBPath = path.join(tempDir, "project-b");
      fs.mkdirSync(projectBPath);

      const projectBInit = runCLI(["init"], projectBPath);
      assertCLISuccess(projectBInit, "Project B init");

      // Attempt to update Project A memory from Project B
      const updateResult = runCLI(
        [
          "memory",
          "update",
          memory.id,
          "--title",
          "Unauthorized Update",
        ],
        projectBPath
      );

      assert.equal(updateResult.status, 1);

      assert.match(
        updateResult.stdout,
        /Memory does not belong to this project\./
      );

      // Verify original memory remains unchanged
      const savedMemory = db
        .prepare(`
          SELECT title, content
          FROM memories
          WHERE id = ?
        `)
        .get(memory.id) as {
          title: string;
          content: string;
        } | undefined;

      assert.ok(savedMemory, "Expected original memory");

      assert.equal(savedMemory.title, "Project A Memory");
      assert.equal(savedMemory.content, "Original content");
    } finally {
      db.close();
    }
  });
});

test("CLI prevents archiving memory from another project", () => {
  withTempProject(({ runCLI, openDB, tempDir }) => {
    // Project A: initialize and create a memory
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Project A init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Protected Memory",
      "This memory must remain active",
      "test,cli",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const db = openDB();

    try {
      const memory = db
        .prepare("SELECT id FROM memories")
        .get() as { id: string } | undefined;

      assert.ok(memory, "Expected Project A memory");

      // Project B: separate directory, same database
      const projectBPath = path.join(tempDir, "project-b");
      fs.mkdirSync(projectBPath);

      const projectBInit = runCLI(["init"], projectBPath);
      assertCLISuccess(projectBInit, "Project B init");

      // Attempt to archive Project A's memory from Project B
      const archiveResult = runCLI(
        ["memory", "archive", memory.id],
        projectBPath
      );

      assert.equal(archiveResult.status, 1);

      assert.match(
        archiveResult.stdout,
        /Memory does not belong to this project\./
      );

      // Verify the memory remains ACTIVE
      const savedMemory = db
        .prepare(`
          SELECT status
          FROM memories
          WHERE id = ?
        `)
        .get(memory.id) as { status: string } | undefined;

      assert.ok(savedMemory, "Expected original memory");

      assert.equal(savedMemory.status, "ACTIVE");
    } finally {
      db.close();
    }
  });
});