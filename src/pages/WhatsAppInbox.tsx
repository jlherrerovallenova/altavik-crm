// src/pages/WhatsAppInbox.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Search, Send, CheckCheck, Check, Clock,
  ArrowLeft, ExternalLink, Circle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Conversation {
  id: string;
  lead_id: string | null;
  phone: string;
  lead_name: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  template_name: string | null;
  status: string;
  sent_at: string;
}



export default function WhatsAppInbox() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addDebug = (msg: string) => {
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cargar conversaciones
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    setFetchError(null);
    try {
      addDebug('Consultando wa_conversations...');
      const { data, error: err } = await (supabase as any)
        .from('wa_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (err) {
        console.error('Error fetching conversations:', err);
        setFetchError(err.message);
        addDebug(`Error: ${err.message}`);
        setConversations([]);
      } else {
        setConversations(data || []);
        addDebug(`Cargadas ${data?.length || 0} conversaciones`);
      }
    } catch (e: any) {
      console.error('Except in fetchConversations:', e);
      setFetchError(e.message || String(e));
      addDebug(`Excepción: ${e.message || String(e)}`);
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  // react-doctor-disable-next-line effect-needs-cleanup
  useEffect(() => {
    if (!session) {
      addDebug('No hay sesión activa. Esperando login...');
      return;
    }
    addDebug(`Usuario detectado: ${session.user?.email}`);
    fetchConversations();

    // Realtime: nuevos mensajes/conversaciones
    const channel = (supabase as any)
      .channel('wa_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' }, fetchConversations)
      .subscribe((status: string) => {
        addDebug(`Realtime wa_inbox estado: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchConversations]);

  // Cargar mensajes de una conversación
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    setFetchError(null);
    try {
      addDebug(`Cargando mensajes para conv ${convId}...`);
      const { data, error: err } = await (supabase as any)
        .from('wa_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('sent_at', { ascending: true });
      if (err) {
        console.error('Error fetching messages:', err);
        setFetchError(`Error mensajes: ${err.message}`);
        addDebug(`Error msg: ${err.message}`);
        setMessages([]);
      } else {
        setMessages(data || []);
        addDebug(`Cargados ${data?.length || 0} mensajes`);
      }
    } catch (e: any) {
      console.error('Except in fetchMessages:', e);
      setFetchError(`Excepción mensajes: ${e.message || String(e)}`);
      addDebug(`Excepción msg: ${e.message || String(e)}`);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const selectConversation = async (conv: Conversation) => {
    // react-doctor-disable-next-line no-impure-state-updater
    setSelectedConv(conv);
    fetchMessages(conv.id);

    // Marcar como leído
    if (conv.unread_count > 0) {
      await (supabase as any)
        .from('wa_conversations')
        .update({ unread_count: 0 })
        .eq('id', conv.id);
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
      );
    }

  };

  // react-doctor-disable-next-line effect-needs-cleanup
  useEffect(() => {
    if (!selectedConv) return;
    
    // Realtime para mensajes de esta conversación
    const channel = (supabase as any)
      .channel(`wa_msgs_${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wa_messages',
        filter: `conversation_id=eq.${selectedConv.id}`
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe((status: string) => {
        addDebug(`Realtime wa_msgs_${selectedConv.id.substring(0,6)} estado: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv]);

  // Enviar mensaje de respuesta
  const handleSend = async () => {
    if (!replyText.trim() || !selectedConv || sending) return;
    const text = replyText.trim();
    setReplyText('');
    setSending(true);

    try {
      // Optimistic UI
      const tempMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: selectedConv.id,
        direction: 'outbound',
        content: text,
        type: 'text',
        template_name: null,
        status: 'sending',
        sent_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);

      // Enviar vía Edge Function
      const { error: invokeError } = await supabase.functions.invoke('send-whatsapp-reply', {
        body: {
          conversation_id: selectedConv.id,
          to: selectedConv.phone,
          text
        }
      });

      if (!invokeError) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m));
        await (supabase as any)
          .from('wa_conversations')
          .update({ last_message_preview: `Tú: ${text.substring(0, 60)}`, last_message_at: new Date().toISOString() })
          .eq('id', selectedConv.id);

        if (selectedConv.lead_id) {
          try {
            await (supabase as any).from('lead_history').insert([{
              lead_id: selectedConv.lead_id,
              user_id: session?.user?.id,
              event_type: 'whatsapp',
              description: `Mensaje enviado vía WhatsApp Business: "${text.substring(0, 120)}${text.length > 120 ? '...' : ''}"`,
              metadata: { 
                method: 'whatsapp', 
                conversation_id: selectedConv.id, 
                message_preview: text.substring(0, 120),
                type: 'outbound_reply'
              }
            }]);
          } catch (historyError) {
            console.error('Error logging whatsapp reply to lead_history:', historyError);
          }
        }

        fetchConversations();
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter(c => {
    const name = c.lead_name || '';
    const phone = c.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           phone.includes(searchTerm);
  });

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return date.toLocaleDateString('es-ES', { weekday: 'short' });
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'sending') return <Clock size={12} className="text-slate-400" />;
    if (status === 'sent')    return <Check size={12} className="text-slate-400" />;
    if (status === 'delivered') return <CheckCheck size={12} className="text-slate-400" />;
    if (status === 'read')    return <CheckCheck size={12} className="text-blue-400" />;
    return null;
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div className="flex h-[calc(100vh-80px)] -m-10 -mb-20 overflow-hidden rounded-xl shadow-xl border border-slate-200">

      {/* ── PANEL IZQUIERDO: Lista de conversaciones ── */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <MessageSquare size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900">WhatsApp</h1>
                <p className="text-[10px] text-slate-500">{conversations.length} conversaciones</p>
              </div>
            </div>
            {totalUnread > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {totalUnread} nuevos
              </span>
            )}
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-slate-400 gap-4">
              <div className="flex flex-col items-center justify-center text-center gap-2">
                <MessageSquare size={32} className="opacity-30 text-emerald-500" />
                <p className="text-sm font-bold text-slate-700">Sin conversaciones aún</p>
                <p className="text-xs px-4">Cuando un cliente responda o se registre una plantilla aparecerá aquí</p>
              </div>

              {/* Panel de diagnóstico integrado en la barra lateral */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono space-y-2 mt-4 text-left shadow-inner">
                <p className="font-bold font-sans text-slate-700 border-b pb-1">🔍 Estado de Conexión</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Usuario Auth:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{session?.user?.email || '❌ NO LOGUEADO'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Error query:</span>
                    <span className={`font-bold truncate max-w-[150px] ${fetchError ? 'text-red-600' : 'text-emerald-600'}`}>{fetchError || 'Ninguno'}</span>
                  </div>
                </div>
                
                {debugLog.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 font-sans mb-1">Eventos Recientes:</p>
                    <div className="bg-white p-1.5 border border-slate-100 rounded max-h-24 overflow-y-auto text-[9px] text-slate-600 space-y-0.5">
                      {debugLog.map((log, idx) => (
                        // react-doctor-disable-next-line no-array-index-as-key
                        <div key={idx} className="truncate">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-2 flex justify-between items-center">
                  <button type="button" 
                    onClick={() => { addDebug('Reintentando...'); fetchConversations(); }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-sans font-bold transition-all shadow-sm"
                  >
                    🔄 Reintentar
                  </button>
                  <span className="text-[9px] text-slate-400 font-sans">v1.1 (Debug)</span>
                </div>
              </div>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <button type="button"
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left
                  ${selectedConv?.id === conv.id ? 'bg-emerald-50 border-r-2 border-emerald-500' : ''}
                `}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 text-white text-sm font-bold">
                  {(conv.lead_name || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold text-slate-900 truncate">{conv.lead_name || conv.phone}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate">{conv.last_message_preview || '...'}</p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── PANEL DERECHO: Chat ── */}
      <div className={`flex-1 flex flex-col bg-slate-50 ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>

        {selectedConv ? (
          <>
            {/* Header del chat */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
              <button type="button"
                onClick={() => setSelectedConv(null)}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(selectedConv.lead_name || '?')[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{selectedConv.lead_name}</p>
                <p className="text-[11px] text-slate-500">+{selectedConv.phone}</p>
              </div>

              <div className="flex items-center gap-2">
                {selectedConv.lead_id && (
                  <button type="button"
                    onClick={() => navigate(`/leads?highlight=${selectedConv.lead_id}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                    title="Ver ficha del lead"
                  >
                    <ExternalLink size={12} />
                    Ver lead
                  </button>
                )}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
                  ${selectedConv.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Circle size={6} className="fill-current" />
                  {selectedConv.status === 'open' ? 'Activa' : 'Resuelta'}
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
              style={{ backgroundImage: 'radial-gradient(circle, #e2e8f020 1px, transparent 1px)', backgroundSize: '20px 20px' }}>

              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <MessageSquare size={32} className="opacity-30" />
                  <p className="text-sm">Sin mensajes aún</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl shadow-sm
                      ${msg.direction === 'outbound'
                        ? 'bg-emerald-500 text-white rounded-tr-sm'
                        : 'bg-white text-slate-900 rounded-tl-sm border border-slate-100'
                      }`}
                    >
                      {msg.template_name && (
                        <p className={`text-[10px] font-bold mb-1 uppercase tracking-wider
                          ${msg.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          📋 Plantilla: {msg.template_name}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1
                        ${msg.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        <span className="text-[10px]">{formatTime(msg.sent_at)}</span>
                        {msg.direction === 'outbound' && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Caja de respuesta */}
            <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400 transition-all">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Escribe un mensaje... (Enter para enviar)"
                    rows={1}
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none max-h-32 overflow-y-auto"
                    style={{ minHeight: '24px' }}
                  />
                </div>
                <button type="button"
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-md"
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={16} />
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                Los mensajes libres solo se pueden enviar dentro de las 24h de la última respuesta del cliente
              </p>
            </div>
          </>
        ) : (
          /* Placeholder cuando no hay conversación seleccionada */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <MessageSquare size={28} className="text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-600">Selecciona una conversación</p>
              <p className="text-sm mt-1">Las respuestas de los clientes aparecen aquí automáticamente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
