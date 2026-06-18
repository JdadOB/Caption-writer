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
import { STATUS_LABELS_SERVER } from "@/lib/status-labels";

const schema = z.object({
  status: z.enum(["POSTED", "IN_PROGRESS", "COMPLETE"]),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const allowed = await canViewPost(user, params.id);
    if (!allowed) throw new HttpError(403, "Forbidden");

    const body = await req.json();
    const { status } = schema.parse(body);

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: { assignees: { select: { creatorId: true } } },
    });
    if (!post) throw new HttpError(404, "Not found");
    if (post.status === status) {
      return NextResponse.json({ ok: true, status });
    }

    // Permissions:
    // - Creators on this post can move through workflow
    // - Admins can override
    // - Managers cannot change creator-side status (keeps timestamps trustworthy)
    const isAssignee = post.assignees.some((a) => a.creatorId === user.id);
    if (!(isAssignee || user.role === "ADMIN")) {
      throw new HttpError(403, "Only assigned creators can change status");
    }

    const now = new Date();
    const data: Record<string, unknown> = { status };
    if (status === "IN_PROGRESS" && !post.inProgressAt) data.inProgressAt = now;
    if (status === "COMPLETE") data.completedAt = now;
    if (status === "POSTED") {
      data.inProgressAt = null;
      data.completedAt = null;
    }

    await prisma.$transaction([
      prisma.post.update({ where: { id: params.id }, data }),
      prisma.postStatusEvent.create({
        data: {
          postId: params.id,
          userId: user.id,
          fromStatus: post.status,
          toStatus: status,
        },
      }),
    ]);

    await logActivity(user.id, "STATUS_CHANGED", params.id, {
      from: post.status,
      to: status,
    });

    // Notify the post's author and the creator's managers (excluding the actor)
    const managerIds = await getCreatorManagerIds(user.id);
    const targets = new Set<string>();
    if (post.authorId !== user.id) targets.add(post.authorId);
    for (const id of managerIds) if (id !== user.id) targets.add(id);

    if (targets.size > 0) {
      await notify({
        userIds: Array.from(targets),
        type: "STATUS_CHANGED",
        message: `${user.name} marked "${truncate(post.title)}" as ${STATUS_LABELS_SERVER[status]}`,
        postId: post.id,
        emailSubject: `Status update: ${STATUS_LABELS_SERVER[status]}`,
        emailHeading: "A creator updated a post's status",
        ctaLabel: "View post",
      });
    }

    return NextResponse.json({ ok: true, status });
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
