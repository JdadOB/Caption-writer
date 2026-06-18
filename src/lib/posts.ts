import type { Prisma } from "@prisma/client";
import type { PostStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { getManagerRosterIds } from "@/lib/permissions";

export type PostFilter = {
  status?: PostStatus | "ALL";
  creatorId?: string;
  authorId?: string;
  from?: Date;
  to?: Date;
  search?: string;
};

export async function listPostsForUser(
  user: SessionUser,
  filter: PostFilter = {},
) {
  const where: Prisma.PostWhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }
  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { url: { contains: q } },
    ];
  }
  if (filter.authorId) where.authorId = filter.authorId;

  if (user.role === "CREATOR") {
    where.assignees = { some: { creatorId: user.id } };
  } else if (user.role === "MANAGER") {
    const roster = await getManagerRosterIds(user.id);
    where.OR = [
      ...(where.OR ?? []),
      { authorId: user.id },
      { assignees: { some: { creatorId: { in: roster } } } },
    ];
  }

  if (filter.creatorId) {
    where.assignees = { some: { creatorId: filter.creatorId } };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, role: true } },
      assignees: {
        include: {
          creator: { select: { id: true, name: true } },
        },
      },
      _count: { select: { comments: true, seenBy: true } },
    },
    take: 100,
  });

  return posts;
}
