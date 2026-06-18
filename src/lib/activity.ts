import { prisma } from "@/lib/prisma";

export async function logActivity(
  actorId: string,
  action: string,
  target?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      actorId,
      action,
      target,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
