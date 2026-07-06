import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const exportToExcel = <T extends Record<string, any>>(data: T[], filename: string) => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("تم تصدير البيانات بنجاح");
  } catch (error) {
    console.error(error);
    toast.error("حدث خطأ أثناء تصدير البيانات");
  }
};

export const importFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadTemplate = (headers: string[], filename: string) => {
  try {
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${filename}_template.xlsx`);
  } catch (error) {
    console.error(error);
    toast.error("حدث خطأ أثناء تحميل القالب");
  }
};
