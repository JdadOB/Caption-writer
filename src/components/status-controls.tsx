"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "POSTED" | "IN_PROGRESS" | "COMPLETE";

export function StatusControls({
  postId,
  status,
  canChangeToInProgress,
  canChangeToComplete,
  inProgressAt,
  completedAt,
}: {
  postId: string;
  status: string;
  canChangeToInProgress: boolean;
  canChangeToComplete: boolean;
  inProgressAt: string | null;
  completedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (next: Status) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Couldn't update status");
      return;
    }
    router.refresh();
  };

  return (
    <div className="surface p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-light-muted dark:text-brand-dark-muted">
        Progress
      </h3>
      <ol className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Step active={status === "POSTED" || status === "IN_PROGRESS" || status === "COMPLETE"} label="Posted" when={null} />
        <Step active={status === "IN_PROGRESS" || status === "COMPLETE"} label="In Progress" when={inProgressAt} />
        <Step active={status === "COMPLETE"} label="Complete" when={completedAt} />
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {status === "POSTED" && canChangeToInProgress && (
          <button disabled={busy} onClick={() => update("IN_PROGRESS")} className="btn-primary">
            {busy ? "Updating…" : "Mark In Progress"}
          </button>
        )}
        {status === "IN_PROGRESS" && canChangeToComplete && (
          <button disabled={busy} onClick={() => update("COMPLETE")} className="btn-primary">
            {busy ? "Updating…" : "Mark Complete"}
          </button>
        )}
        {status === "COMPLETE" && canChangeToComplete && (
          <button disabled={busy} onClick={() => update("IN_PROGRESS")} className="btn-outline">
            Reopen
          </button>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
}

function Step({
  active,
  label,
  when,
}: {
  active: boolean;
  label: string;
  when: string | null;
}) {
  return (
    <li
      className={
        "rounded-lg border px-2 py-3 " +
        (active
          ? "border-brand-light-accent bg-brand-light-accentSoft text-brand-light-text dark:border-brand-dark-accent dark:bg-brand-dark-accentSoft dark:text-brand-dark-text"
          : "border-brand-light-border text-brand-light-muted dark:border-brand-dark-border dark:text-brand-dark-muted")
      }
    >
      <div className="font-medium">{label}</div>
      {when && (
        <div className="mt-0.5 text-[11px]">
          {new Date(when).toLocaleString()}
        </div>
      )}
    </li>
  );
}
