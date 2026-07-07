import { Card } from "@/components/ui/card";
import { type ReactNode } from "react";

export function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <Card className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 sm:grid-cols-3">
      {items.map((it, i) => (
        <div key={i}>
          <p className="text-xs text-muted-foreground">{it.label}</p>
          <p className="mt-1 font-semibold text-foreground">{it.value}</p>
        </div>
      ))}
    </Card>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-8 flex items-center gap-3 text-lg font-bold text-foreground">{children}</h2>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Card className="p-6 text-center text-sm text-muted-foreground">{children}</Card>;
}
