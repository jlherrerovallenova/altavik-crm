import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, withRetry } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { Loader2, AlertCircle, XCircle } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'agent' | 'viewer';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Diagnóstico visual en pantalla
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);

  // Control de refrescos para evitar bucles infinitos
  const lastProfileFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const fetchProfile = async (userId: string, retries = 2) => {
    // Si ya estamos buscando, o buscamos hace menos de 2 segundos, ignoramos para no spammar.
    const now = Date.now();
    console.log(`[AuthDebug] 👤 Intento de fetchProfile. (userId=${userId}, retries=${retries})`);
    if (isFetchingRef.current || (now - lastProfileFetchRef.current < 2000)) {
      console.log('⏳ fetchProfile omitido (debounce o fetch en progreso).');
      return;
    }

    isFetchingRef.current = true;
    lastProfileFetchRef.current = now;

    try {
      console.log(`[AuthDebug] 📡 request a profiles: ${userId}`);
      const { data, error } = await withRetry(
        () => supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        3,
        500
      );

      if (error) {
        if (error.message?.includes('AbortError') && retries > 0) {
          console.warn(`⏳ AbortError detectado. Reintentando en 1s... (Quedan ${retries})`);
          isFetchingRef.current = false;
          setTimeout(() => fetchProfile(userId, retries - 1), 1000);
          return;
        }

        console.warn('Aviso: Perfil no encontrado o error de API:', error.message);
        setAuthError({ title: 'Error de Conexión (Perfil)', message: error.message });
        setProfile(null);
        return;
      }
      console.log(`[AuthDebug] ✅ Perfil cargado:`, data);
      setProfile(data);
    } catch (error: any) {
      if (error.message?.includes('AbortError') && retries > 0) {
        console.warn(`⏳ Catch AbortError detectado. Reintentando en 1s... (Quedan ${retries})`);
        isFetchingRef.current = false;
        setTimeout(() => fetchProfile(userId, retries - 1), 1000);
        return;
      }

      console.error('Error inesperado cargando el perfil:', error);
      setAuthError({ title: 'Fallo de Red Crítico', message: error.message || 'No se pudo contactar con Supabase.' });
      setProfile(null);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log('[AuthDebug] 🚀 useEffect de inicialización montado.');

    const initSession = async () => {
      console.log('[AuthDebug] 🛑 initSession() iniciado');
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
             console.warn('Silent logout due to invalid token:', error.message);
             await supabase.auth.signOut();
             if (mounted) {
               setSession(null);
               setUser(null);
               setProfile(null);
             }
             return;
          }
          throw error;
        }

        const currentSession = data.session;
        console.log(`[AuthDebug] 🔑 getSession retorno:`, currentSession ? currentSession.user.email : 'null');

        if (mounted) {
          sessionRef.current = currentSession;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            fetchProfile(currentSession.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (error: any) {
        console.error("Error crítico obteniendo sesión inicial:", error);
        if (mounted) {
          setAuthError({ title: 'Error de Autenticación', message: 'No se pudo verificar tu sesión con el servidor.' });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('🔄 Cambio de Auth detectado por onAuthStateChange:', event, currentSession?.user?.email || 'Sin usuario');

      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;

      sessionRef.current = currentSession;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      console.log('🧹 Limpiando AuthContext useEffect...');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    setProfile(null);
    return await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  const value = { session, user, profile, loading, signIn, signOut, refreshProfile };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 relative">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-altavik-600 h-10 w-10" />
          <p className="text-slate-400 text-sm animate-pulse">Sincronizando con Altavik CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-md bg-red-600 text-white p-4 rounded-xl shadow-2xl flex gap-4 animate-in slide-in-from-top-4">
          <AlertCircle className="shrink-0" size={24} />
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight mb-1">{authError.title}</h3>
            <p className="text-sm text-red-100">{authError.message}</p>
          </div>
          <button onClick={() => setAuthError(null)} className="text-red-200 hover:text-white shrink-0 self-start p-1 transition-colors">
            <XCircle size={20} />
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};