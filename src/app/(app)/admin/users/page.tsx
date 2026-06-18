import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
          Create accounts for managers and creators, or update existing ones.
        </p>
      </div>
      <UsersClient
        initialUsers={users.map((u) => ({
          ...u,
          role: u.role as "ADMIN" | "MANAGER" | "CREATOR",
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
