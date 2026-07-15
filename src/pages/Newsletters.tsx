// src/pages/Newsletters.tsx
import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Mail, Clock, Send, Edit, Copy, Trash2 } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

type Newsletter = {
    id: string;
    subject: string;
    status: 'draft' | 'sent';
    created_at: string;
    sent_at: string | null;
};

export default function Newsletters() {
    const navigate = useNavigate();
    const { showConfirm } = useDialog();
    const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNewsletters();
    }, []);

    const fetchNewsletters = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('newsletters')
                .select('id, subject, status, created_at, sent_at')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    console.log("Newsletter table not found, waiting for migrations to be applied manually");
                    setNewsletters([]);
                    return;
                }
                throw error;
            }
            if (data) setNewsletters(data as Newsletter[]);
        } catch (error) {
            console.error('Error fetching newsletters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('newsletters')
                .insert([{ subject: 'Nueva Campaña Sin Título' }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                navigate(`/newsletters/${data.id}`);
            }
        } catch (error) {
            console.error("Error creating draft", error);
            alert("Asegúrate de haber ejecutado el SQL en Supabase para crear la tabla newsletters.");
        }
    };

    const handleDuplicate = async (newsletter: Newsletter) => {
        try {
            // Obtener el diseño completo del original
            const { data: original, error: fetchError } = await supabase
                .from('newsletters')
                .select('design, html_content')
                .eq('id', newsletter.id)
                .single();

            if (fetchError) throw fetchError;

            const { data, error } = await (supabase as any)
                .from('newsletters')
                .insert([{ 
                    subject: `${newsletter.subject} (Copia)`,
                    design: (original as any).design,
                    html_content: (original as any).html_content,
                    status: 'draft'
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) navigate(`/newsletters/${data.id}`);
        } catch (error) {
            console.error("Error duplicating newsletter", error);
            alert("No se pudo duplicar la campaña.");
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm({
            title: 'Eliminar Campaña',
            message: '¿Estás seguro de que deseas eliminar esta campaña? Esta acción no se puede deshacer.',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('newsletters')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setNewsletters(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Error deleting newsletter", error);
            alert("No se pudo eliminar la campaña.");
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 gap-4">
                <Loader2 className="animate-spin" size={40} />
                <p className="font-medium animate-pulse">Cargando campañas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            <PageHeader 
                title="Campañas de Email"
                icon={<Mail className="text-white" strokeWidth={3} size={24} />}
                subtitle={
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
                        <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100">
                            {newsletters.length}
                        </span> 
                        campañas creadas
                    </p>
                }
                actions={
                    <Button type="button"
                        onClick={handleCreate}
                        size="lg"
                    >
                        <Plus size={18} strokeWidth={3} /> Nueva Campaña
                    </Button>
                }
            />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {newsletters.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <Mail size={48} className="text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Crea tu primera campaña</h3>
                        <p className="max-w-md mx-auto mb-6 text-sm">Usa nuestro editor visual para diseñar correos de aspecto profesional en minutos.</p>
                        <button type="button" onClick={handleCreate} className="text-altavik-600 font-bold hover:underline">
                            Comenzar ahora
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asunto</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Creación</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {newsletters.map((nl) => (
                                <tr key={nl.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 align-middle">
                                        <p className="font-bold text-slate-900 flex items-center gap-2">
                                            <Mail size={16} className="text-slate-400" />
                                            {nl.subject}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        {nl.status === 'draft' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60">
                                                <Edit size={12} /> Borrador
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-altavik-700 bg-altavik-50 border border-emerald-200/60">
                                                <Send size={12} /> Enviado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 align-middle">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {new Date(nl.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <button type="button"
                                                onClick={() => navigate(`/newsletters/${nl.id}`)}
                                                className="text-altavik-600 hover:text-altavik-800 transition-colors tooltip flex items-center font-bold text-sm"
                                            >
                                                {nl.status === 'draft' ? 'Editar' : 'Ver/Editar'}
                                            </button>
                                            <button type="button"
                                                onClick={() => handleDuplicate(nl)}
                                                className="text-slate-400 hover:text-altavik-600 transition-colors p-1 rounded hover:bg-altavik-50"
                                                title="Duplicar campaña"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button type="button"
                                                onClick={() => handleDelete(nl.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                                title="Eliminar campaña"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
