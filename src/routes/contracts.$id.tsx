import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailGrid, SectionTitle, EmptyState } from "@/components/DetailField";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { egp } from "@/lib/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getContracts, updateContract, deleteContract } from "@/api/contracts";
import { getPayments, type PaymentWithRelations } from "@/api/payments";
import { getUnits } from "@/api/units";
import { getTenants } from "@/api/tenants";
import { isBefore, startOfDay } from "date-fns";

const contractStatuses = ["نشط", "عقد منتهي", "محجوز"];

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
  const queryClient = useQueryClient();

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
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("تم حذف العقد بنجاح");
      router.navigate({ to: "/contracts" });
    },
    onError: (error) => toast.error(error.message),
  });

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

  const fields: CrudField[] = [
    { name: "number", label: "رقم العقد" },
    { name: "tenant_id", label: "المستأجر", type: "select", options: tenants.map((t) => ({ value: t.id, label: t.full_name })) },
    { name: "unit_id", label: "الوحدة", type: "select", options: units.map((u) => ({ value: u.id, label: `${u.title} - ${u.number || ''}` })) },
    { name: "start_date", label: "تاريخ البداية", type: "date" },
    { name: "end_date", label: "تاريخ النهاية", type: "date" },
    { name: "rent_amount", label: "الإيجار (شهري)", type: "number" },
    { name: "deposit", label: "التأمين", type: "number" },
    { name: "status", label: "الحالة", type: "select", options: contractStatuses },
  ];

  return (
    <AppLayout title={`عقد ${contract.number || 'بدون رقم'}`} subtitle={`${contract.units?.title} - ${contract.units?.number || ''}`}>
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
            description={`سيتم حذف العقد "${contract.number || 'بدون رقم'}".`} 
            onConfirm={() => deleteMutation.mutate(contract.id)}
            trigger={<Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> حذف</Button>} 
          />
        </div>
      </div>
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
