import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  HttpError,
  canViewPost,
  getCreatorManagerIds,
  requireUser,
} from "@/lib/permissions";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.string().nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const allowed = await canViewPost(user, params.id);
    if (!allowed) throw new HttpError(403, "Forbidden");

    const json = await req.json();
    const { body, parentId } = schema.parse(json);

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true },
      });
      if (!parent || parent.postId !== params.id) {
        throw new HttpError(400, "Invalid parent comment");
      }
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        title: true,
        authorId: true,
        assignees: { select: { creatorId: true } },
      },
    });
    if (!post) throw new HttpError(404, "Not found");

    const comment = await prisma.comment.create({
      data: {
        postId: params.id,
        authorId: user.id,
        body,
        parentId: parentId ?? null,
      },
    });

    await logActivity(user.id, "COMMENT_CREATED", comment.id, {
      postId: params.id,
    });

    // Notify everyone involved with the post except the actor
    const targets = new Set<string>();
    if (post.authorId !== user.id) targets.add(post.authorId);
    for (const a of post.assignees) {
      if (a.creatorId !== user.id) targets.add(a.creatorId);
    }
    // Also notify managers of assigned creators (so managers see creator comments
    // even if they aren't the post author).
    for (const a of post.assignees) {
      const mIds = await getCreatorManagerIds(a.creatorId);
      for (const id of mIds) if (id !== user.id) targets.add(id);
    }

    if (targets.size > 0) {
      await notify({
        userIds: Array.from(targets),
        type: "NEW_COMMENT",
        message: `${user.name} commented on "${truncate(post.title)}"`,
        postId: params.id,
        commentId: comment.id,
        emailSubject: "New comment on a post",
        emailHeading: "Someone replied on the dashboard",
        ctaLabel: "Open thread",
      });
    }

    return NextResponse.json({ id: comment.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
