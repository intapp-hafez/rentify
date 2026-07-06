import { supabase } from '@/lib/supabase';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface GeneratedNotification {
  id: string;
  type: 'contract' | 'payment' | 'maintenance' | 'payment-received' | 'vacant';
  title: string;
  body: string;
  date: string;
  read: boolean;
  link?: { to: string; params?: Record<string, string> };
}

export const getNotifications = async (): Promise<GeneratedNotification[]> => {
  const notifications: GeneratedNotification[] = [];
  const today = new Date();

  // 1. Expiring contracts (within 60 days)
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, number, end_date, status, tenants(full_name)')
    .eq('status', 'نشط')
    .gte('end_date', format(today, 'yyyy-MM-dd'))
    .lte('end_date', format(addDays(today, 60), 'yyyy-MM-dd'));

  if (contracts) {
    for (const c of contracts) {
      const daysLeft = differenceInDays(new Date(c.end_date), today);
      const tenantName = (c.tenants as any)?.full_name || 'مستأجر';
      notifications.push({
        id: `contract-${c.id}`,
        type: 'contract',
        title: `عقد ينتهي خلال ${daysLeft} يوم`,
        body: `عقد المستأجر ${tenantName} رقم ${c.number || '-'} ينتهي في ${c.end_date}`,
        date: format(today, 'yyyy-MM-dd'),
        read: false,
        link: { to: '/contracts/$id', params: { id: c.id } },
      });
    }
  }

  // 2. Overdue payments (status = متأخر)
  const { data: overdue } = await supabase
    .from('payments')
    .select('id, amount, payment_date, contracts(number, tenants(full_name))')
    .eq('status', 'متأخر')
    .order('payment_date', { ascending: true })
    .limit(10);

  if (overdue) {
    for (const p of overdue) {
      const contract = p.contracts as any;
      const tenantName = contract?.tenants?.full_name || 'مستأجر';
      notifications.push({
        id: `payment-${p.id}`,
        type: 'payment',
        title: 'دفعة متأخرة',
        body: `المستأجر ${tenantName} متأخر في سداد دفعة بمبلغ ${p.amount} ج.م منذ ${p.payment_date}`,
        date: p.payment_date,
        read: false,
        link: { to: '/payments' },
      });
    }
  }

  // 3. Pending / open maintenance requests
  const { data: maint } = await supabase
    .from('maintenance')
    .select('id, number, description, type, priority, units(title, number)')
    .in('status', ['جديد', 'مفتوح', 'pending'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (maint) {
    for (const m of maint) {
      const unit = m.units as any;
      notifications.push({
        id: `maint-${m.id}`,
        type: 'maintenance',
        title: `طلب صيانة جديد — ${m.type || 'غير محدد'}`,
        body: `${m.description || 'طلب صيانة'} في ${unit?.title || 'وحدة'} ${unit?.number || ''}`,
        date: format(today, 'yyyy-MM-dd'),
        read: false,
        link: { to: '/maintenance' },
      });
    }
  }

  // 4. Vacant units (available) for more than a week — info notification
  const { data: vacant } = await supabase
    .from('units')
    .select('id, title, number, created_at')
    .eq('status', 'available')
    .lte('created_at', format(addDays(today, -7), 'yyyy-MM-dd\'T\'HH:mm:ss'))
    .limit(5);

  if (vacant) {
    for (const u of vacant) {
      notifications.push({
        id: `vacant-${u.id}`,
        type: 'vacant',
        title: 'وحدة شاغرة',
        body: `الوحدة ${u.title} رقم ${u.number || '-'} لا تزال شاغرة`,
        date: format(today, 'yyyy-MM-dd'),
        read: false,
        link: { to: '/units/$id', params: { id: u.id } },
      });
    }
  }

  // Sort: most recent first
  return notifications.sort((a, b) => b.date.localeCompare(a.date));
};

export interface ReportStats {
  units: { total: number; rented: number; available: number; maintenance: number };
  contracts: { active: number; expiringSoon: number; expired: number };
  payments: {
    collected: number;
    overdue: number;
    due: number;
    monthly: { month: string; value: number }[];
  };
  tenants: { total: number; late: number };
  maintenance: { total: number; pending: number; done: number };
}

export const getReportStats = async (): Promise<ReportStats> => {
  const today = new Date();
  const sixtyDaysLater = format(addDays(today, 60), 'yyyy-MM-dd');
  const todayStr = format(today, 'yyyy-MM-dd');

  const [
    { count: totalUnits },
    { count: rentedUnits },
    { count: availableUnits },
    { count: maintenanceUnits },
    { count: activeContracts },
    { count: expiringSoon },
    { count: expiredContracts },
    { data: payments },
    { count: totalTenants },
    { count: lateTenants },
    { count: totalMaint },
    { count: pendingMaint },
    { count: doneMaint },
  ] = await Promise.all([
    supabase.from('units').select('*', { count: 'exact', head: true }),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'rented'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'نشط').gte('end_date', todayStr).lte('end_date', sixtyDaysLater),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'عقد منتهي'),
    supabase.from('payments').select('amount, status, payment_date'),
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'متأخر بالسداد'),
    supabase.from('maintenance').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance').select('*', { count: 'exact', head: true }).in('status', ['جديد', 'مفتوح', 'pending']),
    supabase.from('maintenance').select('*', { count: 'exact', head: true }).in('status', ['مكتمل', 'مغلق', 'completed']),
  ]);

  // Build monthly revenue for the last 6 months
  const monthlyRevenue: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const monthName = format(monthDate, 'MMM');
    const collected = (payments || [])
      .filter(p => p.status === 'مدفوع' && p.payment_date >= start && p.payment_date <= end)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    monthlyRevenue.push({ month: monthName, value: collected });
  }

  const allPayments = payments || [];
  return {
    units: { total: totalUnits || 0, rented: rentedUnits || 0, available: availableUnits || 0, maintenance: maintenanceUnits || 0 },
    contracts: { active: activeContracts || 0, expiringSoon: expiringSoon || 0, expired: expiredContracts || 0 },
    payments: {
      collected: allPayments.filter(p => p.status === 'مدفوع').reduce((s, p) => s + p.amount, 0),
      overdue: allPayments.filter(p => p.status === 'متأخر').reduce((s, p) => s + p.amount, 0),
      due: allPayments.filter(p => p.status === 'مستحق').reduce((s, p) => s + p.amount, 0),
      monthly: monthlyRevenue,
    },
    tenants: { total: totalTenants || 0, late: lateTenants || 0 },
    maintenance: { total: totalMaint || 0, pending: pendingMaint || 0, done: doneMaint || 0 },
  };
};
