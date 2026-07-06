import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  properties as seedProperties,
  units as seedUnits,
  tenants as seedTenants,
  contracts as seedContracts,
  payments as seedPayments,
  maintenanceRequests as seedMaintenance,
  type Property,
  type Unit,
  type Tenant,
  type Contract,
  type Payment,
  type Maintenance,
} from "./mockData";

export type NotifType = "contract" | "payment" | "maintenance" | "payment-received" | "vacant";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  date: string;
  read: boolean;
  link?: { to: string; params?: Record<string, string> };
}

let counter = 1000;
const uid = (prefix: string) => `${prefix}-${++counter}`;

const seedNotifications: AppNotification[] = [
  {
    id: uid("n"),
    type: "contract",
    title: "قرب انتهاء عقد",
    body: "عقد برج النيل - 101 ينتهي خلال 14 يوم",
    date: "2025-06-06",
    read: false,
    link: { to: "/contracts/$id", params: { id: "c1" } },
  },
  {
    id: uid("n"),
    type: "payment",
    title: "تأخر سداد الإيجار",
    body: "تأخر سداد إيجار عمارات التجمع - 404",
    date: "2025-06-05",
    read: false,
    link: { to: "/contracts/$id", params: { id: "c3" } },
  },
  {
    id: uid("n"),
    type: "maintenance",
    title: "طلب صيانة جديد",
    body: "طلب صيانة: مصاعد - عمارات التجمع - 404",
    date: "2025-06-06",
    read: false,
    link: { to: "/maintenance" },
  },
  {
    id: uid("n"),
    type: "payment-received",
    title: "تم استلام دفعة",
    body: "تم استلام دفعة من سارة وليد حسن بقيمة 22,000 ج.م",
    date: "2025-06-03",
    read: true,
    link: { to: "/payments" },
  },
  {
    id: uid("n"),
    type: "vacant",
    title: "وحدة شاغرة",
    body: "أصبحت الوحدة أبراج سموحة - 501 شاغرة",
    date: "2025-06-02",
    read: true,
    link: { to: "/units/$id", params: { id: "u8" } },
  },
];

interface StoreValue {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  contracts: Contract[];
  payments: Payment[];
  maintenance: Maintenance[];
  notifications: AppNotification[];

  addProperty: (p: Omit<Property, "id">) => void;
  updateProperty: (id: string, p: Partial<Property>) => void;
  deleteProperty: (id: string) => void;

  addUnit: (u: Omit<Unit, "id">) => void;
  updateUnit: (id: string, u: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;

  addTenant: (t: Omit<Tenant, "id">) => void;
  updateTenant: (id: string, t: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;

  addContract: (c: Omit<Contract, "id">) => void;
  updateContract: (id: string, c: Partial<Contract>) => void;
  deleteContract: (id: string) => void;

  addPayment: (p: Omit<Payment, "id">) => void;
  updatePayment: (id: string, p: Partial<Payment>) => void;
  deletePayment: (id: string) => void;

  addMaintenance: (m: Omit<Maintenance, "id">) => void;
  updateMaintenance: (id: string, m: Partial<Maintenance>) => void;
  deleteMaintenance: (id: string) => void;

  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(seedProperties);
  const [units, setUnits] = useState<Unit[]>(seedUnits);
  const [tenants, setTenants] = useState<Tenant[]>(seedTenants);
  const [contracts, setContracts] = useState<Contract[]>(seedContracts);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [maintenance, setMaintenance] = useState<Maintenance[]>(seedMaintenance);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);

  const value = useMemo<StoreValue>(() => {
    function crud<T extends { id: string }>(
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      prefix: string,
    ) {
      return {
        add: (item: Omit<T, "id">) =>
          setter((prev) => [{ ...(item as T), id: uid(prefix) }, ...prev]),
        update: (id: string, patch: Partial<T>) =>
          setter((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
        remove: (id: string) => setter((prev) => prev.filter((x) => x.id !== id)),
      };
    }

    const p = crud<Property>(setProperties, "p");
    const u = crud<Unit>(setUnits, "u");
    const t = crud<Tenant>(setTenants, "t");
    const c = crud<Contract>(setContracts, "c");
    const pay = crud<Payment>(setPayments, "pay");
    const m = crud<Maintenance>(setMaintenance, "m");

    return {
      properties, units, tenants, contracts, payments, maintenance, notifications,
      addProperty: p.add, updateProperty: p.update, deleteProperty: p.remove,
      addUnit: u.add, updateUnit: u.update, deleteUnit: u.remove,
      addTenant: t.add, updateTenant: t.update, deleteTenant: t.remove,
      addContract: c.add, updateContract: c.update, deleteContract: c.remove,
      addPayment: pay.add, updatePayment: pay.update, deletePayment: pay.remove,
      addMaintenance: m.add, updateMaintenance: m.update, deleteMaintenance: m.remove,
      markRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      deleteNotification: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
    };
  }, [properties, units, tenants, contracts, payments, maintenance, notifications]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
