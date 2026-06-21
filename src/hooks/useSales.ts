import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type SaleRow = Database['public']['Tables']['sales']['Row'];
type LeadRow = Database['public']['Tables']['leads']['Row'];
type InventoryRow = Database['public']['Tables']['inventory']['Row'];

export interface SaleWithDetails extends SaleRow {
  lead: Pick<LeadRow, 'id' | 'name' | 'email' | 'phone'>;
  property: Pick<InventoryRow, 'id' | 'n_orden' | 'planta' | 'portal' | 'letra' | 'precio'>;
  promoter_invoices?: Array<{
    id: string;
    milestone: 'contrato' | 'escrituracion';
    amount: number;
    status: 'pending' | 'sent' | 'paid' | 'cancelled';
    invoice_number: string | null;
  }>;
}

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async (): Promise<SaleWithDetails[]> => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          lead:leads (id, name, email, phone),
          property:inventory (id, n_orden, planta, portal, letra, precio),
          promoter_invoices (id, milestone, amount, status, invoice_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching sales:", error);
        throw error;
      }
      
      // Filtramos las ventas que no tienen lead o propiedad asociada por si acaso
      return ((data || []) as SaleWithDetails[]).filter(sale => sale.lead && sale.property);
    }
  });
}
