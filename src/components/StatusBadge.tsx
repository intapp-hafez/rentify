import { statusColors } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusColors[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {status}
    </span>
  );
}