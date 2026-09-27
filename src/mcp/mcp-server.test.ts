import { test } from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryTransport,
} from "@modelcontextprotocol/server";

import {
  Client,
} from "@modelcontextprotocol/client";

import { createMcpServer } from "./mcp-server.js";

async function createConnectedMcpClient() {
  const server = createMcpServer();

  const client = new Client({
    name: "contextvault-test-client",
    version: "1.0.0",
  });

  const [
    clientTransport,
    serverTransport,
  ] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return {
    client,
    server,
  };
}
test("MCP server exposes contextvault_list_projects", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.listTools();

    const tool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_list_projects"
      );

    assert.ok(tool);

    assert.equal(
      tool.annotations?.readOnlyHint,
      true
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP project list returns registered projects", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_list_projects",
        arguments: {},
      });

    assert.equal(
      result.isError,
      undefined
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const projects =
      JSON.parse(textContent.text);

    assert.ok(
      Array.isArray(projects)
    );

    const project =
      projects.find(
        item =>
          item.id ===
          "ab8fb478-efa7-47ef-ad90-b8563276fcf8"
      );

    assert.ok(
      project,
      "Expected registered ContextVault project"
    );

    assert.equal(
      project.name,
      "contextvault"
    );

    assert.ok(
      project.rootPath
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP server exposes contextvault_get_context", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.listTools();

    const tool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_get_context"
      );

    assert.ok(tool);

    assert.equal(
      tool.annotations?.readOnlyHint,
      true
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP context tool returns project context", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_get_context",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          query: "authentication",
          accessLevel: "READ",
        },
      });

    assert.equal(
      result.isError,
      undefined
    );

    assert.ok(
      Array.isArray(result.content)
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const response =
      JSON.parse(textContent.text);

    assert.equal(
      response.project.id,
      "ab8fb478-efa7-47ef-ad90-b8563276fcf8"
    );

    assert.equal(
      response.query,
      "authentication"
    );

    assert.ok(
      Array.isArray(response.items)
    );

    assert.ok(
      response.generatedAt
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP context tool rejects unknown project", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_get_context",
        arguments: {
          projectId:
            "00000000-0000-0000-0000-000000000000",
          query: "authentication",
        },
      });

    assert.equal(
      result.isError,
      true
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    assert.match(
      textContent.text,
      /Project not found/
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP context tool allows WRITE trust level for read operation", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_get_context",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          query: "authentication",
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      result.isError,
      undefined
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const response =
      JSON.parse(textContent.text);

    assert.equal(
      response.query,
      "authentication"
    );

    assert.ok(
      Array.isArray(response.items)
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP context tool respects maxItems", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_get_context",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          query: "authentication",
          maxItems: 1,
        },
      });

    assert.equal(
      result.isError,
      undefined
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const response =
      JSON.parse(textContent.text);

    assert.ok(
      response.items.length <= 1
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP context tool allows higher trust levels for read operation", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_get_context",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          query: "authentication",
          accessLevel: "PROPOSE",
        },
      });

    assert.equal(
      result.isError,
      undefined
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const response =
      JSON.parse(textContent.text);

    assert.equal(
      response.query,
      "authentication"
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP server exposes contextvault_create_memory", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.listTools();

    const tool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_create_memory"
      );

    assert.ok(tool);

    assert.equal(
      tool.annotations?.readOnlyHint,
      false
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP create memory rejects insufficient trust level", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_create_memory",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          type: "WORKING",
          title:
            "MCP Trust Test",
          content:
            "This memory must not be created.",
          accessLevel: "PROPOSE",
        },
      });

    assert.equal(
      result.isError,
      true
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    assert.match(
      textContent.text,
      /requires WRITE access/
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP create memory creates memory with WRITE access", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_create_memory",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          type: "WORKING",
          title:
            `MCP Write Test ${Date.now()}`,
          content:
            "Created through the MCP write capability.",
          tags: [
            "mcp",
            "write-test",
          ],
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      result.isError,
      undefined
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const memory =
      JSON.parse(textContent.text);

    assert.ok(memory.id);
    assert.equal(
      memory.projectId,
      "ab8fb478-efa7-47ef-ad90-b8563276fcf8"
    );
    assert.equal(
      memory.type,
      "WORKING"
    );
    assert.match(
      memory.title,
      /^MCP Write Test /
    );
    assert.equal(
      memory.content,
      "Created through the MCP write capability."
    );
    assert.deepEqual(
      memory.tags,
      ["mcp", "write-test"]
    );
    assert.equal(
      memory.status,
      "ACTIVE"
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP server exposes memory mutation tools", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.listTools();

    const updateTool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_update_memory"
      );

    const archiveTool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_archive_memory"
      );

    assert.ok(updateTool);
    assert.ok(archiveTool);

    assert.equal(
      updateTool.annotations?.readOnlyHint,
      false
    );

    assert.equal(
      archiveTool.annotations?.readOnlyHint,
      false
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP update memory rejects insufficient trust level", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_update_memory",
        arguments: {
          memoryId:
            "00000000-0000-0000-0000-000000000000",
          content:
            "This must not be updated.",
          accessLevel: "PROPOSE",
        },
      });

    assert.equal(
      result.isError,
      true
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    assert.match(
      textContent.text,
      /requires WRITE access/
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP archive memory rejects insufficient trust level", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.callTool({
        name: "contextvault_archive_memory",
        arguments: {
          memoryId:
            "00000000-0000-0000-0000-000000000000",
          accessLevel: "PROPOSE",
        },
      });

    assert.equal(
      result.isError,
      true
    );

    const textContent =
      result.content.find(
        item => item.type === "text"
      );

    assert.ok(textContent);

    if (
      textContent.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    assert.match(
      textContent.text,
      /requires WRITE access/
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP can update and archive a memory with WRITE access", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const createResult =
      await client.callTool({
        name: "contextvault_create_memory",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          type: "WORKING",
          title:
            `MCP Mutation Test ${Date.now()}`,
          content:
            "Original memory content.",
          tags: ["mcp", "mutation"],
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      createResult.isError,
      undefined
    );

    const createText =
      createResult.content.find(
        item => item.type === "text"
      );

    assert.ok(createText);

    if (
      createText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const createdMemory =
      JSON.parse(createText.text);

    const updateResult =
      await client.callTool({
        name: "contextvault_update_memory",
        arguments: {
          memoryId:
            createdMemory.id,
          content:
            "Updated memory content.",
          tags: [
            "mcp",
            "mutation",
            "updated",
          ],
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      updateResult.isError,
      undefined
    );

    const updateText =
      updateResult.content.find(
        item => item.type === "text"
      );

    assert.ok(updateText);

    if (
      updateText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const updatedMemory =
      JSON.parse(updateText.text);

    assert.equal(
      updatedMemory.id,
      createdMemory.id
    );

    assert.equal(
      updatedMemory.content,
      "Updated memory content."
    );

    assert.deepEqual(
      updatedMemory.tags,
      [
        "mcp",
        "mutation",
        "updated",
      ]
    );

    const archiveResult =
      await client.callTool({
        name: "contextvault_archive_memory",
        arguments: {
          memoryId:
            createdMemory.id,
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      archiveResult.isError,
      undefined
    );

    const archiveText =
      archiveResult.content.find(
        item => item.type === "text"
      );

    assert.ok(archiveText);

    if (
      archiveText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const archivedMemory =
      JSON.parse(archiveText.text);

    assert.equal(
      archivedMemory.id,
      createdMemory.id
    );

    assert.equal(
      archivedMemory.status,
      "ARCHIVED"
    );
  } finally {
    await client.close();
    await server.close();
  }
});
test("MCP server exposes proposal tools", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const result =
      await client.listTools();

    const proposeTool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_propose_memory_update"
      );

    const approveTool =
      result.tools.find(
        item =>
          item.name ===
          "contextvault_approve_memory_proposal"
      );

    assert.ok(proposeTool);
    assert.ok(approveTool);

    assert.equal(
      proposeTool.annotations?.readOnlyHint,
      false
    );

    assert.equal(
      approveTool.annotations?.readOnlyHint,
      false
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP can create a memory proposal without changing the memory", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const createResult =
      await client.callTool({
        name: "contextvault_create_memory",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          type: "WORKING",
          title:
            `MCP Proposal Test ${Date.now()}`,
          content:
            "Original proposal memory.",
          tags: ["proposal"],
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      createResult.isError,
      undefined
    );

    const createText =
      createResult.content.find(
        item => item.type === "text"
      );

    assert.ok(createText);

    if (
      createText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const memory =
      JSON.parse(createText.text);

    const proposalResult =
      await client.callTool({
        name:
          "contextvault_propose_memory_update",
        arguments: {
          memoryId: memory.id,
          content:
            "Proposed new content.",
          accessLevel: "PROPOSE",
        },
      });

    assert.equal(
      proposalResult.isError,
      undefined
    );

    const proposalText =
      proposalResult.content.find(
        item => item.type === "text"
      );

    assert.ok(proposalText);

    if (
      proposalText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const proposal =
      JSON.parse(proposalText.text);

    assert.ok(proposal.id);

    assert.equal(
      proposal.memoryId,
      memory.id
    );

    assert.equal(
      proposal.content,
      "Proposed new content."
    );

    assert.equal(
      proposal.status,
      "PENDING"
    );

    assert.equal(
      proposalResult.isError,
      undefined
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP proposal cannot be approved without WRITE access", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const createResult =
      await client.callTool({
        name: "contextvault_create_memory",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          type: "WORKING",
          title:
            `MCP Proposal Trust Test ${Date.now()}`,
          content:
            "Original content.",
          accessLevel: "WRITE",
        },
      });

    const createText =
      createResult.content.find(
        item => item.type === "text"
      );

    assert.ok(createText);

    if (
      createText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const memory =
      JSON.parse(createText.text);

    const proposalResult =
      await client.callTool({
        name:
          "contextvault_propose_memory_update",
        arguments: {
          memoryId: memory.id,
          content:
            "Proposed content.",
          accessLevel: "PROPOSE",
        },
      });

    const proposalText =
      proposalResult.content.find(
        item => item.type === "text"
      );

    assert.ok(proposalText);

    if (
      proposalText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const proposal =
      JSON.parse(proposalText.text);

    const approveResult =
      await client.callTool({
        name:
          "contextvault_approve_memory_proposal",
        arguments: {
          proposalId: proposal.id,
          accessLevel: "PROPOSE",
        },
      });

    assert.equal(
      approveResult.isError,
      true
    );

    const approveText =
      approveResult.content.find(
        item => item.type === "text"
      );

    assert.ok(approveText);

    if (
      approveText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    assert.match(
      approveText.text,
      /requires WRITE access/
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP can approve a pending memory proposal with WRITE access", async () => {
  const {
    client,
    server,
  } = await createConnectedMcpClient();

  try {
    const createResult =
      await client.callTool({
        name: "contextvault_create_memory",
        arguments: {
          projectId:
            "ab8fb478-efa7-47ef-ad90-b8563276fcf8",
          type: "WORKING",
          title:
            `MCP Proposal Approval Test ${Date.now()}`,
          content:
            "Original content.",
          accessLevel: "WRITE",
        },
      });

    const createText =
      createResult.content.find(
        item => item.type === "text"
      );

    assert.ok(createText);

    if (
      createText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const memory =
      JSON.parse(createText.text);

    const proposalResult =
      await client.callTool({
        name:
          "contextvault_propose_memory_update",
        arguments: {
          memoryId: memory.id,
          content:
            "Approved new content.",
          tags: [
            "proposal",
            "approved",
          ],
          accessLevel: "PROPOSE",
        },
      });

    const proposalText =
      proposalResult.content.find(
        item => item.type === "text"
      );

    assert.ok(proposalText);

    if (
      proposalText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const proposal =
      JSON.parse(proposalText.text);

    const approveResult =
      await client.callTool({
        name:
          "contextvault_approve_memory_proposal",
        arguments: {
          proposalId: proposal.id,
          accessLevel: "WRITE",
        },
      });

    assert.equal(
      approveResult.isError,
      undefined
    );

    const approveText =
      approveResult.content.find(
        item => item.type === "text"
      );

    assert.ok(approveText);

    if (
      approveText.type !== "text"
    ) {
      throw new Error(
        "Expected text content"
      );
    }

    const result =
      JSON.parse(approveText.text);

    assert.equal(
      result.proposal.status,
      "APPROVED"
    );

    assert.equal(
      result.memory.id,
      memory.id
    );

    assert.equal(
      result.memory.content,
      "Approved new content."
    );

    assert.deepEqual(
      result.memory.tags,
      [
        "proposal",
        "approved",
      ]
    );
  } finally {
    await client.close();
    await server.close();
  }
});