"use client";

import { useEffect } from "react";

export function SeenTracker({ postId }: { postId: string }) {
  useEffect(() => {
    fetch(`/api/posts/${postId}/seen`, { method: "POST" }).catch(() => {});
  }, [postId]);
  return null;
}
