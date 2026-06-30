import React, { useState, useEffect } from 'react';
import { Save, Loader2, Mail, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';

export function IntegrationsTab() {
  const { showAlert } = useDialog();
  const [resendApiKey, setResendApiKey] = useState('');
  const [unlayerProjectId, setUnlayerProjectId] = useState('');
  const [isSavingResend, setIsSavingResend] = useState(false);
  const [isSavingUnlayer, setIsSavingUnlayer] = useState(false);
  const [showResendApiKey, setShowResendApiKey] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('settings')
        .select('*')
        .in('key', ['resend_api_key', 'unlayer_project_id']);

      if (error) throw error;
      if (data) {
        const resend = data.find((s: any) => s.key === 'resend_api_key');
        const unlayer = data.find((s: any) => s.key === 'unlayer_project_id');
        if (resend) setResendApiKey(resend.value || '');
        if (unlayer) setUnlayerProjectId(unlayer.value || '');
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
    }
  };

  const handleSaveIntegration = async (key: string, value: string, setLoading: (l: boolean) => void) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      await showAlert({ title: 'Éxito', message: 'Configuración guardada correctamente' });
    } catch (err) {
      console.error(`Error saving ${key}:`, err);
      await showAlert({ title: 'Error', message: `No se pudo guardar la integración` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="border-b pb-2">
        <h2 className="text-lg font-semibold text-slate-800">Integraciones de Terceros</h2>
        <p className="text-xs text-slate-500">Configura las claves API para los servicios externos que utiliza el CRM.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Unlayer Project ID */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                Unlayer Project ID
              </h3>
              <p className="text-xs text-slate-500 mt-1">Necesario para el editor visual de Newsletters.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={unlayerProjectId}
              onChange={(e) => setUnlayerProjectId(e.target.value)}
              className="flex-1 p-2.5 text-sm border bg-white rounded-lg outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all font-mono"
              placeholder="Ej. 285017"
            />
            <button
              onClick={() => handleSaveIntegration('unlayer_project_id', unlayerProjectId, setIsSavingUnlayer)}
              disabled={isSavingUnlayer}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
            >
              {isSavingUnlayer ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Resend API Key */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center shrink-0">
                <Mail size={17} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Resend API Key</h3>
                <p className="text-xs text-slate-500 mt-0.5">Necesaria para el envío de emails transaccionales desde el CRM.</p>
              </div>
            </div>
            {resendApiKey && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-altavik-700 bg-altavik-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <CheckCircle2 size={12} /> Configurada
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave API (Backend)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type={showResendApiKey ? 'text' : 'password'}
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all font-mono text-slate-700"
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowResendApiKey(!showResendApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showResendApiKey ? 'Ocultar' : 'Mostrar'}
                >
                  {showResendApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                onClick={() => handleSaveIntegration('resend_api_key', resendApiKey, setIsSavingResend)}
                disabled={isSavingResend || !resendApiKey.trim()}
                className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingResend ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
                {isSavingResend ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              Esta clave se almacena de forma segura en la base de datos para que las funciones del servidor puedan enviar correos.
              Obtenla en{' '}
              <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-altavik-600 hover:underline font-medium">resend.com/api-keys</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
