import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Map, 
  Settings, 
  Plus, 
  Mail, 
  Sparkles,
  UserPlus,
  BarChart3,
  X,
  Command
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  shortcut?: string[];
}

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    {
      id: 'dash',
      title: 'Panel de Control',
      description: 'Ir a la vista principal',
      icon: <LayoutDashboard size={18} />,
      category: 'Navegación',
      action: () => navigate('/')
    },
    {
      id: 'leads',
      title: 'Clientes (Leads)',
      description: 'Gestionar base de datos de contactos',
      icon: <Users size={18} />,
      category: 'Navegación',
      action: () => navigate('/leads')
    },
    {
      id: 'new-lead',
      title: 'Nuevo Lead',
      description: 'Añadir un nuevo contacto manualmente',
      icon: <UserPlus size={18} />,
      category: 'Acciones Rápidas',
      action: () => navigate('/leads?action=new')
    },
    {
      id: 'agenda',
      title: 'Agenda Comercial',
      description: 'Ver calendario y tareas pendientes',
      icon: <Calendar size={18} />,
      category: 'Navegación',
      action: () => navigate('/agenda')
    },
    {
      id: 'new-task',
      title: 'Nueva Tarea',
      description: 'Agendar llamada, visita o WhatsApp',
      icon: <Plus size={18} />,
      category: 'Acciones Rápidas',
      action: () => navigate('/agenda?action=new')
    },
    {
      id: 'inventory',
      title: 'Viviendas (Inventario)',
      description: 'Explorar propiedades disponibles',
      icon: <Map size={18} />,
      category: 'Navegación',
      action: () => navigate('/inventory')
    },
    {
      id: 'stats',
      title: 'Estadísticas',
      description: 'Ver rendimiento comercial',
      icon: <BarChart3 size={18} />,
      category: 'Navegación',
      action: () => navigate('/stats')
    },
    {
      id: 'newsletters',
      title: 'Newsletters',
      description: 'Gestionar campañas de email',
      icon: <Mail size={18} />,
      category: 'Comunicación',
      action: () => navigate('/newsletters')
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Ajustes del sistema y perfil',
      icon: <Settings size={18} />,
      category: 'Sistema',
      action: () => navigate('/settings')
    }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Palette Container */}
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-top-4 duration-300 flex flex-col max-h-[60vh]">
        
        {/* Search Header */}
        <div className="relative p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="¿Qué necesitas hacer? (Escribe para buscar...)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
            <span className="text-[12px]">ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3 text-slate-400">
              <Sparkles size={32} className="opacity-20" />
              <p className="text-sm font-medium">No se encontraron comandos para "{search}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Grouping by category would be better but let's keep it simple first */}
              {filteredCommands.map((cmd, index) => (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                    ${index === selectedIndex ? 'bg-altavik-600 text-white shadow-lg shadow-altavik-600/20 translate-x-1' : 'hover:bg-slate-50 text-slate-700'}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                    ${index === selectedIndex ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm truncate">{cmd.title}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${index === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {cmd.category}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${index === selectedIndex ? 'text-white/70' : 'text-slate-400'}`}>
                      {cmd.description}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <div className="shrink-0 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold">ENTER</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center text-[8px]">↑</div> <div className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center text-[8px]">↓</div> Navegar</span>
            <span className="flex items-center gap-1.5"><div className="w-8 h-4 bg-white border border-slate-200 rounded flex items-center justify-center text-[8px]">ENTER</div> Seleccionar</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={10} /> ALTAVIK MAGIC BAR
          </div>
        </div>
      </div>
    </div>
  );
}
