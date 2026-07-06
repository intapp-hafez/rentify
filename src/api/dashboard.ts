import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export interface DashboardStats {
  units: {
    total: number;
    rented: number;
    available: number;
    maintenance: number;
  };
  contracts: {
    active: number;
  };
  maintenance: Database['public']['Tables']['maintenance']['Row'][];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  // 1. Fetch Unit counts
  // Since Supabase doesn't easily allow group-by counts in a single simple query via PostgREST without RPC,
  // we can fetch all units (if small number) or do multiple count queries. For scaling, multiple count queries are better.
  
  const [
    { count: totalUnits },
    { count: rentedUnits },
    { count: availableUnits },
    { count: maintenanceUnits },
    { count: activeContracts },
    { data: recentMaintenance }
  ] = await Promise.all([
    supabase.from('units').select('*', { count: 'exact', head: true }),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'rented'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('maintenance').select('*, units(number, title)').order('created_at', { ascending: false }).limit(5)
  ]);

  return {
    units: {
      total: totalUnits || 0,
      rented: rentedUnits || 0,
      available: availableUnits || 0,
      maintenance: maintenanceUnits || 0,
    },
    contracts: {
      active: activeContracts || 0,
    },
    maintenance: (recentMaintenance as any) || [],
  };
};
