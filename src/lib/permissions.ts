import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/enums";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new HttpError(401, "Unauthorized");
  }
  return session.user as SessionUser;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new HttpError(403, "Forbidden");
  }
  return user;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Returns the IDs of creators a given manager can see (those assigned to them).
 */
export async function getManagerRosterIds(managerId: string): Promise<string[]> {
  const rows = await prisma.assignment.findMany({
    where: { managerId },
    select: { creatorId: true },
  });
  return rows.map((r) => r.creatorId);
}

/**
 * Returns the IDs of managers a creator is assigned to.
 */
export async function getCreatorManagerIds(creatorId: string): Promise<string[]> {
  const rows = await prisma.assignment.findMany({
    where: { creatorId },
    select: { managerId: true },
  });
  return rows.map((r) => r.managerId);
}

/**
 * Can the given user view this post?
 *  - Admins: always
 *  - Authors (managers): always
 *  - Creators: if they're an assignee on the post
 *  - Managers: if any assignee on the post is in their roster
 */
export async function canViewPost(
  user: SessionUser,
  postId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      authorId: true,
      assignees: { select: { creatorId: true } },
    },
  });
  if (!post) return false;
  if (post.authorId === user.id) return true;
  const assigneeIds = post.assignees.map((a) => a.creatorId);
  if (user.role === "CREATOR") return assigneeIds.includes(user.id);
  if (user.role === "MANAGER") {
    const roster = await getManagerRosterIds(user.id);
    return assigneeIds.some((id) => roster.includes(id));
  }
  return false;
}
