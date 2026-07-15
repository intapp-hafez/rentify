import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getContracts, addContract, updateContract, deleteContract, type ContractWithRelations } from "@/api/contracts";
import { getUnits } from "@/api/units";
import { getTenants } from "@/api/tenants";
import { exportToExcel, importFromExcel, downloadTemplate } from "@/lib/excel";
import { egp } from "@/lib/mockData";
import { format, isBefore, startOfDay } from "date-fns";

const getContractStatus = (status: string | null, endDate: string | null) => {
  if (status === "نشط" && endDate) {
    if (isBefore(new Date(endDate), startOfDay(new Date()))) {
      return "عقد منتهي";
    }
  }
  return status || "نشط";
};

export const Route = createFileRoute("/contracts/")({
  head: () => ({ meta: [{ title: "العقود — Rentify" }] }),
  component: Contracts,
});

const contractStatuses = ["نشط", "عقد منتهي", "محجوز"];

function Contracts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: getContracts,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: getUnits,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: getTenants,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("تم إنشاء العقد بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

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
    },
    onError: (error) => toast.error(error.message),
  });

  const fields: CrudField[] = [
    { name: "number", label: "رقم العقد" },
    { 
      name: "tenant_id", 
      label: "المستأجر", 
      type: "select", 
      options: tenants.map((t) => ({ value: t.id, label: t.full_name })) 
    },
    { 
      name: "unit_id", 
      label: "الوحدة", 
      type: "select", 
      options: units.map((u) => ({ value: u.id, label: `${u.title} - ${u.number || ''}` })) 
    },
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

  const handleExport = () => {
    const exportData = contracts.map(c => ({
      "رقم العقد": c.number,
      "اسم المستأجر": c.tenants?.full_name || "غير محدد",
      "الوحدة": `${c.units?.title} - ${c.units?.number || ''}`,
      "تاريخ البداية": c.start_date,
      "تاريخ النهاية": c.end_date,
      "الإيجار": c.rent_amount,
      "التأمين": c.deposit,
      "الحالة": c.status,
    }));
    exportToExcel(exportData, "المنشآت_العقود");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      "number", "tenant_id", "unit_id", "start_date", "end_date", "rent_amount", "deposit", "status"
    ], "Contracts_Template");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("جاري تحليل الملف واستيراد البيانات...");

    try {
      const data = await importFromExcel(file);
      if (!data || data.length === 0) {
        toast.error("الملف فارغ أو لا يحتوي على بيانات صحيحة", { id: toastId });
        return;
      }

      let successCount = 0;
      for (const row of data) {
        if (!row.tenant_id || !row.unit_id) continue;
        await addMutation.mutateAsync({
          number: row.number?.toString() || null,
          tenant_id: row.tenant_id,
          unit_id: row.unit_id,
          start_date: row.start_date || format(new Date(), 'yyyy-MM-dd'),
          end_date: row.end_date || format(new Date(), 'yyyy-MM-dd'),
          rent_amount: Number(row.rent_amount) || 0,
          deposit: Number(row.deposit) || null,
          payment_frequency: row.payment_frequency || 'monthly',
          status: row.status || 'نشط'
        });
        successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(`تم استيراد ${successCount} عقد بنجاح`, { id: toastId });
    } catch (error: any) {
      toast.error(`فشل الاستيراد: ${error?.message || "تأكد من استخدام القالب الصحيح"}`, { id: toastId });
      console.error("Import Error:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const columns: Column<ContractWithRelations>[] = [
    { key: "number", header: "رقم العقد", render: (r) => <Link to="/contracts/$id" params={{ id: r.id }} className="font-bold text-primary hover:underline">{r.number || "بدون رقم"}</Link> },
    { key: "tenant_id", header: "المستأجر", render: (r) => r.tenants?.full_name || "-" },
    { key: "unit_id", header: "الوحدة", render: (r) => `${r.units?.title} - ${r.units?.number || ''}` },
    { key: "start_date", header: "البداية", render: (r) => r.start_date },
    { key: "end_date", header: "النهاية", render: (r) => r.end_date },
    { key: "rent_amount", header: "الإيجار", render: (r) => egp(r.rent_amount) },
    { key: "deposit", header: "التأمين", render: (r) => egp(r.deposit || 0) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={getContractStatus(r.status, r.end_date)} /> },
    {
      key: "actions", header: "إجراءات", render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <CrudDialog<Omit<ContractWithRelations, "id" | "created_at" | "units" | "tenants">> 
            title="تعديل عقد" 
            fields={fields} 
            initial={r} 
            onSubmit={(v) => updateMutation.mutate({ id: r.id, ...v } as any)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف العقد "${r.number || 'بدون رقم'}".`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="العقود" subtitle="إدارة العقود النشطة والمنتهية والتجديدات">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1 text-muted-foreground" onClick={handleExport}>
            <Download className="h-4 w-4" /> تصدير Excel
          </Button>
          <Button variant="outline" className="gap-1 text-muted-foreground" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4" /> تحميل القالب
          </Button>
          <Button variant="outline" className="gap-1 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> استيراد Excel
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
        </div>

        <CrudDialog<Omit<ContractWithRelations, "id" | "created_at" | "units" | "tenants">> 
          title="إنشاء عقد" 
          fields={fields} 
          onSubmit={(v) => addMutation.mutate({ 
            ...v, 
            payment_frequency: v.payment_frequency || 'monthly',
            status: v.status || 'نشط'
          } as any)}
          trigger={<Button className="gap-1"><Plus className="h-4 w-4" /> إنشاء عقد</Button>} />
      </div>
      
      {loadingContracts ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
      ) : (
        <DataTable columns={columns} rows={contracts} onRowClick={(r) => navigate({ to: "/contracts/$id", params: { id: r.id } })} />
      )}
    </AppLayout>
  );
}
