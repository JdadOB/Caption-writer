"use client";

import { useMemo, useState } from "react";

type Person = { id: string; name: string; email: string };
type AssignmentRow = { managerId: string; creatorId: string };

export function AssignmentsClient({
  managers,
  creators,
  initialAssignments,
}: {
  managers: Person[];
  creators: Person[];
  initialAssignments: AssignmentRow[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedManager, setSelectedManager] = useState(
    managers[0]?.id ?? null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedCreatorIds = useMemo(() => {
    if (!selectedManager) return new Set<string>();
    return new Set(
      assignments.filter((a) => a.managerId === selectedManager).map((a) => a.creatorId),
    );
  }, [assignments, selectedManager]);

  if (managers.length === 0) {
    return (
      <div className="surface p-6 text-sm text-brand-light-muted dark:text-brand-dark-muted">
        Create a manager first on the Users page.
      </div>
    );
  }

  const toggle = async (creatorId: string) => {
    if (!selectedManager) return;
    setError(null);
    setBusyId(creatorId);
    const isAssigned = assignedCreatorIds.has(creatorId);
    const res = await fetch("/api/admin/assignments", {
      method: isAssigned ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: selectedManager, creatorId }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to update");
      return;
    }
    setAssignments((rows) => {
      if (isAssigned) {
        return rows.filter(
          (r) => !(r.managerId === selectedManager && r.creatorId === creatorId),
        );
      }
      return [...rows, { managerId: selectedManager, creatorId }];
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      <div className="surface p-3">
        <div className="label">Manager</div>
        <ul className="space-y-1">
          {managers.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setSelectedManager(m.id)}
                className={
                  "w-full rounded-lg px-3 py-2 text-left text-sm " +
                  (m.id === selectedManager
                    ? "bg-brand-light-accentSoft text-brand-light-text dark:bg-brand-dark-accentSoft dark:text-brand-dark-text"
                    : "hover:bg-brand-light-accentSoft/60 dark:hover:bg-brand-dark-accentSoft/60")
                }
              >
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                  {m.email}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="surface p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="label !mb-0">Creators</div>
          <div className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
            {assignedCreatorIds.size}/{creators.length} assigned
          </div>
        </div>
        {creators.length === 0 ? (
          <div className="px-3 py-6 text-sm text-brand-light-muted dark:text-brand-dark-muted">
            Add some creators on the Users page first.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {creators.map((c) => {
              const assigned = assignedCreatorIds.has(c.id);
              const busy = busyId === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => toggle(c.id)}
                    disabled={busy}
                    className={
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors " +
                      (assigned
                        ? "border-brand-light-accent bg-brand-light-accentSoft dark:border-brand-dark-accent dark:bg-brand-dark-accentSoft"
                        : "border-brand-light-border hover:bg-brand-light-accentSoft/50 dark:border-brand-dark-border dark:hover:bg-brand-dark-accentSoft/50")
                    }
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-light-accent text-xs font-semibold text-white dark:bg-brand-dark-accent">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-brand-light-muted dark:text-brand-dark-muted">
                        {c.email}
                      </span>
                    </span>
                    {busy ? (
                      <span className="text-xs">…</span>
                    ) : assigned ? (
                      <span className="text-brand-light-accent dark:text-brand-dark-accent">✓</span>
                    ) : (
                      <span className="text-brand-light-muted dark:text-brand-dark-muted">+</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <div className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</div>
        )}
      </div>
    </div>
  );
}
