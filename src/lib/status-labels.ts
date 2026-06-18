import type { PostStatus } from "@/lib/enums";

export const STATUS_LABELS_SERVER: Record<PostStatus, string> = {
  POSTED: "Posted",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};
