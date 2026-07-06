import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailGrid, SectionTitle, EmptyState } from "@/components/DetailField";
import { egp } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";
import { getContracts } from "@/api/contracts";
import { getPayments, type PaymentWithRelations } from "@/api/payments";
import { isBefore, startOfDay } from "date-fns";

const getContractStatus = (status: string | null, endDate: string | null) => {
  if (status === "نشط" && endDate) {
    if (isBefore(new Date(endDate), startOfDay(new Date()))) {
      return "عقد منتهي";
    }
  }
  return status || "نشط";
};

export const Route = createFileRoute("/contracts/$id")({
  head: () => ({ meta: [{ title: "تفاصيل العقد — Rentify" }] }),
  component: ContractDetail,
});

function ContractDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data: contracts = [], isLoading } = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  if (isLoading) {
    return <AppLayout title="جاري التحميل..."><div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div></AppLayout>;
  }

  const contract = contracts.find((c) => c.id === id);

  if (!contract) {
    return (
      <AppLayout title="العقد غير موجود">
        <EmptyState>لم يتم العثور على هذا العقد. <Button variant="link" onClick={() => router.navigate({ to: "/contracts" })}>العودة للعقود</Button></EmptyState>
      </AppLayout>
    );
  }

  const contractPayments = payments.filter((p) => p.contract_id === contract.id);
  const paidPayments = contractPayments.filter(p => p.status === 'مدفوع');
  const duePayments = contractPayments.filter(p => p.status === 'مستحق' || p.status === 'متأخر');

  const payColumns: Column<PaymentWithRelations>[] = [
    { key: "receipt_number", header: "الإيصال", render: (r) => r.receipt_number || "-" },
    { key: "amount", header: "المبلغ", render: (r) => egp(r.amount) },
    { key: "payment_method", header: "الطريقة", render: (r) => r.payment_method || "-" },
    { key: "payment_date", header: "التاريخ", render: (r) => r.payment_date },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "مدفوع"} /> },
  ];

  return (
    <AppLayout title={`عقد ${contract.number || 'بدون رقم'}`} subtitle={`${contract.units?.title} - ${contract.units?.number || ''}`}>
      <Button asChild variant="outline" size="sm" className="mb-4 gap-1">
        <Link to="/contracts"><ArrowRight className="h-4 w-4" /> العقود</Link>
      </Button>
      <DetailGrid items={[
        { label: "المستأجر", value: contract.tenant_id ? <Link to="/tenants/$id" params={{ id: contract.tenant_id }} className="text-primary hover:underline">{contract.tenants?.full_name}</Link> : "—" },
        { label: "الوحدة", value: contract.unit_id ? <Link to="/units/$id" params={{ id: contract.unit_id }} className="text-primary hover:underline">{contract.units?.title} - {contract.units?.number || ''}</Link> : "—" },
        { label: "تاريخ البداية", value: contract.start_date },
        { label: "تاريخ النهاية", value: contract.end_date },
        { label: "دورية الدفع", value: contract.payment_frequency === 'monthly' ? 'شهري' : contract.payment_frequency === 'quarterly' ? 'ربع سنوي' : 'سنوي' },
        { label: "الإيجار", value: egp(contract.rent_amount) },
        { label: "التأمين", value: egp(contract.deposit || 0) },
        { label: "الحالة", value: <StatusBadge status={getContractStatus(contract.status, contract.end_date)} /> },
      ]} />
      
      <SectionTitle>الدفعات المستحقة / المتأخرة</SectionTitle>
      {duePayments.length ? <DataTable columns={payColumns} rows={duePayments} /> : <EmptyState>لا توجد دفعات مستحقة مسجلة.</EmptyState>}
      
      <SectionTitle>سجل الدفعات المحصلة</SectionTitle>
      {paidPayments.length ? <DataTable columns={payColumns} rows={paidPayments} /> : <EmptyState>لا توجد دفعات محصلة مسجلة.</EmptyState>}
    </AppLayout>
  );
}
