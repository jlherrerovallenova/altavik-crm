// src/utils/connectionDiagnostic.ts
import { supabase, withRetry } from '../lib/supabase';

interface TestResult {
  step: string;
  success: boolean;
  latencyMs?: number;
  error?: string;
  details?: any;
}

export const runExhaustiveConnectionTest = async (): Promise<void> => {
  console.group('🧪 Iniciando Secuencia Exhaustiva de Diagnóstico de Conexión');
  const results: TestResult[] = [];
  const startTime = performance.now();

  const addResult = (result: TestResult) => {
    results.push(result);
    if (result.success) {
      console.log(`✅ [ÉXITO] ${result.step} ${result.latencyMs ? `(${result.latencyMs.toFixed(2)}ms)` : ''}`);
    } else {
      console.error(`❌ [FALLO] ${result.step}`, result.error, result.details || '');
    }
  };

  try {
    // 1. Verificación de Hardware/Navegador
    const t0 = performance.now();
    const isOnline = navigator.onLine;
    addResult({
      step: 'Comprobación de interfaz de red del navegador',
      success: isOnline,
      latencyMs: performance.now() - t0,
      details: { onLine: isOnline }
    });

    if (!isOnline) {
      throw new Error('El navegador reporta que no hay conexión a Internet.');
    }

    // 2. Verificación de Sesión (afectado por persistSession: false)
    const t1 = performance.now();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    addResult({
      step: 'Obtención de estado de Sesión de Supabase',
      success: !sessionError && !!sessionData.session,
      latencyMs: performance.now() - t1,
      error: sessionError?.message || (!sessionData.session ? 'No hay sesión activa' : undefined),
    });

    // 3. Prueba de latencia y disponibilidad REST (Lectura simple)
    const t2 = performance.now();
    try {
      // Usamos withRetry para comprobar si la capa de resiliencia funciona
      const profiles = await withRetry(
        () => supabase.from('profiles').select('id').limit(1),
        3, 
        500
      );
      
      addResult({
        step: 'Petición REST a base de datos (con reintentos)',
        success: !profiles.error,
        latencyMs: performance.now() - t2,
        error: profiles.error?.message
      });
    } catch (restError: any) {
      addResult({
        step: 'Petición REST a base de datos (con reintentos)',
        success: false,
        latencyMs: performance.now() - t2,
        error: restError.message || 'Fallo crítico en la red'
      });
    }

    // 4. Prueba de estrés de conexión concurrente
    const t3 = performance.now();
    try {
      console.log('   ⏳ Ejecutando prueba de ráfaga concurrente (5 peticiones simultáneas)...');
      const promises = Array.from({ length: 5 }).map(() => 
        supabase.from('profiles').select('id').limit(1)
      );
      
      const burstResults = await Promise.all(promises);
      const failedInBurst = burstResults.filter(r => r.error);
      
      addResult({
        step: 'Resistencia a peticiones concurrentes (Ráfaga)',
        success: failedInBurst.length === 0,
        latencyMs: performance.now() - t3,
        error: failedInBurst.length > 0 ? `${failedInBurst.length} peticiones fallaron en la ráfaga.` : undefined
      });
    } catch (burstError: any) {
      addResult({
        step: 'Resistencia a peticiones concurrentes (Ráfaga)',
        success: false,
        latencyMs: performance.now() - t3,
        error: burstError.message
      });
    }

  } catch (criticalError: any) {
    console.error('🛑 Diagnóstico abortado por error crítico:', criticalError);
  } finally {
    const totalTime = performance.now() - startTime;
    console.log(`\n📊 Resumen del Diagnóstico (Tiempo total: ${totalTime.toFixed(2)}ms):`);
    const passed = results.filter(r => r.success).length;
    console.log(`   Pruebas superadas: ${passed}/${results.length}`);
    
    if (passed === results.length) {
      console.log('🟢 CONEXIÓN ESTABLE: La infraestructura de red y Supabase responden correctamente.');
    } else {
      console.warn('🔴 CONEXIÓN INESTABLE: Revisa los errores marcados con ❌ arriba para aislar el problema.');
    }
    console.groupEnd();
  }
};

// Exponer la función globalmente para poder ejecutarla desde la consola del navegador en cualquier momento
if (typeof window !== 'undefined') {
  (window as any).runSupabaseTest = runExhaustiveConnectionTest;
}