import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailGrid, SectionTitle, EmptyState } from "@/components/DetailField";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { PayNowDialog } from "@/components/PayNowDialog";
import { egp } from "@/lib/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTenants, updateTenant, deleteTenant } from "@/api/tenants";
import { getContracts, type ContractWithRelations } from "@/api/contracts";
import { getPayments } from "@/api/payments";
import {
  isBefore, startOfDay, addMonths, addQuarters,
  addYears, parseISO, isAfter, format,
} from "date-fns";

const getContractStatus = (status: string | null, endDate: string | null) => {
  if (status === "نشط" && endDate && isBefore(new Date(endDate), startOfDay(new Date()))) {
    return "عقد منتهي";
  }
  return status || "نشط";
};

export const Route = createFileRoute("/tenants/$id")({
  head: () => ({ meta: [{ title: "تفاصيل العميل — Rentify" }] }),
  component: TenantDetail,
});

interface ScheduleRow {
  id: string;
  contractId: string;
  contractNumber: string | null;
  unitTitle: string;
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
        unitTitle: `${contract.units?.title ?? ""} - ${contract.units?.number ?? ""}`,
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

function TenantDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({ queryKey: ["tenants"], queryFn: getTenants });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم تحديث بيانات المستأجر بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم حذف المستأجر بنجاح");
      router.navigate({ to: "/tenants" });
    },
    onError: (error) => toast.error(error.message),
  });

  // All hooks before early returns
  const tenant = tenants.find((t) => t.id === id);
  const tenantContracts = useMemo(() => contracts.filter((c) => c.tenant_id === id), [contracts, id]);

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
    () => buildSchedule(tenantContracts, paymentsByDate),
    [tenantContracts, paymentsByDate]
  );

  const dueRows = useMemo(() => schedule.filter((r) => r.status === "مستحق" || r.status === "متأخر"), [schedule]);
  const paidRows = useMemo(() => schedule.filter((r) => r.status === "مدفوع"), [schedule]);

  // ── Early returns after all hooks ──
  if (isLoading) {
    return (
      <AppLayout title="جاري التحميل...">
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tenant) {
    return (
      <AppLayout title="العميل غير موجود">
        <EmptyState>
          لم يتم العثور على هذا العميل.{" "}
          <Button variant="link" onClick={() => router.navigate({ to: "/tenants" })}>العودة للعملاء</Button>
        </EmptyState>
      </AppLayout>
    );
  }

  const totalDue = dueRows.reduce((s, r) => s + r.amount, 0);
  const totalPaid = paidRows.reduce((s, r) => s + r.amount, 0);
  const totalScheduled = schedule.reduce((s, r) => s + r.amount, 0);

  const contractColumns: Column<ContractWithRelations>[] = [
    { key: "number", header: "رقم العقد", render: (r) => <Link to="/contracts/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.number || "بدون رقم"}</Link> },
    { key: "unit", header: "الوحدة", render: (r) => `${r.units?.title} - ${r.units?.number || ""}` },
    { key: "start", header: "البداية", render: (r) => r.start_date },
    { key: "end", header: "النهاية", render: (r) => r.end_date },
    { key: "rent", header: "الإيجار", render: (r) => egp(r.rent_amount) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={getContractStatus(r.status, r.end_date)} /> },
  ];

  const fields: CrudField[] = [
    { name: "full_name", label: "الاسم", colSpan: 2 },
    { name: "civil_id", label: "الرقم القومي / المدني" },
    { name: "phone", label: "الهاتف" },
    { name: "email", label: "البريد الإلكتروني" },
    { name: "job", label: "جهة العمل" },
    { name: "status", label: "الحالة", type: "select", options: ["نشط", "متأخر بالسداد"] },
  ];

  return (
    <AppLayout title={tenant.full_name} subtitle={tenant.job || "عميل / مستأجر"}>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link to="/tenants"><ArrowRight className="h-4 w-4" /> العملاء</Link>
        </Button>
        <div className="flex gap-2">
          <CrudDialog
            title="تعديل مستأجر"
            fields={fields}
            initial={tenant}
            onSubmit={(v) => updateMutation.mutate({ ...v, id: tenant.id } as any)}
            trigger={<Button variant="outline" size="sm" className="gap-1"><Pencil className="h-4 w-4" /> تعديل</Button>}
          />
          <ConfirmDelete
            description={`سيتم حذف المستأجر "${tenant.full_name}".`}
            onConfirm={() => deleteMutation.mutate(tenant.id)}
            trigger={<Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> حذف</Button>}
          />
        </div>
      </div>

      <DetailGrid items={[
        { label: "الرقم القومي", value: tenant.civil_id || "-" },
        { label: "الهاتف", value: <span dir="ltr" className="inline-block">{tenant.phone || "-"}</span> },
        { label: "البريد الإلكتروني", value: tenant.email || "-" },
        { label: "جهة العمل", value: tenant.job || "-" },
        { label: "الحالة", value: <StatusBadge status={tenant.status || "نشط"} /> },
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

      <SectionTitle>العقود</SectionTitle>
      {tenantContracts.length
        ? <DataTable columns={contractColumns} rows={tenantContracts} />
        : <EmptyState>لا توجد عقود مسجلة لهذا العميل.</EmptyState>}

      {/* Due / Overdue schedule */}
      <SectionTitle>جدول الدفعات المستحقة / المتأخرة</SectionTitle>
      {dueRows.length === 0 ? (
        <EmptyState>لا توجد دفعات مستحقة أو متأخرة.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-right">
                <th className="px-4 py-3 font-semibold">الوحدة</th>
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
                  <td className="px-4 py-3">
                    <Link to="/contracts/$id" params={{ id: row.contractId }} className="text-primary hover:underline text-xs">
                      {row.unitTitle}
                    </Link>
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
                <th className="px-4 py-3 font-semibold">الوحدة</th>
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
                    <Link to="/contracts/$id" params={{ id: row.contractId }} className="text-primary hover:underline">
                      {row.unitTitle}
                    </Link>
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
