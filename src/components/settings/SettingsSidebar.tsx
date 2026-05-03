import React from 'react';
import { User, FolderOpen, Settings as SettingsIcon, Home, Users } from 'lucide-react';

export type SettingsTab = 'profile' | 'documents' | 'integrations' | 'inventory' | 'clients';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
}

export function SettingsSidebar({ activeTab, setActiveTab }: SettingsSidebarProps) {
  const menuItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Mi Perfil', icon: <User size={16} /> },
    { id: 'documents', label: 'Documentos Venta', icon: <FolderOpen size={16} /> },
    { id: 'integrations', label: 'Integraciones', icon: <SettingsIcon size={16} /> },
    { id: 'inventory', label: 'Viviendas', icon: <Home size={16} /> },
    { id: 'clients', label: 'Clientes', icon: <Users size={16} /> },
  ];

  return (
    <div className="w-full md:w-64 flex flex-col gap-1">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === item.id
              ? 'bg-altavik-600 text-white shadow-lg shadow-altavik-200'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
