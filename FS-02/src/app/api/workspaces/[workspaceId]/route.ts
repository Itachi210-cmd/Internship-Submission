import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { checkWorkspaceAccess } from "@/lib/auth/workspace-auth";
import { updateWorkspaceSchema } from "@/lib/validations/workspace";
import { prisma } from "@/lib/prisma";
import {
  NO_STORE_HEADERS,
  readJsonBody,
  verifySameOriginCsrf,
} from "@/lib/security/api-guard";
import { workspaceEvents } from "@/lib/events/workspace-events";
import { logStructured } from "@/lib/logger.mjs";

interface RouteParams {
  params: Promise<{
    workspaceId: string;
  }>;
}

/**
 * GET /api/workspaces/[workspaceId]
 * Retrieves workspace details, members, and page statistics in a single database query.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { joinedAt: "asc" },
          take: 250,
        },
        _count: {
          select: { pages: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const isOwner = workspace.ownerId === session.userId;
    const currentMember = workspace.members.find(
      (m) => m.userId === session.userId
    );

    if (!isOwner && !currentMember) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this workspace" },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          ownerId: workspace.ownerId,
          owner: workspace.owner,
          isOwner,
          userRole: isOwner ? "OWNER" : currentMember?.role || "VIEWER",
          members: workspace.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
          pagesCount: workspace._count.pages,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    logStructured("error", "WorkspaceAPI", "get_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

/**
 * PATCH /api/workspaces/[workspaceId]
 * Renames a workspace. Strictly restricted to the workspace owner.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const csrfError = verifySameOriginCsrf(request);
    if (csrfError) return csrfError;

    const { workspaceId } = await params;
    const authCheck = await checkWorkspaceAccess(workspaceId, {
      requireOwner: true,
    });
    if (!authCheck.success) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status, headers: NO_STORE_HEADERS }
      );
    }

    const parsedBody = await readJsonBody(request, 16 * 1024);
    if (!parsedBody.ok) return parsedBody.response;

    const parseResult = updateWorkspaceSchema.safeParse(parsedBody.data);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          issues: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: parseResult.data.name,
      },
    });

    return NextResponse.json(
      {
        message: "Workspace updated successfully",
        workspace: updatedWorkspace,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    logStructured("error", "WorkspaceAPI", "patch_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]
 * Deletes a workspace and all its members and pages. Strictly restricted to the workspace owner.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const csrfError = verifySameOriginCsrf(request);
    if (csrfError) return csrfError;

    const { workspaceId } = await params;
    const authCheck = await checkWorkspaceAccess(workspaceId, {
      requireOwner: true,
    });
    if (!authCheck.success) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status, headers: NO_STORE_HEADERS }
      );
    }

    // Atomically clean up all dependent resources before deleting workspace record
    await prisma.$transaction(async (tx) => {
      const pages = await tx.page.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      const pageIds = pages.map((p) => p.id);

      if (pageIds.length > 0) {
        // 1. Delete comments associated with pages
        await tx.comment.deleteMany({
          where: { pageId: { in: pageIds } },
        });

        // 2. Delete version snapshots associated with pages
        await tx.versionSnapshot.deleteMany({
          where: { pageId: { in: pageIds } },
        });

        // 3. Delete document states associated with pages
        await tx.documentState.deleteMany({
          where: { pageId: { in: pageIds } },
        });

        // 4. Detach parent page relationships to prevent recursive foreign key constraints
        await tx.page.updateMany({
          where: { workspaceId },
          data: { parentPageId: null },
        });

        // 5. Delete pages
        await tx.page.deleteMany({
          where: { workspaceId },
        });
      }

      // 6. Delete workspace memberships
      await tx.workspaceMember.deleteMany({
        where: { workspaceId },
      });

      // 7. Delete workspace record
      await tx.workspace.delete({
        where: { id: workspaceId },
      });
    });

    // Notify connected collaboration clients in this workspace via SSE
    try {
      workspaceEvents.emitWorkspaceEvent(workspaceId, {
        type: "WORKSPACE_DELETED",
        workspaceId,
      });
    } catch (eventError) {
      logStructured("warn", "WorkspaceAPI", "delete_event_broadcast_failed", {
        workspaceId,
        error: eventError,
      });
    }

    logStructured("info", "WorkspaceAPI", "workspace_deleted", {
      workspaceId,
      ownerId: authCheck.data.workspace.ownerId,
      userId: authCheck.data.session.userId,
    });

    return NextResponse.json(
      { message: "Workspace deleted successfully" },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    logStructured("error", "WorkspaceAPI", "delete_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

