import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type MaintenanceRow = Database['public']['Tables']['maintenance']['Row'];
type MaintenanceInsert = Database['public']['Tables']['maintenance']['Insert'];
type MaintenanceUpdate = Database['public']['Tables']['maintenance']['Update'];

export type MaintenanceWithRelations = MaintenanceRow & {
  units: { title: string; number: string | null } | null;
  tenants: { full_name: string } | null;
};

export const getMaintenanceRequests = async (): Promise<MaintenanceWithRelations[]> => {
  const { data, error } = await supabase
    .from('maintenance')
    .select('*, units(title, number), tenants(full_name)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as MaintenanceWithRelations[];
};

export const addMaintenance = async (request: MaintenanceInsert): Promise<MaintenanceRow> => {
  const { data, error } = await supabase
    .from('maintenance')
    .insert([request])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateMaintenance = async ({ id, ...updateData }: MaintenanceUpdate & { id: string }): Promise<MaintenanceRow> => {
  const { data, error } = await supabase
    .from('maintenance')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('maintenance')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
