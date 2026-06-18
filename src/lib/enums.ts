export const ROLES = ["ADMIN", "MANAGER", "CREATOR"] as const;
export type Role = (typeof ROLES)[number];

export const POST_STATUSES = ["POSTED", "IN_PROGRESS", "COMPLETE"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const PLATFORMS = ["INSTAGRAM", "TIKTOK", "OTHER"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const NOTIFICATION_TYPES = [
  "NEW_POST",
  "NEW_COMMENT",
  "STATUS_CHANGED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
