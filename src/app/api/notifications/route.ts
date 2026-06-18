import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireUser } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return NextResponse.json({ notifications, unread });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
