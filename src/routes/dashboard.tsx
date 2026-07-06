import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2, KeyRound, FileText, Wallet,
  TrendingUp, AlertTriangle, Home, Wrench, TrendingDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { egp } from "@/lib/mockData";
import { getDashboardStats } from "@/api/dashboard";
import { format } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — Rentify" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    staleTime: 2 * 60 * 1000,
  });

  const maxRev = stats ? Math.max(...stats.monthly.map((m) => m.value), 1) : 1;
  const occupancyRate = stats?.units.total
    ? Math.round((stats.units.rented / stats.units.total) * 100)
    : 0;

  if (isLoading) {
    return (
      <AppLayout title="لوحة التحكم" subtitle="نظرة عامة على أداء محفظتك العقارية">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="لوحة التحكم" subtitle="نظرة عامة على أداء محفظتك العقارية">
      {/* Row 1: Core KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="إجمالي الوحدات"
          value={stats?.units.total.toString() || "0"}
          hint={`${stats?.units.available || 0} شاغرة • ${stats?.units.rented || 0} مؤجرة`}
          icon={KeyRound}
          tone="primary"
        />
        <KpiCard
          label="العقود النشطة"
          value={stats?.contracts.active.toString() || "0"}
          hint="إجمالي العقود السارية"
          icon={FileText}
          tone="success"
        />
        <KpiCard
          label="تحصيلات الشهر"
          value={egp(stats?.payments.thisMonth || 0)}
          hint="الدفعات المحصلة هذا الشهر"
          icon={Wallet}
          tone="gold"
        />
        <KpiCard
          label="إجمالي المتأخرات"
          value={egp(stats?.payments.overdue || 0)}
          hint="مبالغ إيجار متأخرة"
          icon={TrendingDown}
          tone="warning"
        />
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="نسبة الإشغال" value={`${occupancyRate}%`} icon={Home} tone="success" />
        <KpiCard label="متوسط الإيجار" value={egp(stats?.units.avgRent || 0)} icon={TrendingUp} tone="accent" />
        <KpiCard label="تحت الصيانة" value={stats?.units.maintenance.toString() || "0"} icon={Wrench} tone="warning" />
        <Link to="/reports" className="block">
          <KpiCard
            label="عقود تنتهي قريباً"
            value={stats?.contracts.expiringSoon.toString() || "0"}
            hint="خلال 60 يوم — اضغط للتفاصيل"
            icon={AlertTriangle}
            tone="warning"
          />
        </Link>
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-bold text-foreground">الإيرادات الشهرية (آخر 6 أشهر)</h3>
          {stats?.monthly.every((m) => m.value === 0) ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              لا توجد إيرادات مسجلة بعد
            </div>
          ) : (
            <div className="flex h-52 items-end gap-3">
              {stats?.monthly.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-foreground">
                    {m.value > 0 ? egp(m.value) : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-accent transition-all hover:bg-primary"
                      style={{ height: `${Math.max((m.value / maxRev) * 100, m.value > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Cities */}
        <Card className="p-5">
          <h3 className="mb-4 font-bold text-foreground">أعلى المناطق بالوحدات</h3>
          {stats?.topCities.length ? (
            <div className="space-y-4">
              {stats.topCities.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted-foreground">{c.count} وحدة ({c.pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              لا توجد وحدات مسجلة بعد.
            </div>
          )}
        </Card>
      </div>

      {/* Recent Maintenance */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-foreground">أحدث طلبات الصيانة</h3>
          <Link to="/maintenance" className="text-sm font-medium text-primary hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="space-y-3">
          {stats?.maintenance && stats.maintenance.length > 0 ? (
            stats.maintenance.map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {m.description || m.type || "طلب صيانة"} — {m.units?.title || "وحدة غير معروفة"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    وحدة رقم: {m.units?.number || "-"} • {format(new Date(m.created_at), "yyyy/MM/dd")}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              لا توجد طلبات صيانة حالية.
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}