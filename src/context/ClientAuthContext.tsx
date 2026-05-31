import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];

interface ClientData extends Lead {
  sale?: Sale | null;
}

interface ClientAuthContextType {
  client: ClientData | null;
  loading: boolean;
  login: (email: string, dni: string) => Promise<void>;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextType>({
  client: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useClientAuth = () => useContext(ClientAuthContext);

export const ClientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage on mount
    const storedClient = localStorage.getItem('altavik_client_session');
    if (storedClient) {
      try {
        setClient(JSON.parse(storedClient));
      } catch (e) {
        localStorage.removeItem('altavik_client_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, dni: string) => {
    setLoading(true);
    try {
      // Find the lead matching email and dni
      // We assume DNI and Email match exactly (case insensitive ideally, but exact for now)
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('email', email.trim())
        .ilike('dni', dni.trim());

      if (error) throw error;
      if (!leads || leads.length === 0) {
        throw new Error('No hemos encontrado ningún cliente con ese correo y DNI. Por favor, revisa los datos.');
      }

      // Check if they have a sale
      const matchedLead = leads[0];
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('lead_id', matchedLead.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (salesError) throw salesError;

      const clientData: ClientData = {
        ...matchedLead,
        sale: sales && sales.length > 0 ? sales[0] : null,
      };

      setClient(clientData);
      localStorage.setItem('altavik_client_session', JSON.stringify(clientData));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setClient(null);
    localStorage.removeItem('altavik_client_session');
  };

  return (
    <ClientAuthContext.Provider value={{ client, loading, login, logout }}>
      {children}
    </ClientAuthContext.Provider>
  );
};
