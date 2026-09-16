import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet, FileText, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CrudDialog, type CrudField } from "@/components/CrudDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  getContracts,
  addContract,
  updateContract,
  deleteContract,
  findConflictingContract,
  normalizeDate,
  type ContractWithRelations,
} from "@/api/contracts";
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

const contractStatuses = ["نشط", "عقد منتهي", "محجوز", "ملغي"];

function Contracts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (c.number && c.number.toLowerCase().includes(q)) ||
        (c.tenants?.full_name && c.tenants.full_name.toLowerCase().includes(q)) ||
        (c.units?.title && c.units.title.toLowerCase().includes(q)) ||
        (c.units?.number && c.units.number.toLowerCase().includes(q));

      const actualStatus = getContractStatus(c.status, c.end_date);
      const matchStatus = statusFilter === "all" || actualStatus === statusFilter || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [contracts, search, statusFilter]);

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
      options: units.map((u) => ({ value: u.id, label: `${u.title} - ${u.number || ''}` })),
      onChange: (val, setValues) => {
        const unit = units.find(u => u.id === val);
        setValues((prev: any) => ({
          ...prev,
          unit_id: val,
          ...(unit?.rent_price ? { rent_amount: unit.rent_price } : {})
        }));
      }
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
    {
      name: "total_rent_sum",
      label: "",
      type: "custom",
      colSpan: 2,
      hidden: (v) => !v.payment_frequency || v.payment_frequency === "monthly" || !v.rent_amount,
      render: (v) => {
        const rent = Number(v.rent_amount) || 0;
        let multiplier = 1;
        if (v.payment_frequency === "quarterly") multiplier = 3;
        else if (v.payment_frequency === "semiannual") multiplier = 6;
        else if (v.payment_frequency === "yearly") multiplier = 12;
        
        return (
          <div className="rounded-md bg-primary/10 p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">
              إجمالي الإيجار ({v.payment_frequency === "quarterly" ? "كل 3 شهور" : v.payment_frequency === "semiannual" ? "كل 6 شهور" : "سنوي"})
            </span>
            <span className="font-bold text-primary">{(rent * multiplier).toLocaleString()} ج.م</span>
          </div>
        );
      }
    },
    { name: "status", label: "الحالة", type: "select", options: contractStatuses },
    { name: "attachment_url", label: "مستند العقد المرفق (PDF / صورة)", type: "file", colSpan: 2 },
  ];

  const handleExport = () => {
    const exportData = filtered.map(c => ({
      "رقم العقد": c.number,
      "اسم المستأجر": c.tenants?.full_name || "غير محدد",
      "الوحدة": `${c.units?.title} - ${c.units?.number || ''}`,
      "تاريخ البداية": c.start_date,
      "تاريخ النهاية": c.end_date,
      "الإيجار": c.rent_amount,
      "التأمين": c.deposit,
      "الحالة": getContractStatus(c.status, c.end_date),
    }));
    exportToExcel(exportData, "المنشآت_العقود");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      "number", "tenant_id", "unit_id", "start_date", "end_date", "rent_amount", "deposit", "status"
    ], "Contracts_Template");
  };

  const validateAndCreateContract = (v: any) => {
    if (!v.unit_id) {
      toast.error("يرجى اختيار الوحدة");
      return false;
    }
    if (!v.start_date || !v.end_date) {
      toast.error("يرجى تحديد تاريخ البداية وتاريخ النهاية");
      return false;
    }
    if (normalizeDate(v.start_date) > normalizeDate(v.end_date)) {
      toast.error("تاريخ بداية العقد لا يمكن أن يكون بعد تاريخ النهاية");
      return false;
    }

    const conflict = findConflictingContract(contracts, {
      unitId: v.unit_id,
      startDate: v.start_date,
      endDate: v.end_date,
    });

    if (conflict) {
      const unit = units.find((u) => u.id === v.unit_id);
      const unitName = unit ? `${unit.title}${unit.number ? ` - ${unit.number}` : ""}` : "الوحدة";
      const contractNum = conflict.number ? `(عقد رقم: ${conflict.number})` : "";
      toast.error(
        `لا يمكن إنشاء العقد: ${unitName} لديها عقد نشط بالفعل خلال الفترة من ${conflict.start_date} إلى ${conflict.end_date} ${contractNum}`,
        { duration: 6000 }
      );
      return false;
    }

    addMutation.mutate({
      ...v,
      payment_frequency: v.payment_frequency || "monthly",
      status: v.status || "نشط",
    } as any);
    return true;
  };

  const validateAndUpdateContract = (r: ContractWithRelations, v: any) => {
    const targetUnitId = v.unit_id || r.unit_id;
    const targetStart = v.start_date || r.start_date;
    const targetEnd = v.end_date || r.end_date;

    if (targetStart && targetEnd && normalizeDate(targetStart) > normalizeDate(targetEnd)) {
      toast.error("تاريخ بداية العقد لا يمكن أن يكون بعد تاريخ النهاية");
      return false;
    }

    const conflict = findConflictingContract(contracts, {
      unitId: targetUnitId,
      startDate: targetStart,
      endDate: targetEnd,
      excludeContractId: r.id,
    });

    if (conflict) {
      const unit = units.find((u) => u.id === targetUnitId);
      const unitName = unit ? `${unit.title}${unit.number ? ` - ${unit.number}` : ""}` : "الوحدة";
      const contractNum = conflict.number ? `(عقد رقم: ${conflict.number})` : "";
      toast.error(
        `لا يمكن تحديث العقد: ${unitName} لديها عقد نشط آخر خلال الفترة من ${conflict.start_date} إلى ${conflict.end_date} ${contractNum}`,
        { duration: 6000 }
      );
      return false;
    }

    updateMutation.mutate({ id: r.id, ...v } as any);
    return true;
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
      let skippedCount = 0;
      const batchAdded: any[] = [];

      for (const row of data) {
        if (!row.tenant_id || !row.unit_id) continue;
        const startDate = row.start_date || format(new Date(), 'yyyy-MM-dd');
        const endDate = row.end_date || format(new Date(), 'yyyy-MM-dd');

        const conflict = findConflictingContract([...contracts, ...batchAdded], {
          unitId: row.unit_id,
          startDate,
          endDate,
        });

        if (conflict) {
          skippedCount++;
          const unit = units.find((u) => u.id === row.unit_id);
          const unitName = unit ? `${unit.title}${unit.number ? ` - ${unit.number}` : ''}` : row.unit_id;
          toast.warning(`تم تخطي عقد للوحدة (${unitName}): يوجد عقد نشط خلال نفس الفترة (${startDate} إلى ${endDate})`);
          continue;
        }

        const newContract = await addMutation.mutateAsync({
          number: row.number?.toString() || null,
          tenant_id: row.tenant_id,
          unit_id: row.unit_id,
          start_date: startDate,
          end_date: endDate,
          rent_amount: Number(row.rent_amount) || 0,
          deposit: Number(row.deposit) || null,
          payment_frequency: row.payment_frequency || 'monthly',
          status: row.status || 'نشط'
        });
        batchAdded.push(newContract);
        successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      if (skippedCount > 0) {
        toast.info(`تم استيراد ${successCount} عقد بنجاح وتخطي ${skippedCount} بسبب تعارض الفترات الزمنية`, { id: toastId });
      } else {
        toast.success(`تم استيراد ${successCount} عقد بنجاح`, { id: toastId });
      }
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
          {r.attachment_url && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              title="عرض/تنزيل العقد المرفق"
              onClick={() => {
                const win = window.open();
                if (win) {
                  if (r.attachment_url?.startsWith("data:application/pdf")) {
                    win.document.write(`<iframe src="${r.attachment_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                  } else {
                    win.document.write(`<img src="${r.attachment_url}" style="max-width:100%; height:auto; display:block; margin:20px auto; border-radius:8px;" />`);
                  }
                }
              }}
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          <CrudDialog<Omit<ContractWithRelations, "id" | "created_at" | "units" | "tenants">> 
            title="تعديل عقد" 
            fields={fields} 
            initial={r} 
            onSubmit={(v) => validateAndUpdateContract(r, v)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>} />
          <ConfirmDelete description={`سيتم حذف العقد "${r.number || 'بدون رقم'}".`} onConfirm={() => deleteMutation.mutate(r.id)}
            trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="العقود" subtitle="إدارة العقود النشطة والمنتهية والتجديدات">
      {/* Search and Filters */}
      <div className="my-4 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث برقم العقد، اسم المستأجر، أو الوحدة..."
              className="pr-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {contractStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all") && (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                مسح التصفية
              </Button>
            </div>
          )}
        </div>
      </div>

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
          onSubmit={validateAndCreateContract}
          trigger={<Button className="gap-1"><Plus className="h-4 w-4" /> إنشاء عقد</Button>} />
      </div>
      
      {loadingContracts ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={(r) => navigate({ to: "/contracts/$id", params: { id: r.id } })}
          page={page}
          defaultPageSize={10}
          onPageChange={setPage}
        />
      )}
    </AppLayout>
  );
}
