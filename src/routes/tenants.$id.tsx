import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailGrid, SectionTitle, EmptyState } from "@/components/DetailField";
import { egp } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";
import { getTenants } from "@/api/tenants";
import { getContracts, type ContractWithRelations } from "@/api/contracts";
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

export const Route = createFileRoute("/tenants/$id")({
  head: () => ({ meta: [{ title: "تفاصيل العميل — Rentify" }] }),
  component: TenantDetail,
});

function TenantDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data: tenants = [], isLoading } = useQuery({ queryKey: ["tenants"], queryFn: getTenants });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  if (isLoading) {
    return <AppLayout title="جاري التحميل..."><div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div></AppLayout>;
  }

  const tenant = tenants.find((t) => t.id === id);

  if (!tenant) {
    return (
      <AppLayout title="العميل غير موجود">
        <EmptyState>لم يتم العثور على هذا العميل. <Button variant="link" onClick={() => router.navigate({ to: "/tenants" })}>العودة للعملاء</Button></EmptyState>
      </AppLayout>
    );
  }

  const tenantContracts = contracts.filter((c) => c.tenant_id === tenant.id);
  
  // Find all payments tied to this tenant's contracts
  const tenantContractIds = tenantContracts.map(c => c.id);
  const tenantPayments = payments.filter((p) => tenantContractIds.includes(p.contract_id));
  
  const paidPayments = tenantPayments.filter(p => p.status === 'مدفوع');
  const duePayments = tenantPayments.filter(p => p.status === 'مستحق' || p.status === 'متأخر');

  const contractColumns: Column<ContractWithRelations>[] = [
    { key: "number", header: "رقم العقد", render: (r) => <Link to="/contracts/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.number || "بدون رقم"}</Link> },
    { key: "unit", header: "الوحدة", render: (r) => `${r.units?.title} - ${r.units?.number || ''}` },
    { key: "start", header: "البداية", render: (r) => r.start_date },
    { key: "end", header: "النهاية", render: (r) => r.end_date },
    { key: "rent", header: "الإيجار", render: (r) => egp(r.rent_amount) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={getContractStatus(r.status, r.end_date)} /> },
  ];

  const payColumns: Column<PaymentWithRelations>[] = [
    { key: "receipt", header: "الإيصال", render: (r) => r.receipt_number || "-" },
    { key: "unit", header: "الوحدة", render: (r) => `${r.contracts?.units?.title} - ${r.contracts?.units?.number || ''}` },
    { key: "amount", header: "المبلغ", render: (r) => egp(r.amount) },
    { key: "method", header: "الطريقة", render: (r) => r.payment_method || "-" },
    { key: "date", header: "التاريخ", render: (r) => r.payment_date },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "مدفوع"} /> },
  ];

  return (
    <AppLayout title={tenant.full_name} subtitle={tenant.job || "عميل / مستأجر"}>
      <Button asChild variant="outline" size="sm" className="mb-4 gap-1">
        <Link to="/tenants"><ArrowRight className="h-4 w-4" /> العملاء</Link>
      </Button>
      <DetailGrid items={[
        { label: "الرقم القومي", value: tenant.civil_id || "-" },
        { label: "الهاتف", value: <span dir="ltr" className="inline-block">{tenant.phone || "-"}</span> },
        { label: "البريد الإلكتروني", value: tenant.email || "-" },
        { label: "جهة العمل", value: tenant.job || "-" },
        { label: "الحالة", value: <StatusBadge status={tenant.status || "نشط"} /> },
      ]} />
      
      <SectionTitle>العقود</SectionTitle>
      {tenantContracts.length ? <DataTable columns={contractColumns} rows={tenantContracts} /> : <EmptyState>لا توجد عقود مسجلة لهذا العميل.</EmptyState>}
      
      <SectionTitle>الدفعات المستحقة / المتأخرة</SectionTitle>
      {duePayments.length ? <DataTable columns={payColumns} rows={duePayments} /> : <EmptyState>لا توجد دفعات مستحقة مسجلة.</EmptyState>}
      
      <SectionTitle>سجل الدفعات المحصلة</SectionTitle>
      {paidPayments.length ? <DataTable columns={payColumns} rows={paidPayments} /> : <EmptyState>لا توجد دفعات محصلة مسجلة.</EmptyState>}
    </AppLayout>
  );
}
