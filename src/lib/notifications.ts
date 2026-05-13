import type { NotificationType } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

type NotifyArgs = {
  userIds: string[];
  type: NotificationType;
  message: string;
  postId?: string;
  commentId?: string;
  emailSubject?: string;
  emailHeading?: string;
  ctaLabel?: string;
  ctaPath?: string;
};

export async function notify(args: NotifyArgs): Promise<void> {
  const uniqueIds = Array.from(new Set(args.userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return;

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: args.type,
      message: args.message,
      postId: args.postId,
      commentId: args.commentId,
    })),
  });

  if (!process.env.RESEND_API_KEY) return;

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { email: true, name: true },
  });

  await Promise.all(
    users.map((u) =>
      sendEmail({
        to: u.email,
        subject: args.emailSubject || "New update on your Creator Dashboard",
        heading: args.emailHeading || "You have a new update",
        message: args.message,
        ctaLabel: args.ctaLabel || (args.postId ? "View post" : "Open dashboard"),
        ctaPath: args.ctaPath || (args.postId ? `/posts/${args.postId}` : "/dashboard"),
      }),
    ),
  );
}
