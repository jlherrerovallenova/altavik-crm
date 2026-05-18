// src/hooks/useWhatsAppReplies.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { WhatsAppReply } from '../components/DailyBriefingModal';

export type { WhatsAppReply };

const SEEN_KEY = 'altavik_wa_seen_ids';

function getSeenIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

function addSeenIds(ids: string[]) {
  const current = getSeenIds();
  const merged = Array.from(new Set([...current, ...ids]));
  localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
}

export function useWhatsAppReplies() {
  const { session } = useAuth();
  const [replies, setReplies] = useState<WhatsAppReply[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchReplies = useCallback(async () => {
    if (!session) return;

    try {
      // Buscar en lead_history las entradas del webhook de WhatsApp (últimos 7 días)
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const { data: historyRows, error } = await (supabase as any)
        .from('lead_history')
        .select('id, lead_id, description, created_at, metadata')
        .eq('event_type', 'contact')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !historyRows?.length) {
        setReplies([]);
        setUnseenCount(0);
        return;
      }

      // Filtrar solo los que vienen del webhook de WhatsApp
      const waRows = historyRows.filter(
        (r: any) => r.metadata?.source === 'whatsapp_webhook'
      );

      if (!waRows.length) {
        setReplies([]);
        setUnseenCount(0);
        return;
      }

      // Obtener nombres de los leads
      const leadIds = [...new Set(waRows.map((r: any) => r.lead_id))] as string[];
      const { data: leads } = await (supabase as any)
        .from('leads')
        .select('id, name')
        .in('id', leadIds);

      const leadMap: Record<string, string> = {};
      leads?.forEach((l: any) => { leadMap[l.id] = l.name; });

      const formatted: WhatsAppReply[] = waRows.map((r: any) => ({
        id: r.id,
        lead_id: r.lead_id,
        lead_name: leadMap[r.lead_id] || 'Cliente desconocido',
        description: r.description,
        created_at: r.created_at,
        raw_message: r.metadata?.raw_message || '',
        summary: r.metadata?.extracted?.summary || r.description,
      }));

      const seenIds = getSeenIds();
      const unseen = formatted.filter(r => !seenIds.includes(r.id));

      setReplies(formatted);
      setUnseenCount(unseen.length);
    } catch (err) {
      console.error('useWhatsAppReplies error:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchReplies();
    const interval = setInterval(fetchReplies, 60 * 1000); // refresca cada minuto
    return () => clearInterval(interval);
  }, [fetchReplies]);

  const markAllSeen = useCallback(() => {
    addSeenIds(replies.map(r => r.id));
    setUnseenCount(0);
  }, [replies]);

  return { replies, unseenCount, loading, markAllSeen, refresh: fetchReplies };
}
