import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileClock, AlertTriangle, Wrench, Wallet, DoorOpen, CheckCheck, BellOff, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getNotifications, type GeneratedNotification } from "@/api/analytics";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "مركز الإشعارات — Rentify" }] }),
  component: NotificationsPage,
});

type NotifType = GeneratedNotification['type'];

const meta: Record<NotifType, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  contract: { icon: FileClock, tone: "bg-info/15 text-info" },
  payment: { icon: AlertTriangle, tone: "bg-warning/15 text-warning" },
  maintenance: { icon: Wrench, tone: "bg-[oklch(0.6_0.12_300)]/15 text-[oklch(0.5_0.14_300)]" },
  "payment-received": { icon: Wallet, tone: "bg-success/15 text-success" },
  vacant: { icon: DoorOpen, tone: "bg-gold/15 text-gold" },
};

const filters: { key: "all" | "unread" | NotifType; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "contract", label: "العقود" },
  { key: "payment", label: "التأخيرات" },
  { key: "maintenance", label: "الصيانة" },
  { key: "vacant", label: "الشاغرة" },
];

function Row({ n, onRead }: { n: GeneratedNotification & { read: boolean }; onRead: () => void }) {
  const m = meta[n.type];
  const Icon = m.icon;
  const body = (
    <div className="flex items-start gap-3">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", m.tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-foreground">{n.title}</p>
          {!n.read && <span className="h-2 w-2 rounded-full bg-destructive" />}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">{n.date}</p>
      </div>
    </div>
  );

  return (
    <Card className={cn("p-4 transition-colors", !n.read && "border-r-4 border-r-primary bg-secondary/30")}>
      <div className="flex items-center justify-between gap-3">
        {n.link ? (
          <Link to={n.link.to as any} params={n.link.params as any} onClick={onRead} className="flex-1">{body}</Link>
        ) : (
          <div className="flex-1" onClick={onRead}>{body}</div>
        )}
        <div className="flex shrink-0 gap-1">
          {!n.read && (
            <Button size="icon" variant="ghost" className="h-8 w-8" title="تعليم كمقروء" onClick={onRead}>
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | NotifType>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data: notifications = [], isLoading, isFetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const enriched = notifications.map(n => ({ ...n, read: readIds.has(n.id) }));
  const unread = enriched.filter(n => !n.read).length;
  const shown = enriched.filter(n => filter === "all" ? true : n.type === filter);

  const markRead = (id: string) => setReadIds(prev => new Set([...prev, id]));
  const markAllRead = () => setReadIds(new Set(notifications.map(n => n.id)));

  return (
    <AppLayout title="مركز الإشعارات" subtitle={`${unread} إشعار يحتاج انتباهك`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key as any)}>
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> تحديث
          </Button>
          <Button size="sm" variant="gold" className="gap-1" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.length ? (
            shown.map((n) => (
              <Row key={n.id} n={n} onRead={() => markRead(n.id)} />
            ))
          ) : (
            <Card className="flex flex-col items-center gap-3 p-12 text-muted-foreground">
              <BellOff className="h-10 w-10 opacity-40" />
              <div className="text-center">
                <p className="font-semibold">لا توجد إشعارات</p>
                <p className="mt-1 text-sm opacity-70">كل شيء على ما يرام! ستظهر هنا تنبيهات العقود والمدفوعات والصيانة تلقائياً.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
}
