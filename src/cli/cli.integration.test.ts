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

test("CLI memory list displays memories for the current project", () => {
  withTempProject(({ runCLI }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "DECISION",
      "Database Decision",
      "ContextVault uses SQLite",
      "database,architecture",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const secondAddResult = runCLI([
      "memory",
      "add",
      "WORKING",
      "Current Task",
      "Implementing CLI integration tests",
      "testing,cli",
    ]);

    assertCLISuccess(secondAddResult, "Second memory add");

    const listResult = runCLI(["memory", "list"]);

    assertCLISuccess(listResult, "Memory list");

    // Verify project heading
    assert.match(listResult.stdout, /Memories for:/);

    // Verify first memory details
    assert.match(
      listResult.stdout,
      /\[DECISION\] Database Decision/
    );
    assert.match(
      listResult.stdout,
      /ContextVault uses SQLite/
    );
    assert.match(
      listResult.stdout,
      /Tags: database, architecture/
    );

    // Verify second memory details
    assert.match(
      listResult.stdout,
      /\[WORKING\] Current Task/
    );
    assert.match(
      listResult.stdout,
      /Implementing CLI integration tests/
    );
    assert.match(
      listResult.stdout,
      /Tags: testing, cli/
    );
  });
});

test("CLI memory list handles a project with no memories", () => {
  withTempProject(({ runCLI }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const listResult = runCLI(["memory", "list"]);

    assertCLISuccess(listResult, "Memory list");

    assert.match(
      listResult.stdout,
      /No memories found\./
    );
  });
});

test("CLI memory list rejects when no project is initialized", () => {
  withTempProject(({ runCLI }) => {
    // Intentionally skip init
    const result = runCLI(["memory", "list"]);

    assert.equal(result.status, 1);

    assert.match(
      result.stdout,
      /No project found\. Run: contextvault init/
    );
  });
});

test("CLI memory update rejects an invalid type without modifying memory", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "Type Validation Test",
      "Original memory content",
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
        "--type",
        "INVALID",
      ]);

      assert.equal(updateResult.status, 1);

      assert.match(
        updateResult.stdout,
        /Invalid memory type/
      );

      // Verify the original type remains unchanged
      const savedMemory = db
        .prepare(`
          SELECT type
          FROM memories
          WHERE id = ?
        `)
        .get(memory.id) as { type: string } | undefined;

      assert.ok(savedMemory, "Expected original memory");

      assert.equal(savedMemory.type, "PROJECT");
    } finally {
      db.close();
    }
  });
});

test("CLI memory update rejects a missing title value", () => {
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
      ]);

      assert.equal(updateResult.status, 1);

      assert.match(
        updateResult.stdout,
        /Please provide at least one field to update\./
      );

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

      assert.equal(savedMemory.title, "Original Title");
      assert.equal(savedMemory.content, "Original content");
    } finally {
      db.close();
    }
  });
});

test("CLI memory update rejects an unknown option without modifying memory", () => {
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
        "--name",
        "Unexpected Value",
      ]);

      assert.equal(updateResult.status, 1);

      assert.match(
        updateResult.stdout,
        /Unknown option: --name/
      );

      const savedMemory = db
        .prepare(`
          SELECT title, content, type
          FROM memories
          WHERE id = ?
        `)
        .get(memory.id) as {
          title: string;
          content: string;
          type: string;
        } | undefined;

      assert.ok(savedMemory, "Expected original memory");

      assert.equal(savedMemory.title, "Original Title");
      assert.equal(savedMemory.content, "Original content");
      assert.equal(savedMemory.type, "PROJECT");
    } finally {
      db.close();
    }
  });
});

test("CLI memory archive rejects an invalid memory ID", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const archiveResult = runCLI([
      "memory",
      "archive",
      "invalid-memory-id",
    ]);

    assert.equal(archiveResult.status, 1);

    assert.match(
      archiveResult.stdout,
      /Memory not found\./
    );

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

test("CLI memory archive rejects a missing memory ID", () => {
  withTempProject(({ runCLI }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const archiveResult = runCLI(["memory", "archive"]);

    assert.equal(archiveResult.status, 1);
    assert.match(archiveResult.stdout, /Usage:/);
  });
});

test("CLI memory archive rejects when no project is initialized", () => {
  withTempProject(({ runCLI }) => {
    const archiveResult = runCLI([
      "memory",
      "archive",
      "some-memory-id",
    ]);

    assert.equal(archiveResult.status, 1);
    assert.match(archiveResult.stdout, /No project found/);
  });
});

test("CLI query excludes archived memories", () => {
  withTempProject(({ runCLI, openDB }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const addResult = runCLI([
      "memory",
      "add",
      "HISTORY",
      "ArchivedQueryUnique",
      "This memory contains archivedquerytoken for retrieval testing.",
      "testing",
    ]);

    assertCLISuccess(addResult, "Memory add");

    const db = openDB();

    let memoryId: string;

    try {
      const memory = db
        .prepare(
          "SELECT id FROM memories WHERE title = ?"
        )
        .get("ArchivedQueryUnique") as
        | { id: string }
        | undefined;

      assert.ok(memory, "Memory should exist in database");
      memoryId = memory.id;
    } finally {
      db.close();
    }

    const archiveResult = runCLI([
      "memory",
      "archive",
      memoryId,
    ]);

    assertCLISuccess(archiveResult, "Memory archive");

    const queryResult = runCLI([
      "query",
      "archivedquerytoken",
    ]);

    assert.equal(queryResult.status, 0);
    assert.doesNotMatch(
      queryResult.stdout,
      /ArchivedQueryUnique/
    );
  });
});

test("CLI query excludes unrelated memories", () => {
  withTempProject(({ runCLI }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const matchingMemory = runCLI([
      "memory",
      "add",
      "HISTORY",
      "UniqueRedisSetup",
      "Redis caching configuration for backend performance.",
      "redis",
    ]);

    assertCLISuccess(matchingMemory, "Matching memory add");

    const unrelatedMemory = runCLI([
      "memory",
      "add",
      "HISTORY",
      "UniqueGardenNotes",
      "Gardening tips for growing roses and tulips.",
      "garden",
    ]);

    assertCLISuccess(unrelatedMemory, "Unrelated memory add");

    const queryResult = runCLI([
      "query",
      "redis",
    ]);

    assert.equal(queryResult.status, 0);
    assert.match(queryResult.stdout, /UniqueRedisSetup/);
    assert.doesNotMatch(queryResult.stdout, /UniqueGardenNotes/);
  });
});

test("CLI query ranks title matches above content matches", () => {
  withTempProject(({ runCLI }) => {
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    const contentMatch = runCLI([
      "memory",
      "add",
      "HISTORY",
      "BackendNotes",
      "Notes about caching strategies for backend systems.",
      "backend",
    ]);
    
    assertCLISuccess(contentMatch, "Content match add");

    const titleMatch = runCLI([
      "memory",
      "add",
      "HISTORY",
      "Caching Architecture",
      "Architecture notes for a backend service.",
      "architecture",
    ]);

    assertCLISuccess(titleMatch, "Title match add");

    const queryResult = runCLI(["query", "caching"]);

    assert.equal(queryResult.status, 0);

    const titleIndex = queryResult.stdout.indexOf(
      "Caching Architecture"
    );

    const contentIndex = queryResult.stdout.indexOf(
      "BackendNotes"
    );

    assert.ok(titleIndex !== -1, "Title match should appear");
    assert.ok(contentIndex !== -1, "Content match should appear");

    assert.ok(
      titleIndex < contentIndex,
      "Title match should appear before content match"
    );
  });
});

test("CLI filesystem sync establishes an initial baseline", () => {
  withTempProject(({ tempDir, runCLI }) => {
    // Create a file in the temporary project
    fs.writeFileSync(
      path.join(tempDir, "notes.txt"),
      "ContextVault filesystem sync test"
    );

    // Initialize ContextVault project
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    // Run the first sync
    const syncResult = runCLI(["sync"]);

    assert.equal(syncResult.status, 0);

    assert.match(
      syncResult.stdout,
      /Initial scan complete\./
    );

    // At least the created notes.txt should be indexed
    const match = syncResult.stdout.match(
      /Initial scan complete\. (\d+) files indexed\./
    );

    assert.ok(match, "Initial scan count should be printed");

    const indexedCount = Number(match[1]);

    assert.ok(
      indexedCount >= 1,
      "At least one file should be indexed"
    );
  });
});

test("CLI filesystem sync records a modified file", () => {
  withTempProject(({ tempDir, runCLI }) => {
    const filePath = path.join(tempDir, "sync-notes.txt");

    // Create file before initial scan
    fs.writeFileSync(filePath, "Initial content");

    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    // First sync establishes baseline
    const firstSync = runCLI(["sync"]);
    assertCLISuccess(firstSync, "Initial sync");

    assert.match(firstSync.stdout, /Initial scan complete\./);

    // Modify file after baseline
    fs.writeFileSync(
      filePath,
      "Updated content with additional filesystem sync data"
    );

    // Second sync should detect modification
    const secondSync = runCLI(["sync"]);
    assertCLISuccess(secondSync, "Second sync");

    assert.match(
      secondSync.stdout,
      /Filesystem sync complete\./
    );

    assert.match(
      secondSync.stdout,
      /Filesystem sync complete\.\s+\d+ new activities\./
    );
    // Verify activity appears in CLI output
    const activityResult = runCLI(["activity", "list"]);

    assertCLISuccess(activityResult, "Activity list");

    assert.match(activityResult.stdout, /FILE_CHANGE/);
    assert.match(activityResult.stdout, /sync-notes\.txt/);
    assert.match(activityResult.stdout, /MODIFIED/);
  });
});

test("CLI filesystem sync records a deleted file", () => {
  withTempProject(({ tempDir, runCLI }) => {
    const filePath = path.join(
      tempDir,
      "deletion-test-file.txt"
    );

    fs.writeFileSync(filePath, "File to be deleted");

    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    // Establish initial baseline
    const firstSync = runCLI(["sync"]);
    assertCLISuccess(firstSync, "Initial sync");

    assert.match(firstSync.stdout, /Initial scan complete\./);

    // Delete file after baseline
    fs.unlinkSync(filePath);

    // Sync should detect deletion
    const secondSync = runCLI(["sync"]);
    assertCLISuccess(secondSync, "Second sync");

    assert.match(
      secondSync.stdout,
      /Filesystem sync complete\./
    );

    // Verify the deleted file was recorded as an activity
    const activityResult = runCLI(["activity", "list"]);
    assertCLISuccess(activityResult, "Activity list");

    assert.match(
      activityResult.stdout,
      /FILE_CHANGE/
    );

    assert.match(
      activityResult.stdout,
      /deletion-test-file\.txt/
    );

    assert.match(
      activityResult.stdout,
      /DELETED/
    );
  });
});

test("CLI filesystem sync does not duplicate activities for unchanged files", () => {
  withTempProject(({ tempDir, runCLI }) => {
    const filePath = path.join(
      tempDir,
      "duplicate-sync-test.txt"
    );

    fs.writeFileSync(filePath, "Initial content");

    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    // Establish baseline
    const firstSync = runCLI(["sync"]);
    assertCLISuccess(firstSync, "Initial sync");

    // Modify file and sync the change
    fs.writeFileSync(
      filePath,
      "Modified content for duplicate activity test"
    );

    const secondSync = runCLI(["sync"]);
    assertCLISuccess(secondSync, "Second sync");

    assert.match(
      secondSync.stdout,
      /Filesystem sync complete\./
    );

    // Run sync again without changing any files
    const thirdSync = runCLI(["sync"]);
    assertCLISuccess(thirdSync, "Third sync");
    assert.match(
      thirdSync.stdout,
      /Filesystem sync complete\. 0 new activities\./
    );
  });
});

test("CLI sync reports failure when snapshot saving fails", () => {
  withTempProject(({ tempDir, runCLI, openDB }) => {
    // 1. Initialize project
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    // 2. Create a file so sync has a snapshot to save
    fs.writeFileSync(
      path.join(tempDir, "trigger-test.txt"),
      "Test sync failure"
    );

    // 3. Force snapshot insertion to fail
    const db = openDB();

    try {
      db.exec(`
        CREATE TRIGGER force_snapshot_failure
        BEFORE INSERT ON file_snapshots
        BEGIN
          SELECT RAISE(ABORT, 'forced sync failure');
        END;
      `);
    } finally {
      db.close();
    }

    // 4. Run sync
    const syncResult = runCLI(["sync"]);

    // 5. Verify CLI error handling
    assert.equal(
      syncResult.status,
      1,
      `Expected sync to fail:\n${syncResult.stdout}\n${syncResult.stderr}`
    );

    assert.match(syncResult.stderr, /Sync failed\./);
    assert.match(syncResult.stderr, /forced sync failure/i);
  });
});

test("CLI completes init, memory add, sync, and query workflow", () => {
  withTempProject(({ tempDir, runCLI }) => {
    // 1. Create a project file
    fs.writeFileSync(
      path.join(tempDir, "README.md"),
      "ContextVault end-to-end workflow test"
    );

    // 2. Initialize ContextVault
    const initResult = runCLI(["init"]);
    assertCLISuccess(initResult, "Init");

    // 3. Add a memory
    const addResult = runCLI([
      "memory",
      "add",
      "PROJECT",
      "E2E Workflow Memory",
      "ContextVault stores and retrieves project knowledge",
      "e2e,workflow",
    ]);

    assertCLISuccess(addResult, "Memory add");

    // 4. Sync project
    const syncResult = runCLI(["sync"]);
    assertCLISuccess(syncResult, "Sync");

    // 5. Query the saved memory
    const queryResult = runCLI([
      "query",
      "project knowledge",
    ]);

    assertCLISuccess(queryResult, "Query");

    assert.ok(
      queryResult.stdout.includes("E2E Workflow Memory"),
      `Expected memory in query output:\n${queryResult.stdout}`
    );
  });
});