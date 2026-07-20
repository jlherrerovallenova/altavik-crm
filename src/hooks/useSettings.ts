import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface PromotionSettings {
  promotion_name: string;
  promotion_location: string;
  promotion_promoter: string;
  promotion_builder: string;
  promotion_status: string;
  promotion_reservation_amount: number;
  promotion_contract_percentage: number;
  promotion_installment_percentage: number;
  promotion_installment_count: number;
  promotion_courtesy_percentage: number;
  promotion_commission_percentage: number;
  promotion_captador_commission_percentage: number;
  promotion_vendedor_commission_percentage: number;
  promotion_billing_pct_reservation: number;
  promotion_billing_pct_contract: number;
  promotion_billing_pct_deed: number;
  promotion_max_promoter_sales: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const keys = [
        'promotion_name',
        'promotion_location',
        'promotion_promoter',
        'promotion_builder',
        'promotion_status',
        'promotion_reservation_amount',
        'promotion_contract_percentage',
        'promotion_installment_percentage',
        'promotion_installment_count',
        'promotion_courtesy_percentage',
        'promotion_commission_percentage',
        'promotion_captador_commission_percentage',
        'promotion_vendedor_commission_percentage',
        'promotion_billing_pct_reservation',
        'promotion_billing_pct_contract',
        'promotion_billing_pct_deed',
        'promotion_max_promoter_sales'
      ];

      const { data, error } = await (supabase as any)
        .from('settings')
        .select('*')
        .in('key', keys);

      if (error) throw new Error(error.message);

      const settings: PromotionSettings = {
        promotion_name: 'RESIDENCIAL ALTAVIK',
        promotion_location: 'Vallenova',
        promotion_promoter: 'RESIDENCIAL ALTAVIK, S.L.',
        promotion_builder: '',
        promotion_status: 'active',
        promotion_reservation_amount: 3000,
        promotion_contract_percentage: 10,
        promotion_installment_percentage: 10,
        promotion_installment_count: 18,
        promotion_courtesy_percentage: 0,
        promotion_commission_percentage: 3.00,
        promotion_captador_commission_percentage: 1.00,
        promotion_vendedor_commission_percentage: 2.00,
        promotion_billing_pct_reservation: 25.00,
        promotion_billing_pct_contract: 25.00,
        promotion_billing_pct_deed: 50.00,
        promotion_max_promoter_sales: 10
      };

      if (data) {
        data.forEach((s: any) => {
          switch (s.key) {
            case 'promotion_name': settings.promotion_name = s.value || 'RESIDENCIAL ALTAVIK'; break;
            case 'promotion_location': settings.promotion_location = s.value || 'Vallenova'; break;
            case 'promotion_promoter': settings.promotion_promoter = s.value || 'RESIDENCIAL ALTAVIK, S.L.'; break;
            case 'promotion_builder': settings.promotion_builder = s.value || ''; break;
            case 'promotion_status': settings.promotion_status = s.value || 'active'; break;
            case 'promotion_reservation_amount': settings.promotion_reservation_amount = Number(s.value) || 3000; break;
            case 'promotion_contract_percentage': settings.promotion_contract_percentage = Number(s.value) || 10; break;
            case 'promotion_installment_percentage': settings.promotion_installment_percentage = Number(s.value) || 10; break;
            case 'promotion_installment_count': settings.promotion_installment_count = Number(s.value) || 18; break;
            case 'promotion_courtesy_percentage': settings.promotion_courtesy_percentage = Number(s.value) || 0; break;
            case 'promotion_commission_percentage': settings.promotion_commission_percentage = Number(s.value) || 3.00; break;
            case 'promotion_captador_commission_percentage': settings.promotion_captador_commission_percentage = Number(s.value) || 1.00; break;
            case 'promotion_vendedor_commission_percentage': settings.promotion_vendedor_commission_percentage = Number(s.value) || 2.00; break;
            case 'promotion_billing_pct_reservation': settings.promotion_billing_pct_reservation = Number(s.value) || 25.00; break;
            case 'promotion_billing_pct_contract': settings.promotion_billing_pct_contract = Number(s.value) || 25.00; break;
            case 'promotion_billing_pct_deed': settings.promotion_billing_pct_deed = Number(s.value) || 50.00; break;
            case 'promotion_max_promoter_sales': settings.promotion_max_promoter_sales = Number(s.value) || 10; break;
          }
        });
      }

      return settings;
    },
  });
}
