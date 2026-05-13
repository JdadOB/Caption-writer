import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, canViewPost, requireUser } from "@/lib/permissions";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const allowed = await canViewPost(user, params.id);
    if (!allowed) throw new HttpError(403, "Forbidden");

    await prisma.postSeen.upsert({
      where: { postId_userId: { postId: params.id, userId: user.id } },
      update: {},
      create: { postId: params.id, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
