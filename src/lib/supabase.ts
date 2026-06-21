// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_URL
  : (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');

const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');

if (!supabaseUrl) {
  console.error('❌ ERROR CRÍTICO: VITE_SUPABASE_URL no está definida en el archivo .env');
} else {
  console.log('✅ VITE_SUPABASE_URL detectada');
}

if (!supabaseAnonKey) {
  console.error('❌ ERROR CRÍTICO: VITE_SUPABASE_ANON_KEY no está definida en el archivo .env');
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY detectada');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      // Usamos localStorage para mayor estabilidad, especialmente en iframes.
      // Desactivamos el auto-refresco nativo que causa el bug ERR_INSUFFICIENT_RESOURCES
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-client-info': 'mirapinos-crm'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export const withRetry = async <T>(
  fn: () => T | Promise<T>,
  maxRetries = 3,
  delay = 500
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await Promise.resolve(fn());
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      const errObj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
      const isNetworkError =
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch') ||
        errObj.code === 'NETWORK_ERROR' ||
        errObj.status === 0;

      if (isNetworkError && i < maxRetries - 1) {
        console.warn(`⚠️ Error de red, reintentando (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else if (!isNetworkError) {
        throw error;
      }
    }
  }

  console.error('❌ Falló después de múltiples reintentos:', lastError);
  throw lastError;
};