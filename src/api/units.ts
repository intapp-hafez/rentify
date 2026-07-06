import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type UnitRow = Database['public']['Tables']['units']['Row'];
type UnitInsert = Database['public']['Tables']['units']['Insert'];
type UnitUpdate = Database['public']['Tables']['units']['Update'];

export const getUnits = async (): Promise<UnitRow[]> => {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const addUnit = async (unit: UnitInsert): Promise<UnitRow> => {
  const { data, error } = await supabase
    .from('units')
    .insert([unit])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateUnit = async ({ id, ...updateData }: UnitUpdate & { id: string }): Promise<UnitRow> => {
  const { data, error } = await supabase
    .from('units')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteUnit = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
