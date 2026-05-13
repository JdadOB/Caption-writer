import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "Created user",
  USER_DELETED: "Deleted user",
  ASSIGNMENT_CREATED: "Assigned creator to manager",
  ASSIGNMENT_REMOVED: "Removed creator from manager",
  POST_CREATED: "Shared a new post",
  COMMENT_CREATED: "Posted a comment",
  STATUS_CHANGED: "Changed a post status",
};

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, role: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
          A running log of every action across your team.
        </p>
      </div>
      <div className="surface overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-6 text-sm text-brand-light-muted dark:text-brand-dark-muted">
            No activity yet.
          </div>
        ) : (
          <ul className="divide-y divide-brand-light-border dark:divide-brand-dark-border">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{e.actor.name}</span>
                  <span className="chip-gray !px-1.5 !py-0 text-[10px] capitalize">
                    {e.actor.role.toLowerCase()}
                  </span>
                  <span className="text-brand-light-muted dark:text-brand-dark-muted">
                    {ACTION_LABELS[e.action] ?? e.action}
                  </span>
                  <span className="ml-auto text-xs text-brand-light-muted dark:text-brand-dark-muted">
                    {e.createdAt.toLocaleString()}
                  </span>
                </div>
                {e.metadata && (
                  <pre className="mt-1 overflow-x-auto rounded bg-brand-light-accentSoft/40 px-2 py-1 text-xs text-brand-light-muted dark:bg-brand-dark-accentSoft/40 dark:text-brand-dark-muted">
                    {e.metadata}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
