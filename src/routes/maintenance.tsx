import { createFileRoute } from "@tanstack/react-router";
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
import { getMaintenanceRequests, addMaintenance, updateMaintenance, deleteMaintenance, type MaintenanceWithRelations } from "@/api/maintenance";
import { getUnits } from "@/api/units";
import { getTenants } from "@/api/tenants";
import { exportToExcel, importFromExcel, downloadTemplate } from "@/lib/excel";

export const Route = createFileRoute("/maintenance")({
  head: () => ({ meta: [{ title: "الصيانة — Rentify" }] }),
  component: MaintenancePage,
});

const priorities = ["عاجل", "مرتفع", "متوسط", "منخفض", "عادي"];
const statuses = ["جديد", "قيد التنفيذ", "مكتمل", "مفتوح", "مغلق"];
const types = ["تكييف", "سباكة", "كهرباء", "مصاعد", "دهانات", "نجارة", "أخرى"];

function MaintenancePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: maintenance = [], isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: getMaintenanceRequests,
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
    mutationFn: addMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("تم تسجيل طلب الصيانة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("تم تحديث طلب الصيانة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("تم حذف طلب الصيانة بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  const fields: CrudField[] = [
    { name: "number", label: "رقم الطلب" },
    { name: "description", label: "الوصف", colSpan: 2 },
    { 
      name: "unit_id", 
      label: "الوحدة", 
      type: "select", 
      options: units.map((u) => ({ value: u.id, label: `${u.title} - ${u.number || ''}` })) 
    },
    { 
      name: "tenant_id", 
      label: "المستأجر", 
      type: "select", 
      options: tenants.map((t) => ({ value: t.id, label: t.full_name })) 
    },
    { name: "type", label: "النوع", type: "select", options: types },
    { name: "priority", label: "الأولوية", type: "select", options: priorities },
    { name: "status", label: "الحالة", type: "select", options: statuses },
    { name: "maintenance_date", label: "التاريخ", type: "date" },
    { name: "cost", label: "التكلفة", type: "number" },
  ];

  const handleExport = () => {
    const exportData = maintenance.map(m => ({
      "رقم الطلب": m.number,
      "الوحدة": `${m.units?.title} - ${m.units?.number || ''}`,
      "المستأجر": m.tenants?.full_name || "غير محدد",
      "الوصف": m.description,
      "النوع": m.type,
      "الأولوية": m.priority,
      "الحالة": m.status,
      "التكلفة": m.cost,
      "التاريخ": m.maintenance_date,
    }));
    exportToExcel(exportData, "المنشآت_الصيانة");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      "number", "unit_id", "tenant_id", "description", "type", "priority", "status", "cost", "maintenance_date"
    ], "Maintenance_Template");
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
        if (!row.unit_id || !row.tenant_id) continue;
        await addMutation.mutateAsync({
          number: row.number?.toString() || null,
          unit_id: row.unit_id,
          tenant_id: row.tenant_id,
          description: row.description || 'بدون وصف',
          type: row.type || 'أخرى',
          priority: row.priority || 'عادي',
          status: row.status || 'جديد',
          cost: Number(row.cost) || null,
          maintenance_date: row.maintenance_date || new Date().toISOString().split('T')[0],
        });
        successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success(`تم استيراد ${successCount} طلب صيانة بنجاح`, { id: toastId });
    } catch (error: any) {
      toast.error(`فشل الاستيراد: ${error?.message || "تأكد من استخدام القالب الصحيح"}`, { id: toastId });
      console.error("Import Error:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const columns: Column<MaintenanceWithRelations>[] = [
    { key: "number", header: "رقم الطلب", render: (r) => <span className="font-bold">{r.number || "-"}</span> },
    { key: "unit", header: "الوحدة", render: (r) => `${r.units?.title} - ${r.units?.number || ''}` },
    { key: "tenant", header: "المستأجر", render: (r) => r.tenants?.full_name || "-" },
    { key: "type", header: "النوع", render: (r) => r.type || "أخرى" },
    { key: "priority", header: "الأولوية", render: (r) => <StatusBadge status={r.priority || "عادي"} /> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status || "جديد"} /> },
    { key: "maintenance_date", header: "التاريخ", render: (r) => r.maintenance_date || "-" },
    {
      key: "actions", header: "إجراءات", render: (r) => (
        <div className="flex gap-1">
          <CrudDialog<Omit<MaintenanceWithRelations, "id" | "created_at" | "units" | "tenants">> 
            title="تعديل طلب" 
            fields={fields} 
            initial={r} 
            onSubmit={(v) => updateMutation.mutate({ id: r.id, ...v } as any)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف الطلب "${r.number || '-'}".`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="الصيانة" subtitle="إدارة طلبات الصيانة والفنيين والموردين">
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

        <CrudDialog<Omit<MaintenanceWithRelations, "id" | "created_at" | "units" | "tenants">> 
          title="طلب صيانة" 
          fields={fields} 
          onSubmit={(v) => addMutation.mutate({ ...v, status: v.status || 'جديد', priority: v.priority || 'عادي' } as any)}
          trigger={<Button className="gap-1"><Plus className="h-4 w-4" /> طلب صيانة</Button>} />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
      ) : (
        <DataTable columns={columns} rows={maintenance} />
      )}
    </AppLayout>
  );
}
