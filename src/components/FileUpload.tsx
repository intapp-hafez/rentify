import { useState, useRef, type ChangeEvent } from "react";
import { Upload, FileText, Image as ImageIcon, X, Eye, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  className?: string;
}

const MAX_PDF_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_IMAGE_SIZE = 250 * 1024; // 250 KB

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export function FileUpload({ value, onChange, label, className = "" }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Helper to format file size display if data URL
  const getApproxSize = (dataUrl: string) => {
    const head = dataUrl.split(",")[0] || "";
    const body = dataUrl.split(",")[1] || "";
    const bytes = Math.round((body.length * 3) / 4);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPdf = value?.startsWith("data:application/pdf");
  const isImage = value?.startsWith("data:image/");

  function validateAndProcessFile(file: File) {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    const isPdfType = fileType === "application/pdf" || fileName.endsWith(".pdf");
    const isImageType =
      fileType.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp)$/i.test(fileName);

    if (!isPdfType && !isImageType) {
      toast.error("نوع الملف غير مدعوم! (الملفات المسموحة: PDF, PNG, JPG, JPEG, WEBP)");
      return;
    }

    if (isPdfType) {
      if (file.size > MAX_PDF_SIZE) {
        toast.error(`حجم ملف PDF يتجاوز الحد المسموح (2 ميجابايت). حجم الملف الحالي: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        return;
      }
    } else if (isImageType) {
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`حجم الصورة يتجاوز الحد المسموح (250 كيلوبايت). حجم الملف الحالي: ${(file.size / 1024).toFixed(1)}KB`);
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
        toast.success("تم رفع الملف بنجاح");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
    // reset input so selecting same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  }

  function handleOpenView() {
    if (!value) return;
    const win = window.open();
    if (win) {
      if (isPdf) {
        win.document.write(`<iframe src="${value}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        win.document.write(`<img src="${value}" style="max-width:100%; height:auto; display:block; margin:20px auto; border-radius:8px; shadow:0 4px 12px rgba(0,0,0,0.15);" />`);
      }
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}

      {value ? (
        <div className="relative flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-all">
          <div className="flex items-center gap-3 overflow-hidden">
            {isImage ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <img src={value} alt="Preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-500">
                <FileText className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {isPdf ? "مستند PDF مرفق" : "صورة مرفقة"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {getApproxSize(value)} • {isPdf ? "PDF (حد 2MB)" : "صورة (حد 250KB)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleOpenView}
              title="معاينة الملف"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <a href={value} download={isPdf ? "document.pdf" : "attachment.png"}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="تنزيل الملف"
              >
                <Download className="h-4 w-4" />
              </Button>
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => onChange(null)}
              title="حذف المرفق"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed p-2.5 text-center transition-all ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-right">
            <span className="text-xs font-medium text-foreground">
              اضغط هنا أو اسحب الملف لرفعه
            </span>
            <span className="text-[11px] text-muted-foreground">
              (PDF حتى 2MB • PNG, JPG, WEBP حتى 250KB)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
