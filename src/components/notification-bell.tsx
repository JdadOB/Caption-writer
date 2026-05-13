"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  type: string;
  message: string;
  postId: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: Notification[]; unread: number };
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost relative h-9 w-9 rounded-full"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] surface shadow-lg overflow-hidden z-40">
          <div className="flex items-center justify-between border-b border-brand-light-border px-3 py-2 dark:border-brand-dark-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-brand-light-accent hover:underline dark:text-brand-dark-accent">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-brand-light-muted dark:text-brand-dark-muted">
                You&apos;re all caught up.
              </div>
            )}
            {items.map((n) => {
              const href = n.postId ? `/posts/${n.postId}` : "/dashboard";
              return (
                <Link
                  key={n.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={
                    "block border-b border-brand-light-border px-3 py-2.5 text-sm last:border-0 dark:border-brand-dark-border " +
                    (!n.readAt
                      ? "bg-brand-light-accentSoft/40 dark:bg-brand-dark-accentSoft/40"
                      : "")
                  }
                >
                  <div className="text-brand-light-text dark:text-brand-dark-text">
                    {n.message}
                  </div>
                  <div className="mt-0.5 text-xs text-brand-light-muted dark:text-brand-dark-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
