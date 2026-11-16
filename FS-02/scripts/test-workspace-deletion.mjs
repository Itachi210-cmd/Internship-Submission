import { SignJWT } from "jose";
import fs from "fs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Load .env.local
let authSecret = process.env.AUTH_SECRET;
let databaseUrl = process.env.DATABASE_URL;

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const authMatch = line.match(/^AUTH_SECRET=["']?([^"'\r\n]+)["']?/);
    if (authMatch) authSecret = authMatch[1].trim();

    const dbMatch = line.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (dbMatch) databaseUrl = dbMatch[1].trim();
  }
} catch {}

const secretKey = new TextEncoder().encode(
  authSecret || "development-secret-key-at-least-32-chars-long"
);

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const user1 = {
  id: "cmwenvv1u00000fm6j6saedly",
  name: "Sujal",
  email: "itachi98210@gmail.com",
};

const user2 = {
  id: "cmwenxs3r00040fm69f5yslej",
  name: "Test User",
  email: "testuser01@example.com",
};

async function createCookie(user) {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  return `collab_session=${token}`;
}

async function run() {
  console.log("=== End-to-End Workspace Deletion Verification ===\n");
  const cookieOwner = await createCookie(user1);
  const cookieEditor = await createCookie(user2);
  const baseUrl = "http://localhost:3000";

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  FAIL: ${message}`);
    }
  }

  try {
    // 1. Unauthenticated DELETE
    console.log("1. Testing Unauthenticated DELETE request...");
    const unauthRes = await fetch(`${baseUrl}/api/workspaces/random-fake-id`, {
      method: "DELETE",
      headers: {
        Origin: baseUrl,
      },
    });
    assert(
      unauthRes.status === 401,
      `Unauthenticated DELETE returns HTTP 401 (got ${unauthRes.status})`
    );

    // 2. Nonexistent Workspace DELETE
    console.log("\n2. Testing Nonexistent Workspace DELETE request...");
    const nonexistentRes = await fetch(`${baseUrl}/api/workspaces/cmw0000000000nonexistent99`, {
      method: "DELETE",
      headers: {
        Cookie: cookieOwner,
        Origin: baseUrl,
      },
    });
    assert(
      nonexistentRes.status === 404,
      `Nonexistent workspace returns HTTP 404 (got ${nonexistentRes.status})`
    );

    // 3. Setup test workspace with complex dependencies in database
    console.log("\n3. Creating temporary test workspace with hierarchy, comments, versions, and states...");
    const testWs = await prisma.workspace.create({
      data: {
        name: `Automated Test Workspace ${Date.now()}`,
        ownerId: user1.id,
        members: {
          create: [
            { userId: user1.id, role: "OWNER" },
            { userId: user2.id, role: "EDITOR" },
          ],
        },
      },
    });
    console.log(`   Created test workspace: ${testWs.id} ("${testWs.name}")`);

    // Create root page
    const rootPage = await prisma.page.create({
      data: {
        workspaceId: testWs.id,
        title: "Root Architecture Spec",
        content: { type: "doc", content: [{ type: "paragraph", text: "Root page content" }] },
        createdById: user1.id,
      },
    });

    // Create subpage (self-referencing parentPageId)
    const subPage = await prisma.page.create({
      data: {
        workspaceId: testWs.id,
        parentPageId: rootPage.id,
        title: "Subpage Database Schema",
        content: { type: "doc", content: [{ type: "paragraph", text: "Subpage content" }] },
        createdById: user2.id,
      },
    });

    // Create DocumentState
    await prisma.documentState.create({
      data: {
        pageId: rootPage.id,
        yjsState: Buffer.from([1, 2, 3, 4, 5]),
        stateVersion: 1,
      },
    });

    // Create Comment
    const comment = await prisma.comment.create({
      data: {
        pageId: rootPage.id,
        authorId: user2.id,
        body: "Please verify database cascading before deployment.",
      },
    });

    // Create VersionSnapshot
    const snapshot = await prisma.versionSnapshot.create({
      data: {
        pageId: subPage.id,
        createdById: user1.id,
        label: "v1.0.0-snapshot",
        yjsState: Buffer.from([10, 20, 30]),
      },
    });

    console.log(`   Created root page: ${rootPage.id}, subpage: ${subPage.id}`);
    console.log(`   Created comment: ${comment.id}, snapshot: ${snapshot.id}`);

    // Verify DB count before deletion
    const membersBefore = await prisma.workspaceMember.count({ where: { workspaceId: testWs.id } });
    const pagesBefore = await prisma.page.count({ where: { workspaceId: testWs.id } });
    assert(membersBefore === 2, `Setup: 2 members exist in test workspace`);
    assert(pagesBefore === 2, `Setup: 2 pages exist in test workspace`);

    // 4. Forbidden check: Editor attempts to DELETE
    console.log("\n4. Testing Authorization: EDITOR attempt to DELETE workspace...");
    const editorDeleteRes = await fetch(`${baseUrl}/api/workspaces/${testWs.id}`, {
      method: "DELETE",
      headers: {
        Cookie: cookieEditor,
        Origin: baseUrl,
      },
    });
    const editorDeleteData = await editorDeleteRes.json();
    assert(
      editorDeleteRes.status === 403,
      `Non-owner (EDITOR) DELETE request is rejected with HTTP 403 (got ${editorDeleteRes.status})`
    );
    assert(
      editorDeleteData.error?.toLowerCase().includes("owner") || editorDeleteData.error?.toLowerCase().includes("forbidden"),
      `Error response states owner requirement: "${editorDeleteData.error}"`
    );

    // Verify workspace still intact after editor's forbidden attempt
    const wsStillExists = await prisma.workspace.findUnique({ where: { id: testWs.id } });
    assert(wsStillExists !== null, `Workspace remains intact after rejected non-owner deletion attempt`);

    // 5. Owner DELETE execution
    console.log("\n5. Testing Owner DELETE execution...");
    const ownerDeleteRes = await fetch(`${baseUrl}/api/workspaces/${testWs.id}`, {
      method: "DELETE",
      headers: {
        Cookie: cookieOwner,
        Origin: baseUrl,
      },
    });
    const ownerDeleteData = await ownerDeleteRes.json();
    assert(
      ownerDeleteRes.status === 200,
      `OWNER DELETE request succeeds with HTTP 200 (got ${ownerDeleteRes.status})`
    );
    assert(
      ownerDeleteData.message === "Workspace deleted successfully",
      `Success message returned: "${ownerDeleteData.message}"`
    );

    // 6. Database Cascade & Orphan Verification
    console.log("\n6. Verifying Database Cleanup & Zero Orphaned Records...");
    const wsInDb = await prisma.workspace.findUnique({ where: { id: testWs.id } });
    assert(wsInDb === null, `Workspace record was permanently deleted`);

    const membersInDb = await prisma.workspaceMember.findMany({ where: { workspaceId: testWs.id } });
    assert(membersInDb.length === 0, `All workspace member records were cleaned up (count: 0)`);

    const pagesInDb = await prisma.page.findMany({ where: { workspaceId: testWs.id } });
    assert(pagesInDb.length === 0, `All pages (including hierarchical child pages) were cleaned up (count: 0)`);

    const commentsInDb = await prisma.comment.findMany({
      where: { pageId: { in: [rootPage.id, subPage.id] } },
    });
    assert(commentsInDb.length === 0, `All page comments were cleaned up (count: 0)`);

    const statesInDb = await prisma.documentState.findMany({
      where: { pageId: { in: [rootPage.id, subPage.id] } },
    });
    assert(statesInDb.length === 0, `All document states were cleaned up (count: 0)`);

    const snapshotsInDb = await prisma.versionSnapshot.findMany({
      where: { pageId: { in: [rootPage.id, subPage.id] } },
    });
    assert(snapshotsInDb.length === 0, `All version snapshots were cleaned up (count: 0)`);

    // 7. Verify Unrelated Data Integrity
    console.log("\n7. Verifying Unrelated Data Integrity...");
    const user1InDb = await prisma.user.findUnique({ where: { id: user1.id } });
    const user2InDb = await prisma.user.findUnique({ where: { id: user2.id } });
    assert(user1InDb !== null && user2InDb !== null, `User accounts are untouched and preserved`);

    const otherWorkspacesCount = await prisma.workspace.count();
    assert(otherWorkspacesCount > 0, `Existing workspaces are untouched (count: ${otherWorkspacesCount})`);

    // 8. Post-Deletion Access
    console.log("\n8. Verifying Post-Deletion Inaccessibility...");
    const getDeletedWsRes = await fetch(`${baseUrl}/api/workspaces/${testWs.id}`, {
      headers: {
        Cookie: cookieOwner,
      },
    });
    assert(
      getDeletedWsRes.status === 404,
      `Subsequent GET /api/workspaces/[deletedId] returns HTTP 404 (got ${getDeletedWsRes.status})`
    );

    const getDeletedPagesRes = await fetch(`${baseUrl}/api/workspaces/${testWs.id}/pages`, {
      headers: {
        Cookie: cookieOwner,
      },
    });
    assert(
      getDeletedPagesRes.status === 404,
      `Subsequent GET /api/workspaces/[deletedId]/pages returns HTTP 404 (got ${getDeletedPagesRes.status})`
    );

    console.log(`\n========================================`);
    console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} tests passed`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log("All workspace deletion requirements verified successfully!");
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
