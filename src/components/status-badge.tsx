const LABELS: Record<string, string> = {
  POSTED: "Posted",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

const CLASSES: Record<string, string> = {
  POSTED: "chip-blue",
  IN_PROGRESS: "chip-amber",
  COMPLETE: "chip-green",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={CLASSES[status] ?? "chip-gray"}>
      {LABELS[status] ?? status}
    </span>
  );
}

export const STATUS_LABELS = LABELS;
