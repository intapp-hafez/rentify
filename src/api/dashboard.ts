import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { addDays, format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

export interface DashboardStats {
  units: {
    total: number;
    rented: number;
    available: number;
    maintenance: number;
    avgRent: number;
  };
  contracts: {
    active: number;
    expiringSoon: number;
  };
  payments: {
    thisMonth: number;
    overdue: number;
    nextMonth: number;
  };
  deposits: {
    totalHeld: number;
  };
  monthly: { month: string; value: number }[];
  topCities: { name: string; count: number; pct: number }[];
  maintenance: Database['public']['Tables']['maintenance']['Row'][];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const today = new Date();
  const in60Days = format(addDays(today, 60), 'yyyy-MM-dd');
  const todayStr = format(today, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
  const nextMonthStart = format(startOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');
  const nextMonthEnd = format(endOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');

  const [
    { count: totalUnits },
    { count: rentedUnits },
    { count: availableUnits },
    { count: maintenanceUnits },
    { count: activeContracts },
    { count: expiringSoon },
    { data: allUnits },
    { data: payments },
    { data: recentMaintenance },
    { data: depositsData },
  ] = await Promise.all([
    supabase.from('units').select('*', { count: 'exact', head: true }),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'rented'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('contracts').select('*', { count: 'exact', head: true })
      .eq('status', 'نشط').gte('end_date', todayStr).lte('end_date', in60Days),
    supabase.from('units').select('rent_price, city'),
    supabase.from('payments').select('amount, status, payment_date'),
    supabase.from('maintenance').select('*, units(number, title)').order('created_at', { ascending: false }).limit(5),
    supabase.from('deposits').select('amount').eq('status', 'held'),
  ]);

  // Average rent across all units
  const unitsList = allUnits || [];
  const avgRent = unitsList.length
    ? Math.round(unitsList.reduce((s: number, u: any) => s + (u.rent_price || 0), 0) / unitsList.length)
    : 0;

  // Top cities by unit count
  const cityMap: Record<string, number> = {};
  for (const u of unitsList) {
    const city = (u as any).city || 'غير محدد';
    cityMap[city] = (cityMap[city] || 0) + 1;
  }
  const topCities = Object.entries(cityMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      pct: unitsList.length ? Math.round((count / unitsList.length) * 100) : 0,
    }));

  // Payments
  const allPayments = payments || [];
  const thisMonth = allPayments
    .filter((p: any) => p.status === 'مدفوع' && p.payment_date >= monthStart && p.payment_date <= monthEnd)
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const overdue = allPayments
    .filter((p: any) => p.status === 'متأخر')
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const nextMonth = allPayments
    .filter((p: any) => p.payment_date >= nextMonthStart && p.payment_date <= nextMonthEnd)
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);

  // Deposits
  const totalHeld = (depositsData || []).reduce((s: number, d: any) => s + (d.amount || 0), 0);

  // Monthly revenue (last 6 months)
  const monthly: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(today, i);
    const start = format(startOfMonth(d), 'yyyy-MM-dd');
    const end = format(endOfMonth(d), 'yyyy-MM-dd');
    const val = allPayments
      .filter((p: any) => p.status === 'مدفوع' && p.payment_date >= start && p.payment_date <= end)
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);
    monthly.push({ month: format(d, 'MMM'), value: val });
  }

  return {
    units: {
      total: totalUnits || 0,
      rented: rentedUnits || 0,
      available: availableUnits || 0,
      maintenance: maintenanceUnits || 0,
      avgRent,
    },
    contracts: {
      active: activeContracts || 0,
      expiringSoon: expiringSoon || 0,
    },
    payments: { thisMonth, overdue, nextMonth },
    deposits: { totalHeld },
    monthly,
    topCities,
    maintenance: (recentMaintenance as any) || [],
  };
};
