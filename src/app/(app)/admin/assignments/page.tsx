import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssignmentsClient } from "./assignments-client";

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [managers, creators, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MANAGER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "CREATOR" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.findMany({
      select: { managerId: true, creatorId: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Assignments</h1>
        <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
          Choose which creators belong to each manager&apos;s roster. Creators can have multiple managers.
        </p>
      </div>
      <AssignmentsClient
        managers={managers}
        creators={creators}
        initialAssignments={assignments}
      />
    </div>
  );
}
