import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type PaymentWithRelations = PaymentRow & {
  contracts: { 
    number: string | null;
    units: { title: string; number: string | null } | null;
    tenants: { full_name: string } | null;
  } | null;
};

export const getPayments = async (): Promise<PaymentWithRelations[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, contracts(number, units(title, number), tenants(full_name))')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as PaymentWithRelations[];
};

export const addPayment = async (payment: PaymentInsert): Promise<PaymentRow> => {
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updatePayment = async ({ id, ...updateData }: PaymentUpdate & { id: string }): Promise<PaymentRow> => {
  const { data, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deletePayment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
