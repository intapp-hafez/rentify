import { createFileRoute } from "@tanstack/react-router";
import { Building2, FileText, Wallet, Users, Wrench, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { getReportStats } from "@/api/analytics";
import { egp } from "@/lib/mockData";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "التقارير — Rentify" }] }),
  component: Reports,
});

function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
      <span className="text-foreground/90">{label}</span>
      <div className="text-left">
        <span className="font-bold text-foreground">{value}</span>
        {sub && <span className="mr-2 text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function Reports() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["report-stats"],
    queryFn: getReportStats,
  });

  const maxRev = stats ? Math.max(...stats.payments.monthly.map(m => m.value), 1) : 1;
  const occupancy = stats?.units.total ? Math.round((stats.units.rented / stats.units.total) * 100) : 0;

  if (isLoading) {
    return (
      <AppLayout title="التقارير" subtitle="تقارير شاملة عن أداء العقارات والمالية">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="التقارير" subtitle="تقارير شاملة عن أداء العقارات والمالية">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="إجمالي الوحدات" value={stats?.units.total.toString() || "0"} icon={Building2} tone="primary" />
        <KpiCard label="نسبة الإشغال" value={`${occupancy}%`} icon={TrendingUp} tone="success" />
        <KpiCard label="إجمالي التحصيلات" value={egp(stats?.payments.collected || 0)} icon={Wallet} tone="gold" />
        <KpiCard label="المتأخرات" value={egp(stats?.payments.overdue || 0)} icon={TrendingDown} tone="warning" />
      </div>

      {/* Revenue Chart */}
      <Card className="mt-5 p-5">
        <h3 className="mb-4 font-bold text-foreground">الإيرادات الشهرية (آخر 6 أشهر)</h3>
        {stats && stats.payments.monthly.every(m => m.value === 0) ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            لا توجد إيرادات مسجلة بعد — ابدأ بتسجيل دفعات في صفحة التحصيلات
          </div>
        ) : (
          <div className="flex h-52 items-end gap-3">
            {stats?.payments.monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{m.value > 0 ? egp(m.value) : ''}</span>
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

      {/* Detail Cards */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

        {/* Units Report */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">تقرير الوحدات</h3>
          </div>
          <div className="space-y-2">
            <StatRow label="إجمالي الوحدات" value={stats?.units.total || 0} />
            <StatRow label="وحدات مؤجرة" value={stats?.units.rented || 0} sub={`(${occupancy}%)`} />
            <StatRow label="وحدات شاغرة" value={stats?.units.available || 0} />
            <StatRow label="تحت الصيانة" value={stats?.units.maintenance || 0} />
          </div>
        </Card>

        {/* Contracts Report */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">تقرير العقود</h3>
          </div>
          <div className="space-y-2">
            <StatRow label="عقود نشطة" value={stats?.contracts.active || 0} />
            <StatRow label="تنتهي خلال 60 يوم" value={stats?.contracts.expiringSoon || 0} />
            <StatRow label="عقود منتهية" value={stats?.contracts.expired || 0} />
          </div>
        </Card>

        {/* Payments Report */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">التقرير المالي</h3>
          </div>
          <div className="space-y-2">
            <StatRow label="إجمالي المحصل" value={egp(stats?.payments.collected || 0)} />
            <StatRow label="مبالغ مستحقة" value={egp(stats?.payments.due || 0)} />
            <StatRow label="مبالغ متأخرة" value={egp(stats?.payments.overdue || 0)} />
          </div>
        </Card>

        {/* Tenants Report */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">تقرير المستأجرين</h3>
          </div>
          <div className="space-y-2">
            <StatRow label="إجمالي المستأجرين" value={stats?.tenants.total || 0} />
            <StatRow label="متأخرون بالسداد" value={stats?.tenants.late || 0} />
            <StatRow label="ملتزمون" value={(stats?.tenants.total || 0) - (stats?.tenants.late || 0)} />
          </div>
        </Card>

        {/* Maintenance Report */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">تقرير الصيانة</h3>
          </div>
          <div className="space-y-2">
            <StatRow label="إجمالي الطلبات" value={stats?.maintenance.total || 0} />
            <StatRow label="طلبات معلقة" value={stats?.maintenance.pending || 0} />
            <StatRow label="طلبات مكتملة" value={stats?.maintenance.done || 0} />
          </div>
        </Card>

        {/* Alerts Summary */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">ملخص التنبيهات</h3>
          </div>
          <div className="space-y-2">
            <StatRow label="عقود تنتهي قريباً" value={stats?.contracts.expiringSoon || 0} />
            <StatRow label="مستأجرون متأخرون" value={stats?.tenants.late || 0} />
            <StatRow label="طلبات صيانة معلقة" value={stats?.maintenance.pending || 0} />
            <StatRow label="وحدات شاغرة" value={stats?.units.available || 0} />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}