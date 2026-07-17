import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2, FileText, Wallet, Users, Wrench,
  TrendingUp, TrendingDown, Download,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getReportStats } from "@/api/analytics";
import { getPayments, type PaymentWithRelations } from "@/api/payments";
import { getContracts, type ContractWithRelations } from "@/api/contracts";
import { getUnits } from "@/api/units";
import { getMaintenanceRequests, type MaintenanceWithRelations } from "@/api/maintenance";
import { egp } from "@/lib/mockData";
import { exportToExcel } from "@/lib/excel";
import { addDays, differenceInDays, format, isBefore, startOfDay } from "date-fns";
import type { Database } from "@/types/database.types";

type UnitRow = Database["public"]["Tables"]["units"]["Row"];

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "التقارير — Rentify" }] }),
  component: Reports,
});

const statusTranslations: Record<string, string> = {
  available: "متاح",
  rented: "مؤجر",
  maintenance: "تحت الصيانة",
};

function SectionHeader({ title, onExport }: { title: string; onExport: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-bold text-foreground">{title}</h3>
      <Button variant="outline" size="sm" className="gap-1 text-muted-foreground" onClick={onExport}>
        <Download className="h-4 w-4" /> تصدير
      </Button>
    </div>
  );
}

function EmptyTable({ msg }: { msg: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {msg}
    </div>
  );
}

function Reports() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["report-stats"],
    queryFn: getReportStats,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: getPayments,
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: getContracts,
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["units"],
    queryFn: getUnits,
  });

  const { data: maintenance = [], isLoading: loadingMaint } = useQuery({
    queryKey: ["maintenance"],
    queryFn: getMaintenanceRequests,
  });

  const today = new Date();
  const in60Days = addDays(today, 60);

  // Derived lists
  const overduePayments = payments.filter((p) => p.status === "متأخر");
  const duePayments = payments.filter((p) => p.status === "مستحق");
  const collectedPayments = payments.filter((p) => p.status === "مدفوع");

  const expiringContracts = contracts.filter(
    (c) => c.status === "نشط" && c.end_date &&
      !isBefore(new Date(c.end_date), startOfDay(today)) &&
      isBefore(new Date(c.end_date), in60Days)
  );
  const expiredContracts = contracts.filter((c) => {
    if (c.end_date && isBefore(new Date(c.end_date), startOfDay(today))) return true;
    return c.status === "عقد منتهي";
  });

  const vacantUnits = units.filter((u) => u.status === "available");
  const maintenanceUnits = units.filter((u) => u.status === "maintenance");

  const pendingMaint = maintenance.filter((m) =>
    ["جديد", "مفتوح", "pending"].includes(m.status || "")
  );

  const maxRev = stats ? Math.max(...stats.payments.monthly.map((m) => m.value), 1) : 1;
  const occupancy = stats?.units.total ? Math.round((stats.units.rented / stats.units.total) * 100) : 0;

  // Table column definitions
  const paymentColumns: Column<PaymentWithRelations>[] = [
    { key: "receipt_number", header: "الإيصال", render: (r) => r.receipt_number || "-" },
    { key: "tenant", header: "المستأجر", render: (r) => r.contracts?.tenants?.full_name || "-" },
    { key: "unit", header: "الوحدة", render: (r) => `${r.contracts?.units?.title || "-"} ${r.contracts?.units?.number ? `- ${r.contracts.units.number}` : ""}` },
    { key: "amount", header: "المبلغ", render: (r) => egp(r.amount) },
    { key: "payment_date", header: "التاريخ", render: (r) => r.payment_date },
    { key: "payment_method", header: "الطريقة", render: (r) => r.payment_method || "-" },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "مدفوع"} /> },
  ];

  const overdueColumns: Column<PaymentWithRelations>[] = [
    { key: "tenant", header: "المستأجر", render: (r) => r.contracts?.tenants?.full_name || "-" },
    { key: "unit", header: "الوحدة", render: (r) => `${r.contracts?.units?.title || "-"} ${r.contracts?.units?.number ? `- ${r.contracts.units.number}` : ""}` },
    { key: "amount", header: "المبلغ المتأخر", render: (r) => <span className="font-bold text-destructive">{egp(r.amount)}</span> },
    { key: "payment_date", header: "كان مستحقاً في", render: (r) => r.payment_date },
    { key: "delay", header: "أيام التأخير", render: (r) => {
      const days = differenceInDays(today, new Date(r.payment_date));
      return <span className="font-bold text-destructive">{days > 0 ? `${days} يوم` : "-"}</span>;
    }},
  ];

  const contractColumns: Column<ContractWithRelations>[] = [
    { key: "number", header: "رقم العقد", render: (r) => <Link to="/contracts/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.number || "بدون رقم"}</Link> },
    { key: "tenant", header: "المستأجر", render: (r) => r.tenants?.full_name || "-" },
    { key: "unit", header: "الوحدة", render: (r) => `${r.units?.title || "-"} - ${r.units?.number || ""}` },
    { key: "end_date", header: "تاريخ الانتهاء", render: (r) => r.end_date },
    { key: "days_left", header: "المتبقي", render: (r) => {
      const days = differenceInDays(new Date(r.end_date!), today);
      const color = days <= 14 ? "text-destructive" : days <= 30 ? "text-warning" : "text-foreground";
      return <span className={`font-bold ${color}`}>{days >= 0 ? `${days} يوم` : "منتهي"}</span>;
    }},
    { key: "rent_amount", header: "الإيجار", render: (r) => egp(r.rent_amount) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "نشط"} /> },
  ];

  const unitColumns: Column<UnitRow>[] = [
    { key: "number", header: "رقم الوحدة", render: (r) => <Link to="/units/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.number || "-"}</Link> },
    { key: "title", header: "العقار", render: (r) => r.title },
    { key: "type", header: "النوع", render: (r) => r.type },
    { key: "city", header: "المدينة", render: (r) => (r as any).city || "-" },
    { key: "floor", header: "الطابق", render: (r) => r.floor || "-" },
    { key: "area", header: "المساحة", render: (r) => r.area ? `${r.area} م²` : "-" },
    { key: "rent_price", header: "الإيجار", render: (r) => egp(r.rent_price) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={statusTranslations[r.status] || r.status} /> },
  ];

  const maintenanceColumns: Column<MaintenanceWithRelations>[] = [
    { key: "number", header: "رقم الطلب", render: (r) => r.number || "-" },
    { key: "unit", header: "الوحدة", render: (r) => r.units ? `${r.units.title} - ${r.units.number || ""}` : "-" },
    { key: "type", header: "النوع", render: (r) => r.type || "-" },
    { key: "description", header: "الوصف", render: (r) => <span className="max-w-xs truncate block">{r.description || "-"}</span> },
    { key: "priority", header: "الأولوية", render: (r) => r.priority || "-" },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "جديد"} /> },
  ];

  // Export helpers
  const exportOverdue = () => exportToExcel(
    overduePayments.map((p) => ({
      "المستأجر": p.contracts?.tenants?.full_name || "-",
      "الوحدة": `${p.contracts?.units?.title || "-"} - ${p.contracts?.units?.number || ""}`,
      "المبلغ": p.amount,
      "تاريخ الاستحقاق": p.payment_date,
      "أيام التأخير": differenceInDays(today, new Date(p.payment_date)),
    })),
    "تقرير_المتأخرات"
  );

  const exportExpiring = () => exportToExcel(
    expiringContracts.map((c) => ({
      "رقم العقد": c.number,
      "المستأجر": c.tenants?.full_name || "-",
      "الوحدة": `${c.units?.title || "-"} - ${c.units?.number || ""}`,
      "تاريخ الانتهاء": c.end_date,
      "الأيام المتبقية": differenceInDays(new Date(c.end_date!), today),
      "الإيجار": c.rent_amount,
    })),
    "تقرير_العقود_المنتهية"
  );

  const exportVacant = () => exportToExcel(
    vacantUnits.map((u) => ({
      "رقم الوحدة": u.number,
      "العقار": u.title,
      "النوع": u.type,
      "المدينة": (u as any).city || "-",
      "الطابق": u.floor || "-",
      "المساحة": u.area ? `${u.area} م²` : "-",
      "الإيجار": u.rent_price,
    })),
    "تقرير_الوحدات_الشاغرة"
  );

  const exportMaintenance = () => exportToExcel(
    pendingMaint.map((m) => ({
      "رقم الطلب": m.number,
      "الوحدة": m.units ? `${m.units.title} - ${m.units.number || ""}` : "-",
      "النوع": m.type,
      "الوصف": m.description,
      "الأولوية": m.priority,
      "الحالة": m.status,
    })),
    "تقرير_الصيانة_المعلقة"
  );

  const isLoading = loadingStats || loadingPayments || loadingContracts || loadingUnits || loadingMaint;

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
        {stats && stats.payments.monthly.every((m) => m.value === 0) ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            لا توجد إيرادات مسجلة بعد — ابدأ بتسجيل دفعات في صفحة التحصيلات
          </div>
        ) : (
          <div className="flex h-52 items-end gap-3">
            {stats?.payments.monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{m.value > 0 ? egp(m.value) : ""}</span>
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

      {/* Detailed Tables */}
      <div className="mt-6">
        <Tabs defaultValue="financial">
          <TabsList className="mb-4 flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="financial" className="gap-1">
              <Wallet className="h-4 w-4" /> التقرير المالي
              {overduePayments.length > 0 && (
                <span className="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {overduePayments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1">
              <FileText className="h-4 w-4" /> العقود
              {expiringContracts.length > 0 && (
                <span className="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground">
                  {expiringContracts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-1">
              <Building2 className="h-4 w-4" /> الوحدات
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1">
              <Wrench className="h-4 w-4" /> الصيانة
              {pendingMaint.length > 0 && (
                <span className="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {pendingMaint.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card className="p-5">
              <SectionHeader title={`الدفعات المتأخرة (${overduePayments.length})`} onExport={exportOverdue} />
              {overduePayments.length ? (
                <DataTable columns={overdueColumns} rows={overduePayments} />
              ) : (
                <EmptyTable msg="لا توجد دفعات متأخرة — ممتاز!" />
              )}
            </Card>

            <Card className="p-5">
              <SectionHeader
                title={`الدفعات المستحقة (${duePayments.length})`}
                onExport={() => exportToExcel(
                  duePayments.map((p) => ({
                    "المستأجر": p.contracts?.tenants?.full_name || "-",
                    "الوحدة": `${p.contracts?.units?.title || "-"} - ${p.contracts?.units?.number || ""}`,
                    "المبلغ": p.amount,
                    "تاريخ الاستحقاق": p.payment_date,
                  })),
                  "تقرير_الدفعات_المستحقة"
                )}
              />
              {duePayments.length ? (
                <DataTable columns={paymentColumns} rows={duePayments} />
              ) : (
                <EmptyTable msg="لا توجد دفعات مستحقة." />
              )}
            </Card>

            <Card className="p-5">
              <SectionHeader
                title={`سجل التحصيلات (${collectedPayments.length})`}
                onExport={() => exportToExcel(
                  collectedPayments.map((p) => ({
                    "الإيصال": p.receipt_number,
                    "المستأجر": p.contracts?.tenants?.full_name || "-",
                    "المبلغ": p.amount,
                    "التاريخ": p.payment_date,
                    "الطريقة": p.payment_method,
                  })),
                  "تقرير_التحصيلات"
                )}
              />
              {collectedPayments.length ? (
                <DataTable columns={paymentColumns} rows={collectedPayments} />
              ) : (
                <EmptyTable msg="لا توجد تحصيلات مسجلة." />
              )}
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card className="p-5">
              <SectionHeader title={`عقود تنتهي خلال 60 يوم (${expiringContracts.length})`} onExport={exportExpiring} />
              {expiringContracts.length ? (
                <DataTable columns={contractColumns} rows={expiringContracts} />
              ) : (
                <EmptyTable msg="لا توجد عقود تنتهي خلال 60 يوم." />
              )}
            </Card>

            <Card className="p-5">
              <SectionHeader
                title={`العقود المنتهية (${expiredContracts.length})`}
                onExport={() => exportToExcel(
                  expiredContracts.map((c) => ({
                    "رقم العقد": c.number,
                    "المستأجر": c.tenants?.full_name || "-",
                    "الوحدة": `${c.units?.title || "-"} - ${c.units?.number || ""}`,
                    "تاريخ الانتهاء": c.end_date,
                    "الإيجار": c.rent_amount,
                  })),
                  "تقرير_العقود_المنتهية"
                )}
              />
              {expiredContracts.length ? (
                <DataTable columns={contractColumns} rows={expiredContracts} />
              ) : (
                <EmptyTable msg="لا توجد عقود منتهية." />
              )}
            </Card>
          </TabsContent>

          {/* Units Tab */}
          <TabsContent value="units" className="space-y-6">
            <Card className="p-5">
              <SectionHeader title={`الوحدات الشاغرة (${vacantUnits.length})`} onExport={exportVacant} />
              {vacantUnits.length ? (
                <DataTable columns={unitColumns} rows={vacantUnits} />
              ) : (
                <EmptyTable msg="لا توجد وحدات شاغرة." />
              )}
            </Card>

            <Card className="p-5">
              <SectionHeader
                title={`وحدات تحت الصيانة (${maintenanceUnits.length})`}
                onExport={() => exportToExcel(
                  maintenanceUnits.map((u) => ({
                    "رقم الوحدة": u.number,
                    "العقار": u.title,
                    "النوع": u.type,
                    "المدينة": (u as any).city || "-",
                    "الإيجار": u.rent_price,
                  })),
                  "تقرير_وحدات_الصيانة"
                )}
              />
              {maintenanceUnits.length ? (
                <DataTable columns={unitColumns} rows={maintenanceUnits} />
              ) : (
                <EmptyTable msg="لا توجد وحدات تحت الصيانة." />
              )}
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card className="p-5">
              <SectionHeader title={`طلبات الصيانة المعلقة (${pendingMaint.length})`} onExport={exportMaintenance} />
              {pendingMaint.length ? (
                <DataTable columns={maintenanceColumns} rows={pendingMaint} />
              ) : (
                <EmptyTable msg="لا توجد طلبات صيانة معلقة." />
              )}
            </Card>

            <Card className="p-5">
              <SectionHeader
                title={`كل طلبات الصيانة (${maintenance.length})`}
                onExport={() => exportToExcel(
                  maintenance.map((m) => ({
                    "رقم الطلب": m.number,
                    "الوحدة": m.units ? `${m.units.title} - ${m.units.number || ""}` : "-",
                    "النوع": m.type,
                    "الوصف": m.description,
                    "الأولوية": m.priority,
                    "الحالة": m.status,
                  })),
                  "تقرير_الصيانة_الكامل"
                )}
              />
              {maintenance.length ? (
                <DataTable columns={maintenanceColumns} rows={maintenance} />
              ) : (
                <EmptyTable msg="لا توجد طلبات صيانة." />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
