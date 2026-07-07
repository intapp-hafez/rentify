import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailGrid, SectionTitle, EmptyState } from "@/components/DetailField";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { PayNowDialog } from "@/components/PayNowDialog";
import { egp } from "@/lib/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getUnits, updateUnit, deleteUnit } from "@/api/units";
import { getContracts, type ContractWithRelations } from "@/api/contracts";
import { getPayments } from "@/api/payments";
import { getAllSettings } from "@/api/settings";
import {
  isBefore, startOfDay, addMonths, addQuarters,
  addYears, parseISO, isAfter, format,
} from "date-fns";

export const Route = createFileRoute("/units/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الوحدة — Rentify" }] }),
  component: UnitDetail,
});

interface ScheduleRow {
  id: string;
  contractId: string;
  contractNumber: string | null;
  tenantName: string;
  installment: number;
  payment_date: string;
  amount: number;
  status: "مدفوع" | "متأخر" | "مستحق";
  receipt_number: string | null;
  payment_method: string | null;
}

function buildSchedule(
  contracts: ContractWithRelations[],
  paymentsByDate: Map<string, Map<string, { status: string; receipt_number: string | null; payment_method: string | null }>>
): ScheduleRow[] {
  const today = startOfDay(new Date());
  const rows: ScheduleRow[] = [];

  for (const contract of contracts) {
    if (!contract.start_date || !contract.end_date) continue;

    const start = parseISO(contract.start_date);
    const end = parseISO(contract.end_date);
    const freq = contract.payment_frequency;
    const amount = contract.rent_amount;
    const contractDateMap = paymentsByDate.get(contract.id) ?? new Map();

    let current = start;
    let installment = 1;

    while (!isAfter(current, end)) {
      const dateStr = format(current, "yyyy-MM-dd");
      const existing = contractDateMap.get(dateStr);

      let status: ScheduleRow["status"];
      if (existing?.status === "مدفوع") {
        status = "مدفوع";
      } else if (isBefore(current, today)) {
        status = "متأخر";
      } else {
        status = "مستحق";
      }

      rows.push({
        id: `${contract.id}-${dateStr}`,
        contractId: contract.id,
        contractNumber: contract.number,
        tenantName: contract.tenants?.full_name ?? "—",
        installment,
        payment_date: dateStr,
        amount,
        status,
        receipt_number: existing?.receipt_number ?? null,
        payment_method: existing?.payment_method ?? null,
      });

      installment++;
      if (freq === "monthly" || freq === "شهري") current = addMonths(current, 1);
      else if (freq === "quarterly" || freq === "ربع سنوي") current = addQuarters(current, 1);
      else current = addYears(current, 1);
    }
  }

  // Sort by date descending (most recent first)
  return rows.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
}

function UnitDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading: loadingUnits } = useQuery({ queryKey: ["units"], queryFn: getUnits });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: getPayments });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getAllSettings });

  const updateMutation = useMutation({
    mutationFn: updateUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("تم تحديث الوحدة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("تم حذف الوحدة بنجاح");
      router.navigate({ to: "/units" });
    },
    onError: (error) => toast.error(error.message),
  });

  // All hooks before early returns
  const unit = units.find((u) => u.id === id);
  const unitContracts = useMemo(() => contracts.filter((c) => c.unit_id === id), [contracts, id]);
  const currentContract = useMemo(() => unitContracts.find(c => c.status !== 'terminated'), [unitContracts]);

  // Build contract -> date -> payment map
  const paymentsByDate = useMemo(() => {
    const map = new Map<string, Map<string, { status: string; receipt_number: string | null; payment_method: string | null }>>();
    for (const p of payments) {
      if (!p.contract_id) continue;
      if (!map.has(p.contract_id)) map.set(p.contract_id, new Map());
      map.get(p.contract_id)!.set(p.payment_date, {
        status: p.status,
        receipt_number: p.receipt_number,
        payment_method: p.payment_method,
      });
    }
    return map;
  }, [payments]);

  const schedule = useMemo(
    () => buildSchedule(unitContracts, paymentsByDate),
    [unitContracts, paymentsByDate]
  );

  const dueRows = useMemo(() => schedule.filter((r) => r.status === "مستحق" || r.status === "متأخر"), [schedule]);
  const paidRows = useMemo(() => schedule.filter((r) => r.status === "مدفوع"), [schedule]);

  // ── Early returns after all hooks ──
  if (loadingUnits) {
    return (
      <AppLayout title="جاري التحميل...">
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!unit) {
    return (
      <AppLayout title="الوحدة غير موجودة">
        <EmptyState>
          لم يتم العثور على هذه الوحدة.{" "}
          <Button variant="link" onClick={() => router.navigate({ to: "/units" })}>العودة للوحدات</Button>
        </EmptyState>
      </AppLayout>
    );
  }

  const totalDue = dueRows.reduce((s, r) => s + r.amount, 0);
  const totalPaid = paidRows.reduce((s, r) => s + r.amount, 0);
  const totalScheduled = schedule.reduce((s, r) => s + r.amount, 0);

  const fields: CrudField[] = [
    { name: "number", label: "رقم الوحدة" },
    { name: "title", label: "اسم العقار / العنوان", colSpan: 2 },
    {
      name: "type",
      label: "النوع",
      type: "select",
      options: (settings?.property_types?.length
        ? settings.property_types
        : ["شقق سكنية", "فيلات", "مكاتب", "محلات تجارية", "مستودعات", "أراضي"]
      ),
    },
    {
      name: "city",
      label: "المدينة / المحافظة",
      type: "select",
      options: (settings?.governorates?.length
        ? settings.governorates
        : ["القاهرة", "الجيزة", "الإسكندرية"]
      ),
    },
    { name: "address", label: "العنوان التفصيلي" },
    { name: "floor", label: "الطابق", hidden: (v) => ["مستودعات", "أراضي"].includes(v.type) },
    { name: "area", label: "المساحة (م²)", type: "number" },
    { name: "rooms", label: "الغرف", type: "number", hidden: (v) => ["مستودعات", "أراضي", "محلات تجارية"].includes(v.type) },
    { name: "baths", label: "الحمامات", type: "number", hidden: (v) => ["مستودعات", "أراضي"].includes(v.type) },
    { name: "status", label: "الحالة", type: "select", options: ["available", "rented", "maintenance"] },
    { name: "rent_price", label: "الإيجار", type: "number" },
  ];

  return (
    <AppLayout title={`وحدة ${unit.number || 'بدون رقم'}`} subtitle={unit.title}>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link to="/units"><ArrowRight className="h-4 w-4" /> الوحدات</Link>
        </Button>
        <div className="flex gap-2">
          <CrudDialog 
            title="تعديل وحدة" 
            fields={fields} 
            initial={unit} 
            maxWidth="max-w-2xl"
            onSubmit={(v) => updateMutation.mutate({ ...v, id: unit.id } as any)}
            trigger={<Button variant="outline" size="sm" className="gap-1"><Pencil className="h-4 w-4" /> تعديل</Button>} 
          />
          <ConfirmDelete 
            description={`سيتم حذف الوحدة "${unit.number || unit.title}".`} 
            onConfirm={() => deleteMutation.mutate(unit.id)}
            trigger={<Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> حذف</Button>} 
          />
        </div>
      </div>
      <DetailGrid items={[
        { label: "العقار", value: unit.title },
        { label: "النوع", value: unit.type },
        { label: "المدينة", value: unit.city || "-" },
        { label: "العنوان التفصيلي", value: unit.address || "-" },
        { label: "الطابق", value: unit.floor || "-" },
        { label: "المساحة", value: unit.area ? `${unit.area} م²` : "-" },
        { label: "الغرف", value: unit.rooms || "-" },
        { label: "الحمامات", value: unit.baths || "-" },
        { label: "الإيجار", value: egp(unit.rent_price) },
        { label: "الحالة", value: <StatusBadge status={unit.status || "متاح"} /> },
        { label: "العقد الحالي", value: currentContract ? <Link to="/contracts/$id" params={{ id: currentContract.id }} className="text-primary hover:underline">{currentContract.number || 'عرض العقد'}</Link> : "—" },
        { label: "المستأجر الحالي", value: currentContract?.tenants?.full_name ?? "—" },
      ]} />

      {/* Summary cards */}
      <div className="my-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">إجمالي الجدول</p>
          <p className="text-lg font-bold">{egp(totalScheduled)}</p>
          <p className="text-xs text-muted-foreground">{schedule.length} قسط</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs text-emerald-700">تم التحصيل</p>
          <p className="text-lg font-bold text-emerald-700">{egp(totalPaid)}</p>
          <p className="text-xs text-emerald-700">{paidRows.length} دفعة</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-700">المتبقي</p>
          <p className="text-lg font-bold text-amber-700">{egp(totalDue)}</p>
          <p className="text-xs text-amber-700">{dueRows.length} دفعة</p>
        </div>
      </div>

      {/* Due / Overdue schedule */}
      <SectionTitle>جدول الدفعات المستحقة / المتأخرة</SectionTitle>
      {dueRows.length === 0 ? (
        <EmptyState>لا توجد دفعات مستحقة أو متأخرة.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-right">
                <th className="px-4 py-3 font-semibold">المستأجر</th>
                <th className="px-4 py-3 font-semibold">تاريخ الاستحقاق</th>
                <th className="px-4 py-3 font-semibold">المبلغ</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {dueRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 ${row.status === "متأخر" ? "bg-red-500/5" : ""}`}
                >
                  <td className="px-4 py-3 text-xs">
                    {row.tenantName}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.payment_date}</td>
                  <td className="px-4 py-3 font-semibold">{egp(row.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    <PayNowDialog
                      contractId={row.contractId}
                      amount={row.amount}
                      dueDate={row.payment_date}
                      installment={row.installment}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paid schedule */}
      <SectionTitle>سجل الدفعات المحصلة</SectionTitle>
      {paidRows.length === 0 ? (
        <EmptyState>لا توجد دفعات محصلة.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-right">
                <th className="px-4 py-3 font-semibold">المستأجر</th>
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3 font-semibold">المبلغ</th>
                <th className="px-4 py-3 font-semibold">الإيصال</th>
                <th className="px-4 py-3 font-semibold">الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {paidRows.map((row) => (
                <tr key={row.id} className="border-b border-border bg-emerald-500/5 last:border-0">
                  <td className="px-4 py-3 text-xs">
                    {row.tenantName}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.payment_date}</td>
                  <td className="px-4 py-3 font-semibold">{egp(row.amount)}</td>
                  <td className="px-4 py-3">{row.receipt_number || "—"}</td>
                  <td className="px-4 py-3">{row.payment_method || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
