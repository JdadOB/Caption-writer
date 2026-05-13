import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "CREATOR"]),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const parsed = schema.parse(await req.json());
    const email = parsed.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "A user with that email already exists");

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email,
        role: parsed.role,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await logActivity(admin.id, "USER_CREATED", user.id, {
      role: user.role,
      email: user.email,
    });

    return NextResponse.json(
      { ...user, createdAt: user.createdAt.toISOString() },
      { status: 201 },
    );
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
