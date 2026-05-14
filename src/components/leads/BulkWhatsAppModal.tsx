// src/components/leads/BulkWhatsAppModal.tsx
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, User, CheckCircle2, ExternalLink, Loader2, Layout } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { useWhatsAppTemplates } from '../../hooks/useWhatsAppTemplates';
import { parseTemplate, getWhatsAppUrl, getGreeting, sendWhatsAppCloudAPI } from '../../services/whatsappService';

type Lead = Database['public']['Tables']['leads']['Row'];

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  title: string;
}

export default function BulkWhatsAppModal({ isOpen, onClose, leads, title }: BulkWhatsAppModalProps) {
  const { templates, loading } = useWhatsAppTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sentLeads, setSentLeads] = useState<string[]>([]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultId = templates[0].id || templates[0].name;
      setSelectedTemplateId(defaultId);
    }
  }, [templates, selectedTemplateId]);

  if (!isOpen) return null;

  const [isSendingAll, setIsSendingAll] = useState(false);
  const isCloudConfigured = !!import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID && !!import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;

  const handleSendToLead = async (lead: Lead) => {
    const template = templates.find(t => (t.id || t.name) === selectedTemplateId);
    if (!template) return;

    const personalizedMessage = parseTemplate(template.body, { name: lead.name });
    
    try {
      if (isCloudConfigured) {
        // Enviar via API oficial
        const variables = [lead.name.split(' ')[0], getGreeting()];
        await sendWhatsAppCloudAPI(lead.phone || '', template.name.toLowerCase().replace(/\s+/g, '_'), 'es', [
          {
            type: 'body',
            parameters: variables.map(v => ({ type: 'text', text: v }))
          }
        ]);
      } else {
        // Enviar via URL tradicional
        const whatsappUrl = getWhatsAppUrl(lead.phone || '', personalizedMessage);
        window.open(whatsappUrl, '_blank');
      }

      if (!sentLeads.includes(lead.id)) {
        setSentLeads(prev => [...prev, lead.id]);
      }
    } catch (err) {
      console.error("Error enviando WhatsApp:", err);
      alert("Error al enviar el mensaje. Revisa la configuración.");
    }
  };

  const handleSendAll = async () => {
    if (!isCloudConfigured) {
      alert("Debes configurar la WhatsApp Cloud API para usar el envío masivo automático.");
      return;
    }
    
    const template = templates.find(t => (t.id || t.name) === selectedTemplateId);
    if (!template) return;

    setIsSendingAll(true);
    const leadsToSend = leads.filter(l => !sentLeads.includes(l.id) && l.phone);

    for (const lead of leadsToSend) {
      try {
        const variables = [lead.name.split(' ')[0], getGreeting()];
        await sendWhatsAppCloudAPI(lead.phone || '', template.name.toLowerCase().replace(/\s+/g, '_'), 'es', [
          {
            type: 'body',
            parameters: variables.map(v => ({ type: 'text', text: v }))
          }
        ]);
        setSentLeads(prev => [...prev, lead.id]);
        // Pequeño delay para no saturar
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error enviando a ${lead.name}:`, err);
      }
    }
    setIsSendingAll(false);
  };

  const selectedTemplate = templates.find(t => (t.id || t.name) === selectedTemplateId);
  const progress = Math.round((sentLeads.length / leads.length) * 100);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="bg-emerald-600 px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <MessageCircle size={24} fill="white" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl leading-tight">WhatsApp Masivo</h2>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">{title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Template Selector & Preview */}
          <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col gap-6 bg-slate-50/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Plantilla Inteligente</label>
                {loading && <Loader2 size={14} className="animate-spin text-emerald-600" />}
              </div>
              
              <div className="relative">
                <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm text-slate-700 transition-all shadow-sm appearance-none cursor-pointer"
                >
                  {templates.map(t => (
                    <option key={t.id || t.name} value={t.id || t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vista Previa (Borrador)</label>
                <div className="w-full h-48 p-5 bg-white/50 border border-slate-100 rounded-[1.5rem] text-sm text-slate-500 font-medium overflow-y-auto italic">
                  {selectedTemplate ? (
                    parseTemplate(selectedTemplate.body, { name: 'Cliente' })
                  ) : (
                    'Selecciona una plantilla para ver la previsualización...'
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-900 mb-1">Personalización automática</h4>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Cada mensaje se ajustará al nombre del cliente, su género y el saludo horario adecuado (buenos días/tardes).
                </p>
              </div>
            </div>
          </div>

          {/* Right: Lead List & Actions */}
          <div className="w-full md:w-1/2 flex flex-col">
            {/* Progress bar */}
            <div className="px-8 py-4 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Progreso del envío</span>
                <span className="text-sm font-black text-emerald-600">{sentLeads.length} / {leads.length}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 custom-scrollbar">
              {leads.map((lead, index) => {
                const isSent = sentLeads.includes(lead.id);
                return (
                  <div 
                    key={lead.id}
                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isSent ? 'bg-emerald-50/50 border-emerald-100 opacity-60' : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSent ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        {isSent ? <CheckCircle2 size={18} /> : <User size={18} />}
                      </div>
                      <div className="overflow-hidden">
                        <p className={`text-sm font-bold truncate ${isSent ? 'text-emerald-900' : 'text-slate-800'}`}>{lead.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{lead.phone || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleSendToLead(lead)}
                      disabled={!lead.phone}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isSent 
                          ? 'bg-slate-200 text-slate-500' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 shadow-md shadow-emerald-200'
                      }`}
                    >
                      {isSent ? 'Reenviar' : 'Mandar'}
                      <ExternalLink size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400 font-bold">
            Se abrirá una nueva pestaña de WhatsApp por cada cliente.
          </p>
          <div className="flex gap-3">
            {isCloudConfigured && leads.length > sentLeads.length && (
              <button
                onClick={handleSendAll}
                disabled={isSendingAll}
                className="px-8 py-2.5 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
              >
                {isSendingAll ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    Enviar a todos automáticamente
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
            >
              Cerrar Tablero
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
