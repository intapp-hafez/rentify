import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Pencil, Trash2, FileDown } from "lucide-react";
import { useMemo, useRef } from "react";
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
import { getContracts, updateContract, deleteContract } from "@/api/contracts";
import { getPayments, type PaymentWithRelations } from "@/api/payments";
import { getUnits } from "@/api/units";
import { getTenants } from "@/api/tenants";
import {
  isBefore, startOfDay, addMonths, addQuarters,
  addYears, parseISO, isAfter, format, subDays,
} from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const contractStatuses = ["نشط", "عقد منتهي", "محجوز"];

const getContractStatus = (status: string | null, endDate: string | null) => {
  if (status === "نشط" && endDate && isBefore(new Date(endDate), startOfDay(new Date()))) {
    return "عقد منتهي";
  }
  return status || "نشط";
};

export const Route = createFileRoute("/contracts/$id")({
  head: () => ({ meta: [{ title: "تفاصيل العقد — Rentify" }] }),
  component: ContractDetail,
});

interface ScheduleRow {
  id: string;
  installment: number;
  payment_date: string;
  period_start: string;
  period_end: string;
  months: number;
  amount: number;
  status: "مدفوع" | "متأخر" | "مستحق";
  receipt_number: string | null;
  payment_method: string | null;
}

function ContractDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheduleRef = useRef<HTMLDivElement>(null);

  const { data: contracts = [], isLoading } = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: getPayments });
  const { data: units = [] } = useQuery({ queryKey: ["units"], queryFn: getUnits });
  const { data: tenants = [] } = useQuery({ queryKey: ["tenants"], queryFn: getTenants });

  const updateMutation = useMutation({
    mutationFn: updateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("تم تحديث العقد بنجاح");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("تم حذف العقد بنجاح");
      router.navigate({ to: "/contracts" });
    },
    onError: (e) => toast.error(e.message),
  });

  // ALL hooks must be called before any conditional return
  const contract = contracts.find((c) => c.id === id);

  const contractPayments = useMemo(
    () => payments.filter((p) => p.contract_id === id),
    [payments, id]
  );

  const paymentsByDate = useMemo(() => {
    const map = new Map<string, PaymentWithRelations>();
    contractPayments.forEach((p) => map.set(p.payment_date, p));
    return map;
  }, [contractPayments]);

  // Compute full payment schedule dynamically — recalculates whenever contract or payments change
  const schedule = useMemo<ScheduleRow[]>(() => {
    if (!contract?.start_date || !contract?.end_date) return [];

    const start = parseISO(contract.start_date);
    const end = parseISO(contract.end_date);
    const freq = contract.payment_frequency;
    const monthsPerPeriod =
      freq === "quarterly" || freq === "كل 3 شهور" || freq === "ربع سنوي" ? 3
      : freq === "semiannual" || freq === "كل 6 شهور" ? 6
      : freq === "yearly" || freq === "سنوي" ? 12
      : 1;
    const amount = contract.rent_amount * monthsPerPeriod;
    const today = startOfDay(new Date());

    const rows: ScheduleRow[] = [];
    let current = start;
    let installment = 1;

    while (!isAfter(current, end)) {
      const dateStr = format(current, "yyyy-MM-dd");
      const existing = paymentsByDate.get(dateStr);
      const nextStart = addMonths(current, monthsPerPeriod);
      // Period covered ends the day before the next installment (or contract end, whichever is earlier)
      const rawEnd = subDays(nextStart, 1);
      const periodEndActual = isAfter(rawEnd, end) ? end : rawEnd;

      let status: ScheduleRow["status"];
      if (existing?.status === "مدفوع") {
        status = "مدفوع";
      } else if (isBefore(current, today)) {
        status = "متأخر";
      } else {
        status = "مستحق";
      }

      rows.push({
        id: dateStr,
        installment,
        payment_date: dateStr,
        period_start: dateStr,
        period_end: format(periodEndActual, "yyyy-MM-dd"),
        months: monthsPerPeriod,
        amount,
        status,
        receipt_number: existing?.receipt_number ?? null,
        payment_method: existing?.payment_method ?? null,
      });

      installment++;
      current = addMonths(current, monthsPerPeriod);
    }

    return rows;
  }, [contract?.start_date, contract?.end_date, contract?.payment_frequency, contract?.rent_amount, paymentsByDate]);

  // ── Early returns AFTER all hooks ──
  if (isLoading) {
    return (
      <AppLayout title="جاري التحميل...">
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout title="العقد غير موجود">
        <EmptyState>
          لم يتم العثور على هذا العقد.{" "}
          <Button variant="link" onClick={() => router.navigate({ to: "/contracts" })}>
            العودة للعقود
          </Button>
        </EmptyState>
      </AppLayout>
    );
  }

  const dueRows = schedule.filter((r) => r.status === "مستحق" || r.status === "متأخر");
  const paidRows = schedule.filter((r) => r.status === "مدفوع");
  const totalScheduled = schedule.reduce((s, r) => s + r.amount, 0);
  const totalPaid = paidRows.reduce((s, r) => s + r.amount, 0);
  const totalDue = dueRows.reduce((s, r) => s + r.amount, 0);

  const monthsPerPeriod = schedule[0]?.months ?? 1;
  const perPaymentAmount = contract.rent_amount * monthsPerPeriod;
  const firstPeriod = schedule[0];

  const handleExportPdf = async () => {
    const node = scheduleRef.current;
    if (!node) return;
    toast.info("جاري تجهيز ملف PDF...");
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      pdf.save(`schedule-${contract.number || contract.id}.pdf`);
      toast.success("تم تصدير الجدول بصيغة PDF");
    } catch (e: any) {
      toast.error("فشل التصدير: " + (e?.message || "خطأ غير معروف"));
    }
  };

  const freqLabel =
    monthsPerPeriod === 1 ? "شهري"
    : monthsPerPeriod === 3 ? "كل 3 شهور"
    : monthsPerPeriod === 6 ? "كل 6 شهور"
    : "سنوي";

  const fields: CrudField[] = [
    { name: "number", label: "رقم العقد" },
    { name: "tenant_id", label: "المستأجر", type: "select", options: tenants.map((t) => ({ value: t.id, label: t.full_name })) },
    { name: "unit_id", label: "الوحدة", type: "select", options: units.map((u) => ({ value: u.id, label: `${u.title} - ${u.number || ""}` })) },
    { name: "start_date", label: "تاريخ البداية", type: "date" },
    { name: "end_date", label: "تاريخ النهاية", type: "date" },
    { name: "rent_amount", label: "الإيجار (شهري)", type: "number" },
    { name: "deposit", label: "التأمين", type: "number" },
    {
      name: "payment_frequency",
      label: "دورية الدفع",
      type: "select",
      options: [
        { value: "monthly", label: "شهري" },
        { value: "quarterly", label: "كل 3 شهور" },
        { value: "semiannual", label: "كل 6 شهور" },
        { value: "yearly", label: "سنوي" },
      ],
    },
    { name: "status", label: "الحالة", type: "select", options: contractStatuses },
  ];

  return (
    <AppLayout
      title={`عقد ${contract.number || "بدون رقم"}`}
      subtitle={`${contract.units?.title} - ${contract.units?.number || ""}`}
    >
      {/* Header actions */}
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link to="/contracts"><ArrowRight className="h-4 w-4" /> العقود</Link>
        </Button>
        <div className="flex gap-2">
          <CrudDialog
            title="تعديل عقد"
            fields={fields}
            initial={contract}
            onSubmit={(v) => updateMutation.mutate({ ...v, id: contract.id } as any)}
            trigger={<Button variant="outline" size="sm" className="gap-1"><Pencil className="h-4 w-4" /> تعديل</Button>}
          />
          <ConfirmDelete
            description={`سيتم حذف العقد "${contract.number || "بدون رقم"}".`}
            onConfirm={() => deleteMutation.mutate(contract.id)}
            trigger={<Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> حذف</Button>}
          />
        </div>
      </div>

      {/* Contract details */}
      <DetailGrid items={[
        { label: "المستأجر", value: contract.tenant_id ? <Link to="/tenants/$id" params={{ id: contract.tenant_id }} className="text-primary hover:underline">{contract.tenants?.full_name}</Link> : "—" },
        { label: "الوحدة", value: contract.unit_id ? <Link to="/units/$id" params={{ id: contract.unit_id }} className="text-primary hover:underline">{contract.units?.title} - {contract.units?.number || ""}</Link> : "—" },
        { label: "تاريخ البداية", value: contract.start_date },
        { label: "تاريخ النهاية", value: contract.end_date },
        { label: "دورية الدفع", value:
          contract.payment_frequency === "monthly" ? "شهري"
          : contract.payment_frequency === "quarterly" ? "كل 3 شهور"
          : contract.payment_frequency === "semiannual" ? "كل 6 شهور"
          : "سنوي" },
        { label: "الإيجار", value: egp(contract.rent_amount) },
        { label: "التأمين", value: egp(contract.deposit || 0) },
        { label: "الحالة", value: <StatusBadge status={getContractStatus(contract.status, contract.end_date)} /> },
      ]} />

      {/* Payment frequency summary */}
      {firstPeriod && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 text-sm font-semibold text-primary">ملخص دورية الدفع</div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">الدورية</div>
              <div className="font-semibold">{freqLabel}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">عدد الشهور لكل دفعة</div>
              <div className="font-semibold">{monthsPerPeriod} شهر</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">فترة أول قسط</div>
              <div className="font-semibold tabular-nums">{firstPeriod.period_start} → {firstPeriod.period_end}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">مبلغ الدفعة (محسوب)</div>
              <div className="font-bold text-primary">{egp(perPaymentAmount)}</div>
            </div>
          </div>
        </div>
      )}

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

      {/* Full schedule table */}
      <div className="mt-6 flex items-center justify-between">
        <SectionTitle>جدول الدفعات الكامل</SectionTitle>
        <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPdf} disabled={schedule.length === 0}>
          <FileDown className="h-4 w-4" /> تصدير PDF
        </Button>
      </div>
      {schedule.length === 0 ? (
        <EmptyState>لا يمكن حساب الجدول — تحقق من تواريخ العقد.</EmptyState>
      ) : (
        <div ref={scheduleRef} className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-right">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">بداية الفترة</th>
                <th className="px-4 py-3 font-semibold">نهاية الفترة</th>
                <th className="px-4 py-3 font-semibold">عدد الشهور</th>
                <th className="px-4 py-3 font-semibold">المبلغ</th>
                <th className="px-4 py-3 font-semibold">الإيصال</th>
                <th className="px-4 py-3 font-semibold">الطريقة</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border transition-colors last:border-0 ${
                    row.status === "مدفوع"
                      ? "bg-emerald-500/5"
                      : row.status === "متأخر"
                        ? "bg-red-500/5"
                        : ""
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-muted-foreground">{row.installment}</td>
                  <td className="px-4 py-3 tabular-nums">{row.period_start}</td>
                  <td className="px-4 py-3 tabular-nums">{row.period_end}</td>
                  <td className="px-4 py-3 tabular-nums">{row.months}</td>
                  <td className="px-4 py-3 font-semibold">{egp(row.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.receipt_number || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.payment_method || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    {row.status !== "مدفوع" && (
                      <PayNowDialog
                        contractId={contract.id}
                        amount={row.amount}
                        dueDate={row.payment_date}
                        installment={row.installment}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paid section */}
      <SectionTitle>سجل الدفعات المحصلة</SectionTitle>
      {paidRows.length === 0 ? (
        <EmptyState>لا توجد دفعات محصلة مسجلة.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-right">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3 font-semibold">المبلغ</th>
                <th className="px-4 py-3 font-semibold">الإيصال</th>
                <th className="px-4 py-3 font-semibold">الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {paidRows.map((row) => (
                <tr key={row.id} className="border-b border-border bg-emerald-500/5 last:border-0">
                  <td className="px-4 py-3 font-bold text-muted-foreground">{row.installment}</td>
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
