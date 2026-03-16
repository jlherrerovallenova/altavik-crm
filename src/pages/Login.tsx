// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function Login() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay sesión, redirigimos al Dashboard automáticamente
  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          throw new Error('El correo o la contraseña no son correctos.');
        }
        throw authError;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* LOGO O ICONO */}
        <div className="flex justify-center mb-6 px-4 sm:px-0">
          <img
            src="/logo-altavik.png"
            alt="Altavik Residencial"
            className="w-full h-auto object-contain drop-shadow-sm"
          />
        </div>


      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-2xl shadow-slate-200/50 sm:rounded-[2.5rem] border border-slate-100 sm:px-12 animate-in fade-in zoom-in duration-500">

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* EMAIL */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none font-medium transition-all text-sm"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none font-medium transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* MENSAJE DE ERROR */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-xs text-red-700 font-bold leading-tight">{error}</p>
              </div>
            )}

            {/* BOTÓN DE ACCESO */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50">
            <p className="text-center text-xs text-slate-400 font-medium">
              ¿Olvidaste tu contraseña? Contacta con el administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}