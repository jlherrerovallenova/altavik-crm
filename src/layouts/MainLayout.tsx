// src/layouts/MainLayout.tsx
import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../components/AppNotification';
import { ConnectionStatus } from '../components/ConnectionStatus';
import DebugPanel from '../components/DebugPanel';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Map, 
  Settings, 
  Search, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Loader2, 
  Mail, 
  AlertTriangle, 
  Clock,
  BarChart3,
  Inbox,
  Sparkles
} from 'lucide-react';
import { useAgendaAlerts } from '../hooks/useAgendaAlerts';
import { useInboxCount } from '../hooks/useInboxCount';


export default function MainLayout() {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para el buscador y notificaciones
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });
  const [showBellPopover, setShowBellPopover] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { todayCount, overdueCount, total: alertTotal } = useAgendaAlerts();
  const { data: inboxCount = 0 } = useInboxCount();

  // Cierra el popover al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBellPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 1. PANTALLA DE CARGA
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-altavik-600 h-10 w-10" />
          <p className="text-slate-400 text-sm animate-pulse">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // 2. PROTECCIÓN
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Manejador del buscador: Redirige a la sección correspondiente con el parámetro de búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();

    if (!query) return;

    // Lógica de redirección inteligente según lo que el usuario busque
    if (location.pathname.includes('leads') || location.pathname === '/') {
      navigate(`/leads?search=${encodeURIComponent(query)}`);
    } else if (location.pathname.includes('inventory')) {
      navigate(`/inventory?search=${encodeURIComponent(query)}`);
    } else {
      setNotificationData({
        title: "Búsqueda",
        message: `Buscando "${query}" en todo el sistema...`,
        type: 'info'
      });
      setShowNotification(true);
    }
  };

  return (
    <div className="flex h-screen bg-transparent font-sans text-slate-900 overflow-hidden">
      <ConnectionStatus />

      {/* Panel de depuración ultra-intrusivo para ver qué crashea la conexión, oculto en prod */}
      {import.meta.env.DEV && <DebugPanel />}

      {showNotification && (
        <AppNotification
          title={notificationData.title}
          message={notificationData.message}
          type={notificationData.type}
          onClose={() => setShowNotification(false)}
        />
      )}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-card bg-slate-900/95 text-slate-300 flex flex-col shadow-2xl border-r border-white/5
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        <div className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-altavik-500 rounded flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-altavik-900/20">
              A
            </div>
            <span className="text-white font-display font-bold text-lg tracking-tight">Altavik Residencial</span>
          </div>
          <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Principal</p>
          <SidebarItem to="/" icon={<LayoutDashboard size={18} />} label="Panel de Control" active={location.pathname === '/'} onClick={closeSidebar} />
          <SidebarItem to="/leads" icon={<Users size={18} />} label="Clientes" active={location.pathname.startsWith('/leads')} onClick={closeSidebar} />
          <SidebarItem to="/inventory" icon={<Map size={18} />} label="Viviendas" active={location.pathname === '/inventory'} onClick={closeSidebar} />
          <SidebarItem to="/pipeline" icon={<Calendar size={18} />} label="Ventas" active={location.pathname === '/pipeline'} onClick={closeSidebar} />
          <SidebarItem to="/stats" icon={<BarChart3 size={18} />} label="Estadísticas" active={location.pathname === '/stats'} onClick={closeSidebar} />

          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Comunicaciones</p>
          <div className="relative">
            <SidebarItem to="/inbox" icon={<Inbox size={18} />} label="Bandeja Inbox" active={location.pathname === '/inbox'} onClick={closeSidebar} />
            {inboxCount > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg pointer-events-none">
                {inboxCount}
              </span>
            )}
          </div>
          <SidebarItem to="/discovery" icon={<Sparkles size={18} />} label="Descubrimiento" active={location.pathname === '/discovery'} onClick={closeSidebar} />
          
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Gestión</p>
          <SidebarItem to="/newsletters" icon={<Mail size={18} />} label="Newsletters" active={location.pathname.startsWith('/newsletters')} onClick={closeSidebar} />
          <SidebarItem to="/settings" icon={<Settings size={18} />} label="Configuración" active={location.pathname === '/settings'} onClick={closeSidebar} />
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-gradient-to-br from-altavik-500 to-altavik-700 flex items-center justify-center text-white font-bold text-xs shadow-md uppercase">
              {session.user.email?.substring(0, 2) || 'US'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Usuario</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        <header className="h-20 glass-card bg-white/60 backdrop-blur-md border-b border-white/40 flex items-center justify-between px-4 md:px-8 z-40 relative flex-shrink-0">
          {/* IZQUIERDA: Menú móvil */}
          <div className="flex items-center w-1/3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* CENTRO: Logo */}
          <div className="flex justify-center w-1/3">
            <img
              src="/logo-altavik.png"
              alt="Altavik Residencial"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* DERECHA: Buscador y campana */}
          <div className="flex items-center justify-end gap-2 md:gap-4 w-1/3">
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar clientes o propiedades..."
                className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-altavik-500 focus:bg-white transition-all w-48 lg:w-64 placeholder:text-slate-400 font-medium"
              />
            </form>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

            {/* Campana con badge y popover */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setShowBellPopover(v => !v)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Notificaciones de agenda"
              >
                <Bell size={20} />
                {alertTotal > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white">
                    {alertTotal > 9 ? '9+' : alertTotal}
                  </span>
                )}
              </button>

              {/* POPOVER */}
              {showBellPopover && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase tracking-widest">Agenda de hoy</span>
                    <Bell size={14} className="text-slate-400" />
                  </div>

                  <div className="p-3 space-y-2">
                    {/* Tareas de hoy */}
                    <Link 
                      to="/agenda?filter=today"
                      onClick={() => setShowBellPopover(false)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${todayCount > 0 ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${todayCount > 0 ? 'bg-blue-500' : 'bg-slate-200'}`}>
                        <Clock size={17} className={todayCount > 0 ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-xs font-bold ${todayCount > 0 ? 'text-blue-800' : 'text-slate-500'}`}>Tareas para hoy</p>
                        <p className={`text-[11px] ${todayCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {todayCount === 0 ? 'Sin tareas pendientes' : `${todayCount} tarea${todayCount !== 1 ? 's' : ''} pendiente${todayCount !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {todayCount > 0 && (
                        <span className="text-lg font-black text-blue-600">{todayCount}</span>
                      )}
                    </Link>

                    {/* Tareas vencidas */}
                    <Link 
                      to="/agenda?filter=overdue"
                      onClick={() => setShowBellPopover(false)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${overdueCount > 0 ? 'bg-red-50 border border-red-100' : 'bg-slate-50'}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${overdueCount > 0 ? 'bg-red-500' : 'bg-slate-200'}`}>
                        <AlertTriangle size={17} className={overdueCount > 0 ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-xs font-bold ${overdueCount > 0 ? 'text-red-800' : 'text-slate-500'}`}>Tareas vencidas</p>
                        <p className={`text-[11px] ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {overdueCount === 0 ? 'Todo al día' : `${overdueCount} tarea${overdueCount !== 1 ? 's' : ''} sin completar`}
                        </p>
                      </div>
                      {overdueCount > 0 && (
                        <span className="text-lg font-black text-red-600">{overdueCount}</span>
                      )}
                    </Link>
                  </div>

                  <div className="px-3 pb-3">
                    <Link
                      to="/agenda"
                      onClick={() => setShowBellPopover(false)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Calendar size={13} /> Ver agenda completa
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-transparent relative">
          <div className="p-10 pb-20">
            <Outlet context={{ searchTerm }} />
          </div>
        </div>
      </main>
    </div>
  );
}

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

function SidebarItem({ to, icon, label, active, onClick }: SidebarItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
        ${active
          ? 'bg-altavik-600 text-white shadow-md shadow-altavik-900/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }
      `}
    >
      <span className={active ? 'text-altavik-100' : 'text-slate-500 group-hover:text-white'}>{icon}</span>
      {label}
    </Link>
  );
}