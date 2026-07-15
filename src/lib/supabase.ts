import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createGuardClient(): any {
  const notConfigured = () => {
    if (typeof console !== 'undefined') {
      console.warn('[Supabase] Skipped call — backend not configured.');
    }
    return { data: null, error: { message: 'Supabase غير مهيأ' } };
  };
  const queryBuilder: any = new Proxy(function () {}, {
    get: (_t, prop) => {
      if (prop === 'then') return (resolve: any) => resolve(notConfigured());
      return () => queryBuilder;
    },
    apply: () => queryBuilder,
  });
  return new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'from' || prop === 'rpc') return () => queryBuilder;
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signInWithPassword: async () => ({ data: null, error: { message: 'Supabase غير مهيأ' } }),
            signOut: async () => ({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          };
        }
        if (prop === 'storage' || prop === 'functions' || prop === 'channel') return () => queryBuilder;
        return () => queryBuilder;
      },
    },
  );
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : (createGuardClient() as ReturnType<typeof createClient<Database>>);
