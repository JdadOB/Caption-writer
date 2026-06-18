import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  HttpError,
  requireRole,
  getManagerRosterIds,
} from "@/lib/permissions";
import { fetchOEmbed } from "@/lib/oembed";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url(),
  creatorIds: z.array(z.string()).min(1, "Pick at least one creator"),
});

export async function POST(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const body = await req.json();
    const parsed = schema.parse(body);

    // Restrict managers to creators in their roster
    if (user.role === "MANAGER") {
      const roster = await getManagerRosterIds(user.id);
      const bad = parsed.creatorIds.filter((id) => !roster.includes(id));
      if (bad.length > 0) {
        throw new HttpError(403, "Some creators are not in your roster");
      }
    }

    const meta = await fetchOEmbed(parsed.url);

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: parsed.title,
        description: parsed.description ?? null,
        url: parsed.url,
        platform: meta.platform,
        thumbnailUrl: meta.thumbnailUrl,
        embedHtml: meta.embedHtml,
        assignees: {
          create: parsed.creatorIds.map((creatorId) => ({ creatorId })),
        },
      },
    });

    await logActivity(user.id, "POST_CREATED", post.id, {
      title: post.title,
      creatorIds: parsed.creatorIds,
    });

    await notify({
      userIds: parsed.creatorIds,
      type: "NEW_POST",
      message: `${user.name} shared a new ${meta.platform.toLowerCase()} post: ${post.title}`,
      postId: post.id,
      emailSubject: "New content inspiration for you",
      emailHeading: "You have a new post to review",
      ctaLabel: "View post",
    });

    return NextResponse.json({ id: post.id }, { status: 201 });
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
