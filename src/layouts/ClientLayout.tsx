import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';
import { LogOut, Home, User, Loader2 } from 'lucide-react';

export default function ClientLayout() {
  const { client, loading, logout } = useClientAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-altavik-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Cargando Área de Clientes...</p>
      </div>
    );
  }

  if (!client) {
    return <Navigate to="/client/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/client/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <img src="/logo-altavik.png" alt="Residencial Altavik" className="h-8 object-contain" />
              <span className="text-lg font-semibold text-slate-800 hidden sm:block">Área de Clientes</span>
            </div>

            {/* Right side navigation */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <User className="w-5 h-5 text-altavik-600" />
                <span className="hidden sm:block">{client.name}</span>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:block">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Home className="w-8 h-8 text-altavik-600" />
            Bienvenido a tu nueva vivienda
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aquí podrás consultar el estado de tu compra, los pagos realizados y las próximas cuotas.
          </p>
        </div>
        
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Residencial Altavik. Todos los derechos reservados.</p>
          <p className="mt-1">Si tienes alguna duda, contacta con tu asesor comercial.</p>
        </div>
      </footer>
    </div>
  );
}
