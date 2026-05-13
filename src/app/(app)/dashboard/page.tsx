import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listPostsForUser } from "@/lib/posts";
import { getManagerRosterIds } from "@/lib/permissions";
import { PostCard } from "@/components/post-card";
import { PostFilters } from "@/components/post-filters";
import type { PostStatus } from "@/lib/enums";

type SearchParams = {
  status?: string;
  creator?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user;

  const status = (searchParams.status as PostStatus | "ALL" | undefined) || "ALL";
  const creatorId = searchParams.creator || undefined;
  const from = searchParams.from ? new Date(searchParams.from) : undefined;
  const to = searchParams.to ? endOfDay(searchParams.to) : undefined;
  const q = searchParams.q || undefined;

  const posts = await listPostsForUser(user, {
    status,
    creatorId,
    from,
    to,
    search: q,
  });

  const creators = await loadCreatorsForFilter(user);
  const showCreatorFilter = user.role !== "CREATOR";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
            {subheadline(user.role)}
          </p>
        </div>
        {(user.role === "ADMIN" || user.role === "MANAGER") && (
          <Link href="/posts/new" className="btn-primary self-start sm:self-auto">
            + New Post
          </Link>
        )}
      </div>

      <PostFilters creators={creators} showCreator={showCreatorFilter} />

      {posts.length === 0 ? (
        <div className="surface p-10 text-center">
          <div className="text-base font-medium">No posts to show</div>
          <p className="mt-1 text-sm text-brand-light-muted dark:text-brand-dark-muted">
            {user.role === "CREATOR"
              ? "Your manager hasn't shared anything yet. Check back soon!"
              : "Share an Instagram or TikTok link to inspire your creators."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function subheadline(role: string) {
  switch (role) {
    case "ADMIN":
      return "All activity across your team.";
    case "MANAGER":
      return "Inspiration you've shared and your creators' progress.";
    default:
      return "Inspiration your managers have shared with you.";
  }
}

function endOfDay(d: string) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

async function loadCreatorsForFilter(user: {
  id: string;
  role: "ADMIN" | "MANAGER" | "CREATOR";
}) {
  if (user.role === "CREATOR") return [];
  if (user.role === "ADMIN") {
    return prisma.user.findMany({
      where: { role: "CREATOR" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
  const rosterIds = await getManagerRosterIds(user.id);
  return prisma.user.findMany({
    where: { id: { in: rosterIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
