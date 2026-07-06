import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label, value, hint, icon: Icon, tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "accent" | "gold" | "success" | "warning";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    gold: "bg-gold/15 text-gold",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-extrabold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}