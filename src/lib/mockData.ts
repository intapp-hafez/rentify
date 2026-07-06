export type UnitStatus = "متاح" | "مؤجر" | "محجوز" | "تحت الصيانة";

export const statusColors: Record<string, string> = {
  متاح: "bg-success/15 text-success border-success/30",
  مؤجر: "bg-info/15 text-info border-info/30",
  محجوز: "bg-gold/15 text-gold border-gold/40",
  "تحت الصيانة": "bg-[oklch(0.6_0.12_300)]/15 text-[oklch(0.5_0.14_300)] border-[oklch(0.6_0.12_300)]/30",
  "متأخر بالسداد": "bg-warning/15 text-warning border-warning/30",
  "عقد منتهي": "bg-destructive/15 text-destructive border-destructive/30",
  نشط: "bg-success/15 text-success border-success/30",
  مدفوع: "bg-success/15 text-success border-success/30",
  متأخر: "bg-warning/15 text-warning border-warning/30",
  مستحق: "bg-info/15 text-info border-info/30",
  "غير مدفوع": "bg-destructive/15 text-destructive border-destructive/30",
  عاجل: "bg-destructive/15 text-destructive border-destructive/30",
  مرتفع: "bg-warning/15 text-warning border-warning/30",
  متوسط: "bg-info/15 text-info border-info/30",
  منخفض: "bg-muted text-muted-foreground border-border",
  جديد: "bg-info/15 text-info border-info/30",
  "قيد التنفيذ": "bg-gold/15 text-gold border-gold/40",
  مكتمل: "bg-success/15 text-success border-success/30",
};

export const governorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الشرقية", "الدقهلية",
  "البحيرة", "الغربية", "المنوفية", "الفيوم", "بني سويف", "المنيا",
  "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "الإسماعيلية", "السويس", "بورسعيد",
];

export const districts: Record<string, string[]> = {
  القاهرة: ["مدينة نصر", "مصر الجديدة", "المعادي", "التجمع الخامس", "الرحاب", "الشروق", "عين شمس", "حلوان", "المطرية", "الزيتون", "شبرا"],
  الجيزة: ["الدقي", "المهندسين", "الهرم", "فيصل", "الشيخ زايد", "أكتوبر", "العجوزة", "إمبابة", "الوراق", "بولاق الدكرور"],
  الإسكندرية: ["سيدي جابر", "سموحة", "العصافرة", "المنتزه", "ميامي", "محرم بك", "كليوباترا", "العجمي"],
};

export const propertyTypes = ["شقة", "فيلا", "دوبلكس", "محل تجاري", "مكتب إداري", "مستودع", "مصنع", "أرض"];
export const paymentMethods = ["نقدي", "تحويل بنكي", "إنستاباي", "فودافون كاش", "بطاقة ائتمان"];

export interface Property {
  id: string;
  code: string;
  name: string;
  governorate: string;
  district: string;
  type: string;
  units: number;
  occupancy: number;
}

export const properties: Property[] = [
  { id: "p1", code: "PR-001", name: "برج النيل", governorate: "القاهرة", district: "التجمع الخامس", type: "شقة", units: 24, occupancy: 92 },
  { id: "p2", code: "PR-002", name: "أبراج المعادي", governorate: "القاهرة", district: "المعادي", type: "شقة", units: 36, occupancy: 78 },
  { id: "p3", code: "PR-003", name: "عمارة الهرم", governorate: "الجيزة", district: "الهرم", type: "شقة", units: 12, occupancy: 100 },
  { id: "p4", code: "PR-004", name: "كمبوند الياسمين", governorate: "القاهرة", district: "الرحاب", type: "فيلا", units: 18, occupancy: 67 },
  { id: "p5", code: "PR-005", name: "عمارات التجمع", governorate: "القاهرة", district: "التجمع الخامس", type: "شقة", units: 40, occupancy: 85 },
  { id: "p6", code: "PR-006", name: "أبراج سموحة", governorate: "الإسكندرية", district: "سموحة", type: "شقة", units: 28, occupancy: 71 },
  { id: "p7", code: "PR-007", name: "مول الشيخ زايد", governorate: "الجيزة", district: "الشيخ زايد", type: "محل تجاري", units: 32, occupancy: 88 },
  { id: "p8", code: "PR-008", name: "أبراج النصر", governorate: "القاهرة", district: "مدينة نصر", type: "مكتب إداري", units: 20, occupancy: 95 },
];

export interface Unit {
  id: string;
  number: string;
  property: string;
  floor: string;
  area: number;
  rooms: number;
  baths: number;
  status: UnitStatus;
  rent: number;
}

export const units: Unit[] = [
  { id: "u1", number: "101", property: "برج النيل", floor: "الأول", area: 145, rooms: 3, baths: 2, status: "مؤجر", rent: 12000 },
  { id: "u2", number: "102", property: "برج النيل", floor: "الأول", area: 120, rooms: 2, baths: 1, status: "متاح", rent: 9000 },
  { id: "u3", number: "205", property: "أبراج المعادي", floor: "الثاني", area: 180, rooms: 4, baths: 3, status: "مؤجر", rent: 18000 },
  { id: "u4", number: "301", property: "كمبوند الياسمين", floor: "الأرضي", area: 320, rooms: 5, baths: 4, status: "محجوز", rent: 35000 },
  { id: "u5", number: "112", property: "عمارة الهرم", floor: "الأول", area: 110, rooms: 2, baths: 1, status: "تحت الصيانة", rent: 7500 },
  { id: "u6", number: "404", property: "عمارات التجمع", floor: "الرابع", area: 160, rooms: 3, baths: 2, status: "مؤجر", rent: 14000 },
  { id: "u7", number: "G-12", property: "مول الشيخ زايد", floor: "الأرضي", area: 65, rooms: 1, baths: 1, status: "مؤجر", rent: 22000 },
  { id: "u8", number: "501", property: "أبراج سموحة", floor: "الخامس", area: 150, rooms: 3, baths: 2, status: "متاح", rent: 11000 },
];

export interface Tenant {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  email: string;
  job: string;
  unit?: string;
  status: string;
}


export const tenants: Tenant[] = [
  { id: "t1", name: "أحمد محمود السيد", nationalId: "28905120101234", phone: "01001234567", email: "ahmed@gmail.com", job: "مهندس", unit: "برج النيل - 101", status: "نشط" },
  { id: "t2", name: "منى عبد الرحمن", nationalId: "29103150201567", phone: "01112345678", email: "mona@gmail.com", job: "طبيبة", unit: "أبراج المعادي - 205", status: "نشط" },
  { id: "t3", name: "خالد إبراهيم فؤاد", nationalId: "28712030301890", phone: "01223456789", email: "khaled@gmail.com", job: "محاسب", unit: "عمارات التجمع - 404", status: "متأخر بالسداد" },
  { id: "t4", name: "سارة وليد حسن", nationalId: "29405180401123", phone: "01509876543", email: "sara@gmail.com", job: "مدرّسة", unit: "مول الشيخ زايد - G-12", status: "نشط" },
  { id: "t5", name: "محمد علي شعبان", nationalId: "28609110501456", phone: "01098765432", email: "mohamed@gmail.com", job: "رجل أعمال", unit: "أبراج النصر - 801", status: "نشط" },
];

export interface Contract {
  id: string;
  number: string;
  tenant: string;
  unit: string;
  start: string;
  end: string;
  rent: number;
  deposit: number;
  status: string;
}

export const contracts: Contract[] = [
  { id: "c1", number: "CT-1001", tenant: "أحمد محمود السيد", unit: "برج النيل - 101", start: "2025-01-01", end: "2025-12-31", rent: 12000, deposit: 24000, status: "نشط" },
  { id: "c2", number: "CT-1002", tenant: "منى عبد الرحمن", unit: "أبراج المعادي - 205", start: "2024-06-01", end: "2025-05-31", rent: 18000, deposit: 36000, status: "نشط" },
  { id: "c3", number: "CT-1003", tenant: "خالد إبراهيم فؤاد", unit: "عمارات التجمع - 404", start: "2024-03-01", end: "2025-02-28", rent: 14000, deposit: 28000, status: "عقد منتهي" },
  { id: "c4", number: "CT-1004", tenant: "سارة وليد حسن", unit: "مول الشيخ زايد - G-12", start: "2025-02-01", end: "2026-01-31", rent: 22000, deposit: 66000, status: "نشط" },
  { id: "c5", number: "CT-1005", tenant: "محمد علي شعبان", unit: "أبراج النصر - 801", start: "2024-09-01", end: "2025-08-31", rent: 16000, deposit: 32000, status: "نشط" },
];

export interface Payment {
  id: string;
  receipt: string;
  tenant: string;
  unit: string;
  amount: number;
  method: string;
  date: string;
  status: string;
}

export const payments: Payment[] = [
  { id: "pay1", receipt: "RC-5001", tenant: "أحمد محمود السيد", unit: "برج النيل - 101", amount: 12000, method: "إنستاباي", date: "2025-06-01", status: "مدفوع" },
  { id: "pay2", receipt: "RC-5002", tenant: "منى عبد الرحمن", unit: "أبراج المعادي - 205", amount: 18000, method: "تحويل بنكي", date: "2025-06-02", status: "مدفوع" },
  { id: "pay3", receipt: "RC-5003", tenant: "خالد إبراهيم فؤاد", unit: "عمارات التجمع - 404", amount: 14000, method: "نقدي", date: "2025-05-15", status: "متأخر" },
  { id: "pay4", receipt: "RC-5004", tenant: "سارة وليد حسن", unit: "مول الشيخ زايد - G-12", amount: 22000, method: "فودافون كاش", date: "2025-06-03", status: "مدفوع" },
  { id: "pay5", receipt: "RC-5005", tenant: "محمد علي شعبان", unit: "أبراج النصر - 801", amount: 16000, method: "بطاقة ائتمان", date: "2025-06-05", status: "مستحق" },
];

export interface Maintenance {
  id: string;
  number: string;
  unit: string;
  type: string;
  priority: string;
  status: string;
  date: string;
}

export const maintenanceRequests: Maintenance[] = [
  { id: "m1", number: "MN-301", unit: "برج النيل - 101", type: "تكييف", priority: "عاجل", status: "قيد التنفيذ", date: "2025-06-04" },
  { id: "m2", number: "MN-302", unit: "عمارة الهرم - 112", type: "سباكة", priority: "مرتفع", status: "جديد", date: "2025-06-05" },
  { id: "m3", number: "MN-303", unit: "أبراج المعادي - 205", type: "كهرباء", priority: "متوسط", status: "مكتمل", date: "2025-05-28" },
  { id: "m4", number: "MN-304", unit: "عمارات التجمع - 404", type: "مصاعد", priority: "عاجل", status: "قيد التنفيذ", date: "2025-06-06" },
  { id: "m5", number: "MN-305", unit: "كمبوند الياسمين - 301", type: "دهانات", priority: "منخفض", status: "جديد", date: "2025-06-06" },
];

export const topAreas = [
  { name: "التجمع الخامس", value: 92 },
  { name: "مدينة نصر", value: 88 },
  { name: "الشيخ زايد", value: 85 },
  { name: "المعادي", value: 79 },
  { name: "سموحة", value: 71 },
];

export const monthlyRevenue = [
  { month: "يناير", value: 420 },
  { month: "فبراير", value: 460 },
  { month: "مارس", value: 510 },
  { month: "أبريل", value: 495 },
  { month: "مايو", value: 580 },
  { month: "يونيو", value: 640 },
];

export const egp = (n: number) => `${n.toLocaleString("en-EG")} ج.م`;

export interface DuePayment {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  status: string;
  tenant: string;
  unit: string;
}

const arMonths = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// Generate the unpaid monthly due schedule for a contract.
// A month is considered paid if a matching payment (same tenant+unit) with
// status "مدفوع" falls within that month.
export function unpaidDuesForContract(contract: Contract, allPayments: Payment[]): DuePayment[] {
  const start = new Date(contract.start);
  const end = new Date(contract.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const paidMonths = new Set(
    allPayments
      .filter(
        (p) =>
          p.tenant === contract.tenant &&
          p.unit === contract.unit &&
          p.status === "مدفوع",
      )
      .map((p) => {
        const d = new Date(p.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      }),
  );

  const dues: DuePayment[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= limit) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    if (!paidMonths.has(key)) {
      const day = String(start.getDate()).padStart(2, "0");
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      dues.push({
        id: `due-${contract.id}-${key}`,
        month: `${arMonths[cursor.getMonth()]} ${cursor.getFullYear()}`,
        dueDate: `${cursor.getFullYear()}-${m}-${day}`,
        amount: contract.rent,
        status: "غير مدفوع",
        tenant: contract.tenant,
        unit: contract.unit,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return dues;
}