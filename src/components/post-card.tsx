import Link from "next/link";
import { StatusBadge } from "./status-badge";

type PostCardProps = {
  post: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    platform: string;
    thumbnailUrl: string | null;
    status: string;
    createdAt: Date | string;
    author: { id: string; name: string };
    assignees: { creator: { id: string; name: string } }[];
    _count: { comments: number; seenBy: number };
  };
};

export function PostCard({ post }: PostCardProps) {
  const created =
    typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="surface group block overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[16/9] w-full sm:w-44 sm:aspect-[4/5] flex-shrink-0 bg-slate-100 dark:bg-slate-800">
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnailUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-brand-light-muted dark:text-brand-dark-muted">
              No preview
            </div>
          )}
          <span className="absolute top-2 left-2 chip-gray uppercase">
            {post.platform.toLowerCase()}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={post.status} />
            <span className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
              {created.toLocaleDateString()}
            </span>
          </div>
          <h3 className="font-semibold leading-snug group-hover:text-brand-light-accent dark:group-hover:text-brand-dark-accent">
            {post.title}
          </h3>
          {post.description && (
            <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted line-clamp-2">
              {post.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-brand-light-muted dark:text-brand-dark-muted">
            <span>By {post.author.name}</span>
            <span>·</span>
            <span>{post._count.comments} comments</span>
            <span>·</span>
            <span>Seen by {post._count.seenBy}</span>
            {post.assignees.length > 0 && (
              <>
                <span>·</span>
                <span className="truncate">
                  For {post.assignees.map((a) => a.creator.name).join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
