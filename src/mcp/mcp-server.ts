import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { createContextVaultApp } from "../app/contextvault-app.js";
import { TrustPolicyService } from "../core/trust/trust-policy.service.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "contextvault",
    version: "1.0.0",
  });

  const {
    projectService,
    memoryService,
    proposalService,
    contextVault,
  } = createContextVaultApp();

  const trustPolicy =
  new TrustPolicyService();

  // --------------------------------------------------
  // Tool 1: List available projects
  // --------------------------------------------------

  server.registerTool(
    "contextvault_list_projects",
    {
      title: "List ContextVault Projects",
      description:
        "List projects registered in ContextVault. " +
        "This tool is read-only and does not modify project data.",
      annotations: {
        readOnlyHint: true,
      },
      inputSchema: z.object({}),
    },
    async () => {
      const projects =
        projectService.getAllProjects();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              projects.map((project) => ({
                id: project.id,
                name: project.name,
                rootPath: project.rootPath,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // --------------------------------------------------
  // Tool 2: Get project context
  // --------------------------------------------------

  server.registerTool(
    "contextvault_get_context",
    {
      title: "Get ContextVault Context",
      description:
        "Retrieve relevant project context from ContextVault. " +
        "This tool is read-only and does not modify project data.",
      annotations: {
        readOnlyHint: true,
      },
      inputSchema: z.object({
        projectId: z.string().min(1),
        query: z.string().min(1),
        accessLevel: z
          .enum(["READ", "PROPOSE", "WRITE"])
          .optional(),
        maxItems: z
          .number()
          .int()
          .positive()
          .optional(),
      }),
    },
    async ({
      projectId,
      query,
      accessLevel,
      maxItems,
    }) => {
      const requestedAccessLevel =
        accessLevel ?? "READ";

      if (!trustPolicy.canRead(requestedAccessLevel)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "This MCP server is currently read-only. " +
                "Only READ access is supported.",
            },
          ],
        };
      }

      const project =
        projectService.getProjectById(projectId);

      if (!project) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Project not found: ${projectId}`,
            },
          ],
        };
      }

      const request = {
        projectId: project.id,
        query,
        accessLevel: "READ" as const,
        ...(maxItems !== undefined
          ? { maxItems }
          : {}),
      };

      const response =
        contextVault.getContextResponse(
          request,
          project.name,
          project.rootPath
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              response,
              null,
              2
            ),
          },
        ],
      };
    }
  );
  
    // --------------------------------------------------
  // Tool 3: Create memory
  // --------------------------------------------------

  server.registerTool(
    "contextvault_create_memory",
    {
      title: "Create ContextVault Memory",
      description:
        "Create a new persistent memory for a ContextVault project. " +
        "This operation requires WRITE access.",
      annotations: {
        readOnlyHint: false,
      },
      inputSchema: z.object({
        projectId: z.string().min(1),
        type: z.enum([
          "PROJECT",
          "DECISION",
          "WORKING",
          "HISTORY",
        ]),
        title: z.string().min(1),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
        accessLevel: z.enum([
          "READ",
          "PROPOSE",
          "WRITE",
        ]),
      }),
    },
    async ({
      projectId,
      type,
      title,
      content,
      tags,
      accessLevel,
    }) => {
      if (!trustPolicy.canWrite(accessLevel)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "Creating memory requires WRITE access.",
            },
          ],
        };
      }

      const project =
        projectService.getProjectById(projectId);

      if (!project) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Project not found: ${projectId}`,
            },
          ],
        };
      }

      const memory =
        memoryService.createMemory(
          project.id,
          type,
          title,
          content,
          tags ?? []
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              memory,
              null,
              2
            ),
          },
        ],
      };
    }
  );

    // --------------------------------------------------
  // Tool 4: Update memory
  // --------------------------------------------------

  server.registerTool(
    "contextvault_update_memory",
    {
      title: "Update ContextVault Memory",
      description:
        "Update an existing ContextVault memory. " +
        "This operation requires WRITE access.",
      annotations: {
        readOnlyHint: false,
      },
      inputSchema: z.object({
        memoryId: z.string().min(1),
        type: z
          .enum([
            "PROJECT",
            "DECISION",
            "WORKING",
            "HISTORY",
          ])
          .optional(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        tags: z.array(z.string()).optional(),
        accessLevel: z.enum([
          "READ",
          "PROPOSE",
          "WRITE",
        ]),
      }),
    },
    async ({
      memoryId,
      type,
      title,
      content,
      tags,
      accessLevel,
    }) => {
      if (!trustPolicy.canWrite(accessLevel)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "Updating memory requires WRITE access.",
            },
          ],
        };
      }

      const existingMemory =
        memoryService.getMemoryById(
          memoryId
        );

      if (!existingMemory) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Memory not found: ${memoryId}`,
            },
          ],
        };
      }

      const updatedMemory =
        memoryService.updateMemory(
          memoryId,
          {
            ...(type !== undefined
              ? { type }
              : {}),
            ...(title !== undefined
              ? { title }
              : {}),
            ...(content !== undefined
              ? { content }
              : {}),
            ...(tags !== undefined
              ? { tags }
              : {}),
          }
        );

      if (!updatedMemory) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Memory not found: ${memoryId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              updatedMemory,
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // --------------------------------------------------
  // Tool 5: Archive memory
  // --------------------------------------------------

  server.registerTool(
    "contextvault_archive_memory",
    {
      title: "Archive ContextVault Memory",
      description:
        "Archive an existing ContextVault memory. " +
        "This operation requires WRITE access.",
      annotations: {
        readOnlyHint: false,
      },
      inputSchema: z.object({
        memoryId: z.string().min(1),
        accessLevel: z.enum([
          "READ",
          "PROPOSE",
          "WRITE",
        ]),
      }),
    },
    async ({
      memoryId,
      accessLevel,
    }) => {
      if (!trustPolicy.canWrite(accessLevel)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "Archiving memory requires WRITE access.",
            },
          ],
        };
      }

      const existingMemory =
        memoryService.getMemoryById(
          memoryId
        );

      if (!existingMemory) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Memory not found: ${memoryId}`,
            },
          ],
        };
      }

      memoryService.updateMemoryStatus(
        memoryId,
        "ARCHIVED"
      );

      const archivedMemory =
        memoryService.getMemoryById(
          memoryId
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              archivedMemory,
              null,
              2
            ),
          },
        ],
      };
    }
  );
    // --------------------------------------------------
  // Tool 6: Propose memory update
  // --------------------------------------------------

  server.registerTool(
    "contextvault_propose_memory_update",
    {
      title: "Propose ContextVault Memory Update",
      description:
        "Create a pending proposal to update an existing " +
        "ContextVault memory. This does not modify the memory.",
      annotations: {
        readOnlyHint: false,
      },
      inputSchema: z.object({
        memoryId: z.string().min(1),
        type: z
          .enum([
            "PROJECT",
            "DECISION",
            "WORKING",
            "HISTORY",
          ])
          .optional(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        tags: z.array(z.string()).optional(),
        accessLevel: z.enum([
          "READ",
          "PROPOSE",
          "WRITE",
        ]),
      }),
    },
    async ({
      memoryId,
      type,
      title,
      content,
      tags,
      accessLevel,
    }) => {
      if (
        !trustPolicy.canPropose(
          accessLevel
        )
      ) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "Creating a proposal requires " +
                "PROPOSE or WRITE access.",
            },
          ],
        };
      }

      const memory =
        memoryService.getMemoryById(
          memoryId
        );

      if (!memory) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Memory not found: ${memoryId}`,
            },
          ],
        };
      }

      if (
        type === undefined &&
        title === undefined &&
        content === undefined &&
        tags === undefined
      ) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "At least one memory field must be provided.",
            },
          ],
        };
      }

      const proposal =
        proposalService.createMemoryUpdateProposal(
          memoryId,
          {
            ...(type !== undefined
              ? { type }
              : {}),
            ...(title !== undefined
              ? { title }
              : {}),
            ...(content !== undefined
              ? { content }
              : {}),
            ...(tags !== undefined
              ? { tags }
              : {}),
          }
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              proposal,
              null,
              2
            ),
          },
        ],
      };
    }
  );
    // --------------------------------------------------
  // Tool 7: Approve memory proposal
  // --------------------------------------------------

  server.registerTool(
    "contextvault_approve_memory_proposal",
    {
      title: "Approve ContextVault Memory Proposal",
      description:
        "Approve a pending memory update proposal and " +
        "apply it to persistent memory. This requires WRITE access.",
      annotations: {
        readOnlyHint: false,
      },
      inputSchema: z.object({
        proposalId: z.string().min(1),
        accessLevel: z.enum([
          "READ",
          "PROPOSE",
          "WRITE",
        ]),
      }),
    },
    async ({
      proposalId,
      accessLevel,
    }) => {
      if (
        !trustPolicy.canWrite(
          accessLevel
        )
      ) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                "Approving a proposal requires WRITE access.",
            },
          ],
        };
      }

      const proposal =
        proposalService.getProposalById(
          proposalId
        );

      if (!proposal) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Proposal not found: ${proposalId}`,
            },
          ],
        };
      }

      if (
        proposal.status !== "PENDING"
      ) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Proposal is already ${proposal.status}.`,
            },
          ],
        };
      }

      const memory =
        memoryService.getMemoryById(
          proposal.memoryId
        );

      if (!memory) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Memory not found: ${proposal.memoryId}`,
            },
          ],
        };
      }

      const updatedMemory =
        memoryService.updateMemory(
          proposal.memoryId,
          {
            ...(proposal.type !== undefined
              ? { type: proposal.type }
              : {}),
            ...(proposal.title !== undefined
              ? { title: proposal.title }
              : {}),
            ...(proposal.content !== undefined
              ? { content: proposal.content }
              : {}),
            ...(proposal.tags !== undefined
              ? { tags: proposal.tags }
              : {}),
          }
        );

      if (!updatedMemory) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Memory not found: ${proposal.memoryId}`,
            },
          ],
        };
      }

      proposalService.approveProposal(
        proposal.id
      );

      const approvedProposal =
        proposalService.getProposalById(
          proposal.id
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                proposal:
                  approvedProposal,
                memory: updatedMemory,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
  return server;
}