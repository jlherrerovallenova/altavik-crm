import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSystemTemplates, type WhatsAppTemplate } from '../services/whatsappService';

export const useWhatsAppTemplates = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const systemTemplates = getSystemTemplates();
      
      const { data, error } = await supabase
        .from('whatsapp_templates' as any)
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        setTemplates([...systemTemplates, ...data]);
      } else {
        setTemplates(systemTemplates);
      }
      setLoading(false);
    };

    fetchTemplates();
  }, []);

  return { templates, loading };
};
