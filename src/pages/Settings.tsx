// src/pages/Settings.tsx
import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Settings as SettingsIcon } from 'lucide-react';

// Subcomponents
import { SettingsSidebar, type SettingsTab } from '../components/settings/SettingsSidebar';
import { ProfileTab } from '../components/settings/ProfileTab';
import { PromotionTab } from '../components/settings/PromotionTab';
import { IntegrationsTab } from '../components/settings/IntegrationsTab';
import { DocumentsTab } from '../components/settings/DocumentsTab';
import { InventoryTab } from '../components/settings/InventoryTab';
import { ClientsTab } from '../components/settings/ClientsTab';
import { WhatsAppTab } from '../components/settings/WhatsAppTab';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />;
      case 'promotion': return <PromotionTab />;
      case 'integrations': return <IntegrationsTab />;
      case 'documents': return <DocumentsTab />;
      case 'inventory': return <InventoryTab />;
      case 'clients': return <ClientsTab />;
      case 'whatsapp': return <WhatsAppTab />;
      default: return <ProfileTab />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <PageHeader 
        title="Configuración del Sistema"
        icon={<SettingsIcon className="text-white" strokeWidth={3} size={24} />}
        subtitle="Panel central de administración y ajustes globales para la gestión del CRM."
      />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] transition-all">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;