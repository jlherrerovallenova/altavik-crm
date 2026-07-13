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
  Sparkles,
  Command,
  BadgeDollarSign,
  MessageSquareQuote
} from 'lucide-react';
import CommandPalette from '../components/ui/CommandPalette';
import { useAgendaAlerts } from '../hooks/useAgendaAlerts';
import { useWhatsAppReplies } from '../hooks/useWhatsAppReplies';
import { DailyBriefingModal, briefingShownToday, markBriefingShown } from '../components/DailyBriefingModal';
import { MessageSquare } from 'lucide-react';
import { DailyTasksModal } from '../components/DailyTasksModal';
import { useAutoLeadImporter } from '../hooks/useAutoLeadImporter';
import { useEmailTrackingNotifications } from '../hooks/useEmailTrackingNotifications';



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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { replies: waReplies, unseenCount: waUnseen, markAllSeen } = useWhatsAppReplies();
  const [showBriefing, setShowBriefing] = useState(false);
  const [isDailyTasksOpen, setIsDailyTasksOpen] = useState(false);

  // Escuchar aperturas de email en tiempo real
  useEmailTrackingNotifications((data) => {
    // react-doctor-disable-next-line no-impure-state-updater
    setNotificationData(data);
    setShowNotification(true);
  });

  // Mostrar briefing una vez al día tras cargar
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      if (!briefingShownToday()) {
        setShowBriefing(true);
        markBriefingShown();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [session]);

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

  // 0. Listener para la Magic Bar (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Mostrar tareas del día al arrancar (una vez por sesión)
  useEffect(() => {
    if (!session) return;
    
    const hasSeenTodayTasks = sessionStorage.getItem('hasSeenDailyTasks');
    if (!hasSeenTodayTasks) {
      // Pequeño delay para que no sea tan brusco tras el login
      const timer = setTimeout(() => {
        setIsDailyTasksOpen(true);
        sessionStorage.setItem('hasSeenDailyTasks', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // 3. Importación automática de leads al iniciar la app
  const { isImporting, importCount, error: importError } = useAutoLeadImporter(session);

  useEffect(() => {
    if (isImporting) {
      const timer = setTimeout(() => {
        setNotificationData({
          title: "Bandeja IA",
          message: "Escaneando bandeja para autogenerar leads...",
          type: "info"
        });
        setShowNotification(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isImporting]);

  useEffect(() => {
    if (!isImporting && importCount > 0) {
      const timer = setTimeout(() => {
        setNotificationData({
          title: "Leads Importados",
          message: `¡Se han importado automáticamente ${importCount} nuevos contactos desde la bandeja de entrada!`,
          type: "success"
        });
        setShowNotification(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isImporting, importCount]);

  useEffect(() => {
    if (importError) {
      const timer = setTimeout(() => {
        setNotificationData({
          title: "Error de Importación",
          message: `No se pudieron auto-importar algunos leads: ${importError}`,
          type: "error"
        });
        setShowNotification(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [importError]);

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
          <button type="button" onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Principal</p>
          <SidebarItem to="/" icon={<LayoutDashboard size={18} />} label="Panel de Control" active={location.pathname === '/'} onClick={closeSidebar} />
          <SidebarItem to="/leads" icon={<Users size={18} />} label="Clientes" active={location.pathname.startsWith('/leads')} onClick={closeSidebar} />
          <SidebarItem to="/inventory" icon={<Map size={18} />} label="Viviendas" active={location.pathname === '/inventory'} onClick={closeSidebar} />
          <SidebarItem to="/pipeline" icon={<Calendar size={18} />} label="Fase de Venta" active={location.pathname === '/pipeline'} onClick={closeSidebar} />
          <SidebarItem to="/sales" icon={<BadgeDollarSign size={18} />} label="Ventas" active={location.pathname === '/sales'} onClick={closeSidebar} />
          <SidebarItem to="/stats" icon={<BarChart3 size={18} />} label="Estadísticas" active={location.pathname === '/stats'} onClick={closeSidebar} />

          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Comunicaciones</p>
          <SidebarItem to="/discovery" icon={<Sparkles size={18} />} label="Captura Contactos" active={location.pathname === '/discovery'} onClick={closeSidebar} />
          <SidebarItem to="/whatsapp" icon={<MessageSquare size={18} />} label="WhatsApp" active={location.pathname === '/whatsapp'} onClick={closeSidebar} badge={waUnseen > 0 ? waUnseen : undefined} />
          
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Gestión</p>
          <SidebarItem to="/surveys" icon={<MessageSquareQuote size={18} />} label="Encuestas" active={location.pathname.startsWith('/surveys')} onClick={closeSidebar} />
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
            <button type="button"
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
            <button type="button"
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

            <button type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-altavik-50 text-slate-400 hover:text-altavik-600 rounded-lg border border-slate-200 transition-all group"
              title="Magic Bar (Ctrl+K)"
            >
              <Command size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Magic Bar</span>
              <div className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold">
                <span>K</span>
              </div>
            </button>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

            {/* Campana con badge y popover */}
            <div className="relative" ref={bellRef}>
              <button type="button"
                onClick={() => setShowBellPopover(v => !v)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Notificaciones de agenda"
              >
                <Bell size={20} />
                {alertTotal + waUnseen > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white">
                    {alertTotal + waUnseen > 9 ? '9+' : alertTotal + waUnseen}
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
                    {/* WhatsApp Replies */}
                    {waReplies.length > 0 && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 cursor-pointer hover:brightness-95 transition-all"
                        onClick={() => { setShowBriefing(true); setShowBellPopover(false); markAllSeen(); }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500">
                          <MessageSquare size={17} className="text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold text-emerald-800">Respuestas WhatsApp</p>
                          <p className="text-[11px] text-emerald-600">
                            {waReplies.length} cliente{waReplies.length !== 1 ? 's' : ''} ha{waReplies.length !== 1 ? 'n' : ''} respondido
                          </p>
                        </div>
                        {waUnseen > 0 && (
                          <span className="text-lg font-black text-emerald-600">{waUnseen}</span>
                        )}
                      </div>
                    )}

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

      {/* Daily Briefing Modal */}
      {showBriefing && (
        <DailyBriefingModal
          waReplies={waReplies}
          onClose={() => setShowBriefing(false)}
          onMarkRepliesSeen={markAllSeen}
        />
      )}

      {/* Magic Bar Component */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />

      {/* Daily Tasks Modal */}
      <DailyTasksModal
        isOpen={isDailyTasksOpen}
        onClose={() => setIsDailyTasksOpen(false)}
      />
    </div>
  );
}

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
  badge?: number;
}

function SidebarItem({ to, icon, label, active, onClick, badge }: SidebarItemProps) {
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
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}