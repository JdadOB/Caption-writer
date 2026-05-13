"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type CommentNode = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: { id: string; name: string; role: string };
};

type Tree = CommentNode & { children: Tree[] };

function buildTree(comments: CommentNode[]): Tree[] {
  const byId = new Map<string, Tree>();
  for (const c of comments) byId.set(c.id, { ...c, children: [] });
  const roots: Tree[] = [];
  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function CommentThread({
  postId,
  comments,
  currentUserId,
}: {
  postId: string;
  comments: CommentNode[];
  currentUserId: string;
}) {
  const tree = useMemo(() => buildTree(comments), [comments]);
  return (
    <div className="space-y-5">
      <CommentForm postId={postId} parentId={null} placeholder="Write a comment…" />
      {tree.length === 0 ? (
        <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul className="space-y-4">
          {tree.map((c) => (
            <CommentItem
              key={c.id}
              node={c}
              postId={postId}
              currentUserId={currentUserId}
              depth={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentItem({
  node,
  postId,
  currentUserId,
  depth,
}: {
  node: Tree;
  postId: string;
  currentUserId: string;
  depth: number;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <li>
      <div className="flex gap-3">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-brand-light-accent text-xs font-semibold text-white dark:bg-brand-dark-accent">
          {node.author.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold">
              {node.author.name}
              {node.author.id === currentUserId && (
                <span className="ml-1 text-xs font-normal text-brand-light-muted dark:text-brand-dark-muted">
                  (you)
                </span>
              )}
            </span>
            <span className="chip-gray !px-1.5 !py-0 text-[10px]">
              {node.author.role.toLowerCase()}
            </span>
            <span className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
              {new Date(node.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{node.body}</p>
          <div className="mt-1">
            <button
              onClick={() => setReplying((r) => !r)}
              className="text-xs font-medium text-brand-light-accent hover:underline dark:text-brand-dark-accent"
            >
              {replying ? "Cancel" : "Reply"}
            </button>
          </div>
          {replying && (
            <div className="mt-2">
              <CommentForm
                postId={postId}
                parentId={node.id}
                onDone={() => setReplying(false)}
                placeholder={`Reply to ${node.author.name}…`}
              />
            </div>
          )}
          {node.children.length > 0 && (
            <ul
              className={
                "mt-3 space-y-3 " +
                (depth < 4
                  ? "border-l border-brand-light-border pl-4 dark:border-brand-dark-border"
                  : "")
              }
            >
              {node.children.map((child) => (
                <CommentItem
                  key={child.id}
                  node={child}
                  postId={postId}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function CommentForm({
  postId,
  parentId,
  onDone,
  placeholder,
}: {
  postId: string;
  parentId: string | null;
  onDone?: () => void;
  placeholder?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed, parentId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to post comment");
      return;
    }
    setBody("");
    onDone?.();
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        className="input"
        rows={parentId ? 2 : 3}
        placeholder={placeholder ?? "Write a comment…"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {error && (
        <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>
      )}
      <div className="flex justify-end gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="btn-ghost">
            Cancel
          </button>
        )}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Posting…" : parentId ? "Reply" : "Comment"}
        </button>
      </div>
    </form>
  );
}
