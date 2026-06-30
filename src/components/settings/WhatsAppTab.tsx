import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, MessageCircle, CircleCheck as CheckCircle2, Loader as Loader2, Info, LayoutGrid as Layout, Power } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseTemplate, type WhatsAppTemplate } from '../../services/whatsappService';

export const WhatsAppTab: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WhatsAppTemplate & { is_active: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_templates' as any)
      .select('*')
      .order('category', { ascending: false })
      .order('name');
    
    if (!error && data) {
      setTemplates(data);
      if (data.length > 0 && !selectedId) {
        handleSelect(data[0]);
      }
    }
    setLoading(false);
  };

  const handleSelect = (template: WhatsAppTemplate) => {
    setSelectedId(template.id || null);
    setEditingTemplate(template);
    setStatus('idle');
  };

  const handleCreateNew = () => {
    const newTemplate: Partial<WhatsAppTemplate> = {
      name: 'Nueva Plantilla',
      body: 'Hola {nombre}, ...',
      category: 'marketing'
    };
    setSelectedId(null);
    setEditingTemplate(newTemplate);
    setStatus('idle');
  };

  const handleSave = async () => {
    if (!editingTemplate.name || !editingTemplate.body) return;
    setSaving(true);
    setStatus('idle');

    try {
      const { data, error } = await (supabase as any)
        .from('whatsapp_templates')
        .upsert({
          ...editingTemplate,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      
      await fetchTemplates();
      if (data && data[0]) {
        setSelectedId(data[0].id);
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, category: string) => {
    if (category === 'system') {
      alert('Las plantillas de sistema no se pueden eliminar por seguridad.');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_templates' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchTemplates();
      setSelectedId(null);
      setEditingTemplate({});
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="animate-spin text-altavik-600" size={32} />
      </div>
    );
  }

  const previewMessage = parseTemplate(editingTemplate.body || '', { name: 'Ejemplo' });

  return (
    <div className="flex h-full min-h-[600px] animate-in fade-in duration-500">
      {/* Sidebar de Plantillas */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tus Plantillas</h3>
          <button 
            onClick={handleCreateNew}
            className="p-1.5 bg-altavik-600 text-white rounded-lg hover:bg-altavik-700 transition-all active:scale-95"
            title="Nueva Plantilla"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              className={`w-full flex flex-col p-4 rounded-xl border text-left transition-all ${
                selectedId === t.id 
                  ? 'bg-white border-altavik-200 shadow-md shadow-altavik-100/50 scale-[1.02]' 
                  : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  t.category === 'system' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {t.category}
                </span>
                {!(t as any).is_active && (
                  <span className="text-[9px] font-bold text-slate-400">Inactiva</span>
                )}
              </div>
              <span className="text-sm font-bold truncate">{t.name}</span>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{t.body}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Principal */}
      <div className="flex-1 flex flex-col bg-white">
        {editingTemplate.name ? (
          <>
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-8">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Editar Plantilla</h2>
                  <p className="text-sm text-slate-500 font-medium italic">Configura el mensaje automático para WhatsApp.</p>
                </div>
                <div className="flex items-center gap-3">
                  {status === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold animate-in fade-in slide-in-from-right-4">
                      <CheckCircle2 size={14} /> Guardado
                    </div>
                  )}
                  {editingTemplate.id && editingTemplate.category !== 'system' && (
                    <button 
                      onClick={() => handleDelete(editingTemplate.id!, editingTemplate.category!)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-altavik-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-altavik-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-altavik-200"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar Cambios
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nombre Identificador</label>
                    <input 
                      type="text"
                      value={editingTemplate.name || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-altavik-500/10 focus:border-altavik-500 outline-none font-bold text-slate-700 transition-all"
                      placeholder="Ej: Seguimiento tras visita"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cuerpo del Mensaje</label>
                      <div className="group relative">
                        <Info size={14} className="text-slate-300 cursor-help" />
                        <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                          Variables disponibles:<br/>
                          <b className="text-emerald-400">{"{nombre}"}</b> - Nombre del lead<br/>
                          <b className="text-emerald-400">{"{saludo}"}</b> - Buenos días/tardes<br/>
                          <b className="text-emerald-400">{"{interesado}"}</b> - interesado/a<br/>
                          <b className="text-emerald-400">{"{propiedad}"}</b> - Nombre promoción
                        </div>
                      </div>
                    </div>
                    <textarea 
                      value={editingTemplate.body || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                      rows={8}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-altavik-500/10 focus:border-altavik-500 outline-none font-medium text-slate-700 resize-none transition-all"
                      placeholder="Escribe el mensaje aquí..."
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoría</label>
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button 
                          disabled={editingTemplate.category === 'system'}
                          onClick={() => setEditingTemplate({ ...editingTemplate, category: 'marketing' })}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                            editingTemplate.category === 'marketing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          Marketing
                        </button>
                        <button 
                          disabled={editingTemplate.category === 'system'}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                            editingTemplate.category === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          Sistema
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block text-left">Estado</label>
                      <button
                        onClick={() => setEditingTemplate({ ...editingTemplate, is_active: !(editingTemplate as any).is_active })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          (editingTemplate as any).is_active 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        <Power size={14} />
                        {(editingTemplate as any).is_active ? 'Activa' : 'Inactiva'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vista Previa Real</label>
                    <div className="relative pt-12 pb-8 px-6 bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-[8px] border-slate-800 h-full min-h-[400px]">
                      {/* Notch del móvil */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" />
                      
                      {/* Cabecera WhatsApp */}
                      <div className="absolute top-6 left-0 right-0 h-14 bg-slate-800/80 backdrop-blur-md flex items-center px-6 gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                          <MessageCircle size={16} fill="currentColor" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-xs font-bold leading-tight">Cliente Ejemplo</p>
                          <p className="text-emerald-400 text-[9px] font-medium uppercase tracking-widest">en línea</p>
                        </div>
                      </div>

                      {/* Cuerpo de Chat */}
                      <div className="mt-16 space-y-4">
                        <div className="max-w-[85%] bg-emerald-50 rounded-2xl rounded-tl-none p-4 shadow-sm animate-in zoom-in-90 duration-300">
                          <p className="text-slate-800 text-[13px] leading-relaxed whitespace-pre-wrap font-medium">
                            {previewMessage}
                          </p>
                          <p className="text-[9px] text-emerald-600 text-right mt-1 font-bold">12:00 ✓✓</p>
                        </div>
                      </div>

                      {/* Barra de Escribir */}
                      <div className="absolute bottom-6 left-6 right-6 h-10 bg-white/10 rounded-full flex items-center px-4">
                        <div className="w-full h-1 bg-white/20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
              <Layout size={40} className="opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.3em]">Selecciona una plantilla para editar</p>
          </div>
        )}
      </div>
    </div>
  );
};
