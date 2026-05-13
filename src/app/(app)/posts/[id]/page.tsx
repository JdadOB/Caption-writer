import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewPost } from "@/lib/permissions";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { CommentThread } from "@/components/comment-thread";
import { SeenTracker } from "@/components/seen-tracker";

export default async function PostPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user;

  const allowed = await canViewPost(user, params.id);
  if (!allowed) {
    redirect("/dashboard");
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      assignees: {
        include: { creator: { select: { id: true, name: true, email: true } } },
      },
      seenBy: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { seenAt: "asc" },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      statusEvents: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!post) notFound();

  const created = post.createdAt.toLocaleString();
  const isCreatorAssignee = post.assignees.some((a) => a.creator.id === user.id);

  return (
    <div className="space-y-4">
      <SeenTracker postId={post.id} />
      <Link
        href="/dashboard"
        className="text-sm text-brand-light-muted hover:underline dark:text-brand-dark-muted"
      >
        ← Back to dashboard
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="surface overflow-hidden">
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
              {post.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-brand-light-muted dark:text-brand-dark-muted">
                  No preview available
                </div>
              )}
              <span className="absolute top-3 left-3 chip-gray uppercase">
                {post.platform.toLowerCase()}
              </span>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={post.status} />
                <span className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                  Shared {created} by {post.author.name}
                </span>
              </div>
              <h1 className="text-xl font-semibold sm:text-2xl">{post.title}</h1>
              {post.description && (
                <p className="whitespace-pre-wrap text-sm text-brand-light-text dark:text-brand-dark-text">
                  {post.description}
                </p>
              )}
              <div>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-light-accent hover:underline dark:text-brand-dark-accent"
                >
                  Open original ↗
                </a>
              </div>
            </div>
          </div>

          <StatusControls
            postId={post.id}
            status={post.status}
            canChangeToInProgress={isCreatorAssignee || user.role === "ADMIN"}
            canChangeToComplete={isCreatorAssignee || user.role === "ADMIN"}
            inProgressAt={post.inProgressAt?.toISOString() ?? null}
            completedAt={post.completedAt?.toISOString() ?? null}
          />

          <div className="surface p-4 sm:p-5">
            <h2 className="text-base font-semibold">Comments</h2>
            <p className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
              Discuss the post with your manager or creator.
            </p>
            <div className="mt-4">
              <CommentThread
                postId={post.id}
                comments={post.comments.map((c) => ({
                  id: c.id,
                  body: c.body,
                  createdAt: c.createdAt.toISOString(),
                  parentId: c.parentId,
                  author: c.author,
                }))}
                currentUserId={user.id}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-light-muted dark:text-brand-dark-muted">
              For
            </h3>
            <ul className="mt-3 space-y-2">
              {post.assignees.map((a) => (
                <li key={a.creator.id} className="flex items-center gap-2 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-light-accent text-xs font-semibold text-white dark:bg-brand-dark-accent">
                    {a.creator.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.creator.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-light-muted dark:text-brand-dark-muted">
              Seen by ({post.seenBy.length})
            </h3>
            {post.seenBy.length === 0 ? (
              <p className="mt-2 text-sm text-brand-light-muted dark:text-brand-dark-muted">
                Nobody's viewed this yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {post.seenBy.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{s.user.name}</span>
                    <span className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                      {s.seenAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-light-muted dark:text-brand-dark-muted">
              Timeline
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <div className="font-medium">Posted</div>
                <div className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                  {post.createdAt.toLocaleString()} · {post.author.name}
                </div>
              </li>
              {post.statusEvents.map((e) => (
                <li key={e.id}>
                  <div className="font-medium">
                    {labelFor(e.toStatus)}
                  </div>
                  <div className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                    {e.createdAt.toLocaleString()} · {e.user.name}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function labelFor(status: string) {
  if (status === "IN_PROGRESS") return "Marked In Progress";
  if (status === "COMPLETE") return "Marked Complete";
  return "Reopened";
}
