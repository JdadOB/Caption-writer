import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = await requireRole(["ADMIN"]);
    if (admin.id === params.id) {
      throw new HttpError(400, "You can't delete your own account");
    }
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw new HttpError(404, "User not found");

    await prisma.user.delete({ where: { id: params.id } });
    await logActivity(admin.id, "USER_DELETED", params.id, {
      email: target.email,
      role: target.role,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
