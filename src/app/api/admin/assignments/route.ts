import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  managerId: z.string().min(1),
  creatorId: z.string().min(1),
});

async function validatePair(managerId: string, creatorId: string) {
  const [m, c] = await Promise.all([
    prisma.user.findUnique({ where: { id: managerId } }),
    prisma.user.findUnique({ where: { id: creatorId } }),
  ]);
  if (!m || m.role !== "MANAGER") throw new HttpError(400, "Invalid manager");
  if (!c || c.role !== "CREATOR") throw new HttpError(400, "Invalid creator");
}

export async function POST(req: Request) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const { managerId, creatorId } = schema.parse(await req.json());
    await validatePair(managerId, creatorId);
    await prisma.assignment.upsert({
      where: { managerId_creatorId: { managerId, creatorId } },
      update: {},
      create: { managerId, creatorId },
    });
    await logActivity(admin.id, "ASSIGNMENT_CREATED", `${managerId}:${creatorId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const { managerId, creatorId } = schema.parse(await req.json());
    await prisma.assignment.deleteMany({ where: { managerId, creatorId } });
    await logActivity(admin.id, "ASSIGNMENT_REMOVED", `${managerId}:${creatorId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
