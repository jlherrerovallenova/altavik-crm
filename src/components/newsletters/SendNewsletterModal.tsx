// src/components/newsletters/SendNewsletterModal.tsx
import { useState } from 'react';
import { useLeads } from '../../hooks/useLeads';
import { X, Send, Loader2, Users, Filter, UserCheck, AlertCircle } from 'lucide-react';
import type { Database } from '../../types/supabase';

type LeadInfo = Database['public']['Tables']['leads']['Row'];

type AudienceType = 'all' | 'phase' | 'manual';
type PhaseType = LeadInfo['status'];

interface SendNewsletterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (config: { audience: AudienceType; phase?: PhaseType; leadIds?: string[] }) => void;
    isSending: boolean;
}

const PHASES: { value: PhaseType; label: string }[] = [
    { value: 'new', label: 'Nuevo' },
    { value: 'contacted', label: 'Contactado' },
    { value: 'qualified', label: 'Cualificado' },
    { value: 'visiting', label: 'Visitando' },
    { value: 'proposal', label: 'Propuesta' },
    { value: 'negotiation', label: 'Negociación' },
    { value: 'closed', label: 'Cerrado/Ganado' },
    { value: 'lost', label: 'Perdido' },
];

export function SendNewsletterModal({ isOpen, onClose, onSend, isSending }: SendNewsletterModalProps) {
    const [audience, setAudience] = useState<AudienceType>('all');
    const [selectedPhase, setSelectedPhase] = useState<PhaseType>('new');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading: leadsLoading } = useLeads({
        page: 1,
        pageSize: 5000, // Traer todos para poder filtrar manualmente en el modal
        sortField: 'name',
        sortDirection: 'asc'
    });

    if (!isOpen) return null;

    // Solo mostraremos clientes suscritos y con email
    const eligibleLeads = data?.leads?.filter((l: LeadInfo) => l.is_subscribed !== false && l.email) || [];

    const filteredManualLeads = eligibleLeads.filter((l: LeadInfo) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    const handleToggleLead = (id: string) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(selectedLeads.filter(l => l !== id));
        } else {
            setSelectedLeads([...selectedLeads, id]);
        }
    };

    const handleSend = () => {
        if (audience === 'manual' && selectedLeads.length === 0) {
            alert("No has seleccionado a ningún destinatario.");
            return;
        }

        onSend({
            audience,
            phase: audience === 'phase' ? selectedPhase : undefined,
            leadIds: audience === 'manual' ? selectedLeads : undefined,
        });
    };

    const countTargetAudience = () => {
        if (audience === 'all') return eligibleLeads.length;
        if (audience === 'phase') return eligibleLeads.filter((l: LeadInfo) => l.status === selectedPhase).length;
        if (audience === 'manual') return selectedLeads.length;
        return 0;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Enviar Campaña</h3>
                        <p className="text-sm text-slate-500 mt-1">Elige los destinatarios para este envío.</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-200"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    <div className="space-y-6">
                        {/* Selector de tipo de audiencia */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700 block uppercase tracking-wider">
                                Segmento Destinatario
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* All */}
                                <div
                                    className={`border rounded-xl p-4 cursor-pointer transition-all ${audience === 'all' ? 'border-altavik-500 bg-altavik-50 ring-2 ring-altavik-500/20' : 'border-slate-200 hover:border-emerald-300'}`}
                                    onClick={() => setAudience('all')}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg ${audience === 'all' ? 'bg-altavik-100 text-altavik-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <Users size={18} />
                                        </div>
                                        <span className="font-bold text-slate-800">Todos</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Envía a toda la base de datos de suscritos.
                                    </p>
                                </div>

                                {/* Phase */}
                                <div
                                    className={`border rounded-xl p-4 cursor-pointer transition-all ${audience === 'phase' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'}`}
                                    onClick={() => setAudience('phase')}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg ${audience === 'phase' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <Filter size={18} />
                                        </div>
                                        <span className="font-bold text-slate-800">Por Fase</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Filtra usando el túnel de ventas.
                                    </p>
                                </div>

                                {/* Manual */}
                                <div
                                    className={`border rounded-xl p-4 cursor-pointer transition-all ${audience === 'manual' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20' : 'border-slate-200 hover:border-purple-300'}`}
                                    onClick={() => setAudience('manual')}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg ${audience === 'manual' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <UserCheck size={18} />
                                        </div>
                                        <span className="font-bold text-slate-800">Manual</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Selecciona los contactos de una lista.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Opciones específicas por audiencia */}
                        <div className="pt-4 border-t border-slate-100 min-h-[220px]">
                            {audience === 'phase' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <label className="text-sm font-bold text-slate-700 block">Selecciona la fase del cliente</label>
                                    <select
                                        className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 font-medium"
                                        value={selectedPhase}
                                        onChange={(e) => setSelectedPhase(e.target.value as PhaseType)}
                                    >
                                        {PHASES.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm mt-4">
                                        <AlertCircle className="shrink-0 text-blue-500" size={18} />
                                        <p>Se enviará el correo únicamente a los participantes que estén actualmente con el estado: <strong>{PHASES.find(p => p.value === selectedPhase)?.label}</strong></p>
                                    </div>
                                </div>
                            )}

                            {audience === 'manual' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
                                    <label className="text-sm font-bold text-slate-700 block">Buscar y seleccionar destinatarios</label>

                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar por nombre o email..."
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                    />

                                    {leadsLoading ? (
                                        <div className="flex justify-center items-center py-10">
                                            <Loader2 className="animate-spin text-slate-400" size={30} />
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100 mt-2 flex-1">
                                            {filteredManualLeads.length === 0 ? (
                                                <div className="p-6 text-center text-slate-500 text-sm">No hay contactos disponibles.</div>
                                            ) : (
                                                filteredManualLeads.map((lead: LeadInfo) => (
                                                    <label key={lead.id} className="flex items-center p-3 hover:bg-slate-50 cursor-pointer transition-colors gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                            checked={selectedLeads.includes(lead.id)}
                                                            onChange={() => handleToggleLead(lead.id)}
                                                        />
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="font-bold text-slate-800 text-sm truncate">{lead.name}</p>
                                                            <p className="text-xs text-slate-500 truncate">{lead.email}</p>
                                                        </div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                                            {PHASES.find(p => p.value === lead.status)?.label || lead.status}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {audience === 'all' && (
                                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-emerald-200 bg-altavik-50/50 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-16 h-16 bg-altavik-100 text-altavik-600 rounded-full flex items-center justify-center mb-4">
                                        <Send size={30} className="-ml-1" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">Envío Masivo</h4>
                                    <p className="text-center text-slate-600 text-sm mt-2 max-w-sm leading-relaxed">
                                        Esta campaña será enviada a toda tu lista de contactos que estén habilitados para recibir correos y no se hayan dado de baja.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-500">
                        {leadsLoading ? (
                            <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Calculando...</span>
                        ) : (
                            <span>Destinatarios estimados: <span className="text-altavik-600 text-base ml-1">{countTargetAudience()}</span></span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSending}
                            className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || leadsLoading || (audience === 'manual' && selectedLeads.length === 0)}
                            className="flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-altavik-600 hover:bg-altavik-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Confirmar y Enviar
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
