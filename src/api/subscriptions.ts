import { supabase } from '@/lib/supabase';

export interface Subscription {
  id: string;
  type: string;
  value: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export const getSubscription = async (): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const upsertSubscription = async (
  sub: Partial<Subscription> & { id?: string }
): Promise<Subscription> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(sub)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
