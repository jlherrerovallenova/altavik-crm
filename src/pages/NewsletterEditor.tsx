// src/pages/NewsletterEditor.tsx
import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EmailEditor from 'react-email-editor';
import type { EditorRef } from 'react-email-editor';
import { Loader2, ArrowLeft, Save, Send, Eye } from 'lucide-react';
import { AppNotification } from '../components/AppNotification';
import { SendNewsletterModal } from '../components/newsletters/SendNewsletterModal';

export default function NewsletterEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const emailEditorRef = useRef<EditorRef>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [status, setStatus] = useState<'draft' | 'sent'>('draft');
    const [notification, setNotification] = useState<{ title: string, message: string, type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        if (id) {
            loadNewsletter(id);
        }
    }, [id]);

    const loadNewsletter = async (newsletterId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('newsletters')
                .select('*')
                .eq('id', newsletterId)
                .single();

            if (error) throw error;
            if (data) {
                setSubject((data as any).subject || '');
                setStatus((data as any).status);

                // Wait for editor to be ready before loading design
                const checkEditorInterval = setInterval(() => {
                    if (emailEditorRef.current?.editor) {
                        clearInterval(checkEditorInterval);
                        if ((data as any).design) {
                            emailEditorRef.current.editor.loadDesign((data as any).design);
                        }
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error loading newsletter:', error);
            showMsg('error', 'Error', 'No pudimos cargar la plantilla. Revisa tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    const saveDesign = async (isSending: boolean = false) => {
        if (!id || !emailEditorRef.current?.editor) return null;
        setSaving(true);

        return new Promise((resolve) => {
            emailEditorRef.current?.editor?.exportHtml(async (exportData: any) => {
                const { design, html } = exportData;
                try {
                    const { error } = await (supabase as any)
                        .from('newsletters')
                        .update({
                            subject,
                            design,
                            html_content: html,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);

                    if (error) throw error;
                    if (!isSending) showMsg('success', 'Guardado', 'Borrador guardado correctamente.');
                    resolve(true);
                } catch (err) {
                    console.error("Error saving:", err);
                    if (!isSending) showMsg('error', 'Error', 'No se pudo guardar el borrador.');
                    resolve(false);
                } finally {
                    setSaving(false);
                }
            });
        });
    };

    const handleSendClick = () => {
        if (status === 'sent') return;
        setIsSendModalOpen(true);
    };

    const handleConfirmSend = async (config: { audience: 'all' | 'phase' | 'manual'; phase?: string; leadIds?: string[] }) => {
        if (status === 'sent') return;

        setSending(true);

        // First save the current design to db
        const saved = await saveDesign(true);
        if (!saved) {
            setSending(false);
            return;
        }

        try {
            // Call Supabase Edge Function to dispatch emails via Resend
            const { data, error } = await (supabase as any).functions.invoke('send-newsletter', {
                body: {
                    newsletterId: id,
                    audience: config.audience,
                    phase: config.phase,
                    leadIds: config.leadIds
                }
            });

            if (error || data?.error) {
                const errorMsg = data?.error || error?.message || 'Error desconocido en el servidor';
                throw new Error(errorMsg);
            }

            setIsSendModalOpen(false);
            showMsg('success', 'Campaña en curso!', 'Los correos se están enviando a tus clientes.');
            setStatus('sent');

            setTimeout(() => navigate('/newsletters'), 4000);
        } catch (err: any) {
            console.error("Error sending newsletter", err);
            const detail = err.message || 'No se pudo contactar con el servicio.';
            showMsg('error', 'Error de envío', detail);
        } finally {
            setSending(false);
        }
    };

    const showMsg = (type: 'success' | 'error' | 'info', title: string, message: string) => {
        setNotification({ title, message, type });
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin text-altavik-600" size={40} /></div>;
    }

    const isSent = status === 'sent';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {/* Header Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => navigate('/newsletters')}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        title="Volver a Campañas"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col w-full max-w-lg">
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Asunto de tu Newsletter..."
                            className="text-lg font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-300 disabled:opacity-50"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isSent ? 'CAMPAÑA ENVIADA (Modo Editar)' : 'MODO EDICIÓN'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => emailEditorRef.current?.editor?.showPreview('desktop')}
                        className="hidden md:flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold text-sm rounded-lg transition-colors border border-slate-200 shadow-sm bg-white"
                    >
                        <Eye size={16} /> Previsualizar
                    </button>

                    <button
                        onClick={() => saveDesign(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-altavik-700 bg-altavik-50 hover:bg-altavik-100 font-bold text-sm rounded-lg transition-colors border border-emerald-200 shadow-sm"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar
                    </button>
                    <button
                        onClick={handleSendClick}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-slate-900 hover:bg-slate-800 font-bold text-sm rounded-lg shadow-md transition-all"
                    >
                        <Send size={16} />
                        {isSent ? 'Volver a Enviar' : 'Enviar Ahora'}
                    </button>
                </div>
            </div>

            {/* Unlayer Editor */}
            <div className="w-full bg-slate-100 relative flex-1">
                <EmailEditor
                    ref={emailEditorRef}
                    // EL PROJECT ID DEL USUARIO AQUI
                    projectId={285017}
                    onReady={() => {
                        // The editor is initialized
                    }}
                    options={{
                        locale: 'es-ES',
                        appearance: {
                            theme: 'modern_light',
                            panels: {
                                tools: { dock: 'left' }
                            }
                        }
                    }}
                    minHeight="85vh"
                />
            </div>

            {notification && (
                <AppNotification
                    title={notification.title}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <SendNewsletterModal
                isOpen={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
                onSend={handleConfirmSend}
                isSending={sending}
            />
        </div>
    );
}
