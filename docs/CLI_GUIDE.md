# ContextVault CLI Core

ContextVault is a project-aware memory and context management system for software projects.

It stores important project knowledge such as:

* project information
* engineering decisions
* current work
* historical knowledge
* filesystem changes
* Git activity

When a developer asks a question, ContextVault retrieves the information relevant to that question and builds a compact context package.

The current version is a **CLI-based Core Engine**.

---

## 1. What Problem Does ContextVault Solve?

When working with AI coding assistants, useful project context can be lost when:

* a new conversation is started
* the developer changes AI tools
* a development session is restarted
* an old decision needs to be remembered
* the developer has to repeatedly explain the project

For example, suppose a project originally used MongoDB but later moved to SQLite.

Without a persistent context system, an AI assistant may not know:

> "Why are we using SQLite?"

ContextVault can store the decision:

```text
Type: DECISION
Title: Database Decision
Content:
The project uses Node.js built-in SQLite instead of better-sqlite3
because better-sqlite3 caused native compilation and node-gyp issues.
Tags:
sqlite,node,node-gyp,database
```

Later, a query such as:

```bash
contextvault query "database"
```

can retrieve that information and include it in the generated context.

---

# 2. Important Concept

ContextVault is **not an AI model** and it does not give an AI permanent internal memory.

Instead:

```text
Developer
    |
    | Query
    v
ContextVault
    |
    +--> Search project memories
    |
    +--> Search relevant activities
    |
    +--> Calculate relevance
    |
    +--> Select useful information
    |
    v
Context Package
    |
    v
AI Interface
```

The current CLI version stops at the context-package stage.

AI/Chrome integration is a later layer.

---

# 3. Current Core Architecture

The current Core Engine contains several major components.

```text
ContextVault CLI
      |
      v
Project Management
      |
      +------------------+
      |                  |
      v                  v
Memory Engine       Activity Engine
      |                  |
      v                  v
Memory Retrieval   Activity Retrieval
      |                  |
      +--------+---------+
               |
               v
        Context Builder
               |
               v
     <CONTEXTVAULT_CONTEXT>
```

### Main components

| Component          | Responsibility                 |
| ------------------ | ------------------------------ |
| Project            | Identifies the current project |
| SQLite             | Persistent storage             |
| Memory Engine      | Stores project knowledge       |
| Retrieval Service  | Finds relevant memories        |
| Activity System    | Stores filesystem/Git activity |
| Activity Retrieval | Finds relevant activity        |
| Context Builder    | Builds final context           |
| CLI                | User-facing interface          |

---

# 4. Requirements

Before using ContextVault, you need:

* Node.js
* npm
* Git for Git activity features
* A project containing the ContextVault source code

From the ContextVault project directory:

```bash
npm install
```

Build the project:

```bash
npm run build
```

To make the CLI command available globally during development:

```bash
npm link
```

You can then use:

```bash
contextvault
```

---

# 5. Check Available Commands

Run:

```bash
contextvault --help
```

The CLI currently provides commands for:

```text
init
seed
sync
memory
activity
query
```

---

# 6. Project Initialization

Go to the project you want ContextVault to manage:

```bash
cd path/to/your-project
```

Then run:

```bash
contextvault init
```

Example:

```text
Initialized project: my-project
Path: C:\projects\my-project
```

### What happens?

ContextVault uses the current working directory:

```text
process.cwd()
```

and registers that directory as a project.

The project is stored in the SQLite database.

If the project has already been initialized, ContextVault reports:

```text
Project already initialized.
```

---

# 7. Demo Data

ContextVault also provides a demo-data command:

```bash
contextvault seed
```

This creates sample memories for demonstrating the system.

For example, demo memories can represent:

* frontend technology
* database decisions
* authentication strategy
* API architecture
* current work

### When should you use `seed`?

Use it when:

* learning ContextVault
* testing retrieval
* preparing a demonstration
* understanding the output format

For a real project, you normally create your own memories instead.

---

# 8. Memory System

A memory is a structured piece of project knowledge.

Each memory contains information such as:

```text
ID
Project ID
Type
Title
Content
Tags
Status
Created At
Updated At
```

ContextVault supports four memory types.

---

## 8.1 PROJECT

Use `PROJECT` for stable information about the project.

Examples:

```text
The backend uses Node.js and TypeScript.
```

```text
The frontend will use React.
```

```text
The application follows a REST API architecture.
```

Example:

```bash
contextvault memory add PROJECT "Backend Technology" "The backend uses Node.js and TypeScript." "nodejs,typescript,backend"
```

---

## 8.2 DECISION

Use `DECISION` for engineering decisions.

Examples:

```text
We selected PostgreSQL for the production database.
```

```text
Authentication will use JWT refresh tokens.
```

Example:

```bash
contextvault memory add DECISION "Authentication Strategy" "Authentication will use JWT tokens with refresh tokens for user sessions." "authentication,jwt,security"
```

Decision memories are particularly useful because they preserve **why the project follows a particular approach**.

---

## 8.3 WORKING

Use `WORKING` for the current development state.

Examples:

```text
Currently implementing the retrieval pipeline.
```

```text
The authentication middleware is unfinished.
```

Example:

```bash
contextvault memory add WORKING "Current Task" "Currently implementing the memory retrieval pipeline." "working,retrieval,development"
```

Working memories represent information that may change frequently.

---

## 8.4 HISTORY

Use `HISTORY` for useful past information.

Examples:

```text
A previous database installation caused node-gyp errors.
```

```text
The project previously used MongoDB.
```

Example:

```bash
contextvault memory add HISTORY "SQLite Installation Issue" "better-sqlite3 caused native compilation and node-gyp problems, so the project moved to Node's built-in SQLite API." "sqlite,node-gyp,history"
```

---

# 9. Memory Status

A memory can have different lifecycle states.

```text
ACTIVE
SUPERSEDED
ARCHIVED
```

## ACTIVE

The information is currently valid.

Example:

```text
Authentication uses JWT.
```

It appears under:

```text
CURRENT CONTEXT
```

---

## SUPERSEDED

The information was once valid but has been replaced by a newer decision.

Example:

```text
Old decision:
The project uses MongoDB.

New decision:
The project uses SQLite.
```

The old memory can become:

```text
SUPERSEDED
```

It then appears under:

```text
HISTORICAL CONTEXT
```

This is important because ContextVault does not need to erase useful history just because a decision changed.

Change status using:

```bash
contextvault memory status <MEMORY_ID> SUPERSEDED
```

To make it active again:

```bash
contextvault memory status <MEMORY_ID> ACTIVE
```

---

## ARCHIVED

Archived memories are no longer included in normal retrieval.

Archive a memory with:

```bash
contextvault memory archive <MEMORY_ID>
```

Use archive when the information is no longer useful.

---

# 10. Listing Memories

To view memories stored for the current project:

```bash
contextvault memory list
```

This is useful when you need a memory ID for operations such as:

```bash
contextvault memory update <MEMORY_ID>
```

or:

```bash
contextvault memory archive <MEMORY_ID>
```

---

# 11. Updating a Memory

A memory can be updated using its ID.

Basic form:

```bash
contextvault memory update <MEMORY_ID> [options]
```

Available fields include:

```text
--title
--content
--tags
--type
```

### Update title

```bash
contextvault memory update MEMORY_ID --title "Updated Title"
```

### Update content

```bash
contextvault memory update MEMORY_ID --content "Updated project information."
```

### Update tags

```bash
contextvault memory update MEMORY_ID --tags "backend,nodejs,api"
```

### Change memory type

```bash
contextvault memory update MEMORY_ID --type DECISION
```

Multiple fields can be updated together:

```bash
contextvault memory update MEMORY_ID --title "API Decision" --content "The backend uses REST APIs." --tags "api,rest,backend"
```

At least one field must be provided.

---

# 12. Adding Tags

Tags help retrieval identify relevant memories.

Example:

```text
Title:
Authentication Strategy

Tags:
authentication,jwt,security
```

A query containing:

```text
authentication
```

can therefore match the memory through its title, content, or tags.

Tags should be short and meaningful.

Good:

```text
sqlite,node,database
```

Less useful:

```text
thing,new,test,stuff
```

---

# 13. Synchronizing Project Activity

ContextVault can collect project activity using:

```bash
contextvault sync
```

The current synchronization system handles two major activity sources:

```text
FILESYSTEM
GIT
```

---

## 13.1 Filesystem Activity

ContextVault maintains file snapshots and compares the current project state with the previous snapshot.

It can detect changes such as:

```text
CREATED
MODIFIED
DELETED
```

The activity can contain information such as:

```text
File path
Change type
Previous snapshot
Current snapshot
File size
Modification time
```

This allows ContextVault to understand recent changes to the project.

---

## 13.2 Git Activity

If the project is a Git repository, synchronization also reads recent commits.

Git activity can contain:

```text
Commit message
Commit hash
Changed files
```

ContextVault avoids creating duplicate activities for the same commit.

---

# 14. Viewing Activities

List activities:

```bash
contextvault activity list
```

Limit the number of activities:

```bash
contextvault activity list --limit 5
```

Show only Git commits:

```bash
contextvault activity list --type COMMIT
```

Show only filesystem changes:

```bash
contextvault activity list --type FILE_CHANGE
```

Combine filters:

```bash
contextvault activity list --type FILE_CHANGE --limit 3
```

Supported activity types:

```text
COMMIT
FILE_CHANGE
```

---

# 15. Querying ContextVault

The most important command is:

```bash
contextvault query "<question>"
```

Example:

```bash
contextvault query "authentication"
```

or:

```bash
contextvault query "database"
```

or:

```bash
contextvault query "backend architecture"
```

---

# 16. What Happens During a Query?

Suppose you run:

```bash
contextvault query "database"
```

Internally, the process is approximately:

```text
Query
  |
  v
Keyword extraction
  |
  v
Memory retrieval
  |
  v
Relevance scoring
  |
  v
Activity retrieval
  |
  v
Context Builder
  |
  v
Final Context
```

ContextVault does not simply return every memory.

It tries to identify information related to the query.

---

# 17. Relevance Scoring

The current retrieval system considers several signals.

For memories, relevance can come from:

* title matches
* tag matches
* content matches
* active status
* query-term coverage
* term/document frequency
* specific terms

For example:

```text
Query:
database authentication
```

A memory titled:

```text
Database Decision
```

is more relevant to the database portion of the query than an unrelated memory.

The system then ranks results and applies a relevance cutoff so weakly related results are not unnecessarily included.

The current implementation is **keyword/scoring based**, not embedding-based semantic search.

Semantic retrieval is a future enhancement.

---

# 18. Context Output

The final query result is wrapped inside:

```text
<CONTEXTVAULT_CONTEXT>
...
</CONTEXTVAULT_CONTEXT>
```

The context contains several sections.

---

## PROJECT

Contains basic project information:

```text
PROJECT
Name: contextvault
Path: C:\Users\...\contextvault
```

---

## CURRENT CONTEXT

Contains relevant active memories.

Example:

```text
CURRENT CONTEXT

[DECISION]
Title: Authentication Strategy
Tags: authentication, jwt, security
Content:
Authentication will use JWT tokens with refresh tokens for user sessions.
```

These represent information currently considered valid.

---

## HISTORICAL CONTEXT

Contains relevant superseded memories.

Example:

```text
HISTORICAL CONTEXT

[DECISION]
Title: Old Database Decision
Status: SUPERSEDED
Tags: database, mongodb
Content:
The project previously used MongoDB.
```

This lets an AI or developer understand previous approaches without confusing them with the current decision.

---

## RELEVANT ACTIVITIES

Contains relevant project activity.

Example:

```text
RELEVANT ACTIVITIES

[COMMIT | GIT]
Title: Add database repository
Commit Hash: ...
Changed Files: ...
Date: ...
Relevance Score: ...
```

This gives ContextVault a view of **what happened in the project**, in addition to what has been explicitly stored as memory.

---

# 19. Context Size Protection

ContextVault does not allow the generated context to grow indefinitely.

The current Context Builder has a maximum context size of:

```text
12,000 characters
```

It also limits the number of entries included in each section.

Current limits include:

```text
Active memories:       5
Superseded memories:   5
Activities:           10
```

The purpose is to keep the generated context compact enough for future AI integration.

---

# 20. Recommended Beginner Workflow

For a new project, the basic workflow is:

```text
1. Open project
       ↓
2. Initialize ContextVault
       ↓
3. Add important memories
       ↓
4. Sync project activity
       ↓
5. Query ContextVault
       ↓
6. Review generated context
```

Commands:

```bash
cd my-project

contextvault init

contextvault memory add PROJECT "Project Stack" "Backend uses Node.js and TypeScript." "nodejs,typescript"

contextvault memory add DECISION "Database Decision" "The project uses SQLite for the MVP." "sqlite,database"

contextvault memory add WORKING "Current Task" "Currently implementing authentication." "authentication,working"

contextvault sync

contextvault query "authentication"
```

---

# 21. Example: Decision Lifecycle

Suppose the project initially uses MongoDB.

Create:

```bash
contextvault memory add DECISION "Database Decision" "The project uses MongoDB." "database,mongodb"
```

Later the project moves to SQLite.

Create a new decision:

```bash
contextvault memory add DECISION "Database Decision" "The project uses SQLite." "database,sqlite"
```

Then mark the old memory as superseded:

```bash
contextvault memory status OLD_MEMORY_ID SUPERSEDED
```

Now ContextVault can represent:

```text
CURRENT CONTEXT
    |
    +-- SQLite decision

HISTORICAL CONTEXT
    |
    +-- Previous MongoDB decision
```

This is one of the important concepts of the ContextVault memory model.

---

# 22. Example: Project Activity + Memory

Imagine you add a memory:

```text
DECISION
Title: Authentication Strategy
Content:
Authentication uses JWT refresh tokens.
```

Then you modify:

```text
src/auth/middleware.ts
src/auth/token.service.ts
```

and commit the changes.

After:

```bash
contextvault sync
```

ContextVault can have both:

```text
Memory:
Authentication Strategy
```

and:

```text
Activity:
Git commit modifying authentication files
```

A query such as:

```bash
contextvault query "authentication"
```

can therefore combine stored project knowledge with relevant project activity.

---

# 23. Useful Commands — Quick Reference

| Command                                         | Purpose                             |
| ----------------------------------------------- | ----------------------------------- |
| `contextvault --help`                           | Show CLI help                       |
| `contextvault init`                             | Initialize current project          |
| `contextvault seed`                             | Add demo memories                   |
| `contextvault sync`                             | Synchronize filesystem/Git activity |
| `contextvault memory add ...`                   | Create memory                       |
| `contextvault memory list`                      | List memories                       |
| `contextvault memory update ...`                | Update memory                       |
| `contextvault memory archive <ID>`              | Archive memory                      |
| `contextvault memory status <ID> ACTIVE`        | Activate memory                     |
| `contextvault memory status <ID> SUPERSEDED`    | Mark memory superseded              |
| `contextvault activity list`                    | List activities                     |
| `contextvault activity list --limit N`          | Limit activities                    |
| `contextvault activity list --type COMMIT`      | Show commits                        |
| `contextvault activity list --type FILE_CHANGE` | Show file changes                   |
| `contextvault query "..."`                      | Retrieve project context            |

---

# 24. Common Beginner Mistakes

### Mistake 1 — Running commands outside the project

ContextVault identifies the project using the current working directory.

Therefore, first:

```bash
cd my-project
```

then:

```bash
contextvault query "database"
```

---

### Mistake 2 — Forgetting `init`

If ContextVault says:

```text
No project found.
```

initialize the current project:

```bash
contextvault init
```

---

### Mistake 3 — Using invalid memory types

Valid memory types are:

```text
PROJECT
DECISION
WORKING
HISTORY
```

For example:

```bash
contextvault memory add PROJECT ...
```

not:

```bash
contextvault memory add NOTE ...
```

---

### Mistake 4 — Writing vague memories

Prefer:

```text
The backend uses JWT refresh tokens for session authentication.
```

over:

```text
Authentication stuff.
```

Good memories contain information that another developer or AI can actually use.

---

### Mistake 5 — Treating `SUPERSEDED` as deleted

A superseded memory is **historical information**, not deleted information.

Use:

```text
SUPERSEDED
```

when a newer decision replaces an old one.

Use:

```text
ARCHIVED
```

when you no longer want the memory to participate in normal retrieval.

---

# 25. What ContextVault Currently Is

The current implementation is:

```text
A CLI-based persistent project context engine
```

It provides:

* project registration
* SQLite persistence
* structured project memories
* memory lifecycle
* keyword-based retrieval
* relevance scoring
* filesystem activity tracking
* Git activity tracking
* activity retrieval
* context generation
* context size control
* CLI-based end-to-end workflow
* automated tests

---

# 26. What ContextVault Is Not Yet

The current Core does **not** yet provide:

* Chrome Extension
* VS Code Extension
* direct AI chat integration
* semantic/embedding search
* automatic decision detection
* automatic memory extraction from conversations
* advanced freshness/confidence scoring
* multi-AI adapters

These belong to later development phases.

The Core Engine is intentionally kept independent from those interfaces.

---

# 27. Current Architecture Boundary

The current system ends here:

```text
Developer
    |
    v
ContextVault CLI
    |
    v
Core Engine
    |
    v
Generated Context
```

The next architectural layer will be:

```text
ContextVault Core
       |
       v
   AI Adapter
       |
       +----> Chrome Extension
       |
       +----> Future AI interfaces
```

This separation keeps the Core independent from a particular AI provider or interface.

---

# 28. The Main Idea in One Example

Without ContextVault:

```text
Developer
    |
    v
New AI chat
    |
    v
"Let me explain my project again..."
```

With ContextVault:

```text
Developer
    |
    | "How does authentication work?"
    v
ContextVault
    |
    +--> Authentication decision
    +--> Relevant current work
    +--> Relevant Git/file activity
    |
    v
Compact project context
    |
    v
AI interface
```

The goal is not to send the entire project to the AI.

The goal is:

> **Retrieve the right context at the right time.**

---

# 29. Current Core Status

The CLI Core Engine currently provides a complete end-to-end workflow:

```text
Project
   ↓
Memory
   ↓
Activity
   ↓
Retrieval
   ↓
Relevance Scoring
   ↓
Context Builder
   ↓
Generated Context
```

The next major phase is to connect this Core Engine to an external interface through an adapter layer.
