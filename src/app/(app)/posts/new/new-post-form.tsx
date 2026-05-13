"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Creator = { id: string; name: string; email: string };

type Preview = {
  platform: "INSTAGRAM" | "TIKTOK" | "OTHER";
  title: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
};

export function NewPostForm({ creators }: { creators: Creator[] }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPreview = async (value: string) => {
    if (!value) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/oembed?url=${encodeURIComponent(value)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setPreview(null);
      } else {
        const data = (await res.json()) as Preview;
        setPreview(data);
        if (!title && data.title) setTitle(data.title);
      }
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("Pick at least one creator");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        url,
        creatorIds: selected,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to create post");
      return;
    }
    const data = (await res.json()) as { id: string };
    router.push(`/posts/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="surface p-4 space-y-4">
        <div>
          <label className="label" htmlFor="url">Instagram / TikTok URL</label>
          <input
            id="url"
            type="url"
            required
            className="input"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={(e) => fetchPreview(e.target.value)}
          />
          <p className="mt-1 text-xs text-brand-light-muted dark:text-brand-dark-muted">
            Paste the link and tab away — we&apos;ll grab a thumbnail automatically.
          </p>
        </div>
        {(previewLoading || preview) && (
          <div className="flex gap-3 rounded-xl border border-brand-light-border bg-white p-3 dark:border-brand-dark-border dark:bg-brand-dark-bg/40">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              {preview?.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-brand-light-muted dark:text-brand-dark-muted">
                  {previewLoading ? "Loading…" : "No preview"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="chip-gray uppercase">{preview?.platform.toLowerCase() ?? "—"}</div>
              <div className="mt-1 truncate text-sm font-medium">
                {preview?.title ?? "Untitled"}
              </div>
              {preview?.authorName && (
                <div className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                  by {preview.authorName}
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input
            id="title"
            required
            className="input"
            placeholder="Short description for your roster"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="description">Notes (optional)</label>
          <textarea
            id="description"
            rows={3}
            className="input"
            placeholder="What should the creator notice? Any tweaks to make it their own?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="label !mb-0">Send to</span>
          <span className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
            {selected.length}/{creators.length} selected
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {creators.map((c) => {
            const active = selected.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggle(c.id)}
                className={
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors " +
                  (active
                    ? "border-brand-light-accent bg-brand-light-accentSoft text-brand-light-text dark:border-brand-dark-accent dark:bg-brand-dark-accentSoft dark:text-brand-dark-text"
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
                {active && (
                  <span className="text-brand-light-accent dark:text-brand-dark-accent">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="btn-outline">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Sharing…" : "Share with creators"}
        </button>
      </div>
    </form>
  );
}
