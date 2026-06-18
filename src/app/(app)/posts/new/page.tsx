import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagerRosterIds } from "@/lib/permissions";
import { NewPostForm } from "./new-post-form";

export default async function NewPostPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const creators = user.role === "ADMIN"
    ? await prisma.user.findMany({
        where: { role: "CREATOR" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : await prisma.user.findMany({
        where: { id: { in: await getManagerRosterIds(user.id) } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New post</h1>
        <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
          Share an Instagram or TikTok link as inspiration for your creators.
        </p>
      </div>
      {creators.length === 0 ? (
        <div className="surface p-6 text-sm text-brand-light-muted dark:text-brand-dark-muted">
          You don&apos;t have any creators assigned yet. Ask an admin to add some to your roster.
        </div>
      ) : (
        <NewPostForm creators={creators} />
      )}
    </div>
  );
}
