import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../../context/ClientAuthContext';
import { Building2, KeyRound, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, client, loading } = useClientAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If they are already logged in, redirect them
    if (client && !loading) {
      navigate('/client/dashboard');
    }
  }, [client, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !dni) {
      setError('Por favor, rellena todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, dni);
      navigate('/client/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Comprueba tus datos e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-altavik-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/logo-altavik.png" alt="Altavik Logo" className="h-16 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Área de Clientes
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Accede para ver el progreso de tu vivienda
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-altavik-500 focus:border-altavik-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl h-12"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-slate-700">
                DNI / NIE
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="dni"
                  name="dni"
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="focus:ring-altavik-500 focus:border-altavik-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl h-12"
                  placeholder="12345678Z"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-altavik-600 focus:ring-altavik-500 border-slate-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                Recordar mis datos
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-altavik-600 hover:bg-altavik-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-altavik-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Acceder a mi área
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Si tienes problemas para acceder, contacta con tu asesor.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
