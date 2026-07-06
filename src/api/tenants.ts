import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type TenantRow = Database['public']['Tables']['tenants']['Row'];
type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export const getTenants = async (): Promise<TenantRow[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const addTenant = async (tenant: TenantInsert): Promise<TenantRow> => {
  const { data, error } = await supabase
    .from('tenants')
    .insert([tenant])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateTenant = async ({ id, ...updateData }: TenantUpdate & { id: string }): Promise<TenantRow> => {
  const { data, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteTenant = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
