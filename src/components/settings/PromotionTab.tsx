import React, { useState, useEffect } from 'react';
import { Save, Loader as Loader2, Building, DollarSign, Percent, BadgeCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import { useQueryClient } from '@tanstack/react-query';

export function PromotionTab() {
  const { showAlert } = useDialog();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states - General
  const [promotionName, setPromotionName] = useState('RESIDENCIAL ALTAVIK');
  const [location, setLocation] = useState('Vallenova');
  const [promoter, setPromoter] = useState('RESIDENCIAL ALTAVIK, S.L.');
  const [builder, setBuilder] = useState('');
  const [status, setStatus] = useState('active');

  // Form states - Payment terms
  const [reservationAmount, setReservationAmount] = useState(3000);
  const [contractPercentage, setContractPercentage] = useState(10);
  const [installmentPercentage, setInstallmentPercentage] = useState(10);
  const [installmentCount, setInstallmentCount] = useState(18);
  const [courtesyPercentage, setCourtesyPercentage] = useState(0);

  // Form states - Commissions and Billing
  const [commissionPercentage, setCommissionPercentage] = useState(3.00);
  const [captadorCommissionPercentage, setCaptadorCommissionPercentage] = useState(1.00);
  const [vendedorCommissionPercentage, setVendedorCommissionPercentage] = useState(2.00);
  const [billingPctReservation, setBillingPctReservation] = useState(25.00);
  const [billingPctContract, setBillingPctContract] = useState(25.00);
  const [billingPctDeed, setBillingPctDeed] = useState(50.00);
  const [maxPromoterSales, setMaxPromoterSales] = useState(10);

  // Stats states
  const [totalSalesVolume, setTotalSalesVolume] = useState(0);
  const [totalInventoryVolume, setTotalInventoryVolume] = useState(0);

  useEffect(() => {
    fetchPromotionSettings();
  }, []);

  const fetchPromotionSettings = async () => {
    setLoading(true);
    try {
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

      if (error) throw error;

      if (data) {
        data.forEach((s: any) => {
          switch (s.key) {
            case 'promotion_name': setPromotionName(s.value || 'RESIDENCIAL ALTAVIK'); break;
            case 'promotion_location': setLocation(s.value || 'Vallenova'); break;
            case 'promotion_promoter': setPromoter(s.value || 'RESIDENCIAL ALTAVIK, S.L.'); break;
            case 'promotion_builder': setBuilder(s.value || ''); break;
            case 'promotion_status': setStatus(s.value || 'active'); break;
            case 'promotion_reservation_amount': setReservationAmount(Number(s.value) || 3000); break;
            case 'promotion_contract_percentage': setContractPercentage(Number(s.value) || 10); break;
            case 'promotion_installment_percentage': setInstallmentPercentage(Number(s.value) || 10); break;
            case 'promotion_installment_count': setInstallmentCount(Number(s.value) || 18); break;
            case 'promotion_courtesy_percentage': setCourtesyPercentage(Number(s.value) || 0); break;
            case 'promotion_commission_percentage': setCommissionPercentage(Number(s.value) || 3.00); break;
            case 'promotion_captador_commission_percentage': setCaptadorCommissionPercentage(Number(s.value) || 1.00); break;
            case 'promotion_vendedor_commission_percentage': setVendedorCommissionPercentage(Number(s.value) || 2.00); break;
            case 'promotion_billing_pct_reservation': setBillingPctReservation(Number(s.value) || 25.00); break;
            case 'promotion_billing_pct_contract': setBillingPctContract(Number(s.value) || 25.00); break;
            case 'promotion_billing_pct_deed': setBillingPctDeed(Number(s.value) || 50.00); break;
            case 'promotion_max_promoter_sales': setMaxPromoterSales(Number(s.value) || 10); break;
          }
        });
      }

      // Fetch stats from inventory
      const { data: propertiesData } = await supabase
        .from('inventory')
        .select('precio, estado_vivienda');

      if (propertiesData) {
        const soldReserved = propertiesData.filter((p: any) => p.estado_vivienda === 'RESERVADO' || p.estado_vivienda === 'VENDIDO');
        const sumSold = soldReserved.reduce((acc: number, curr: any) => acc + (Number(curr.precio) || 0), 0);
        setTotalSalesVolume(sumSold);

        const sumAll = propertiesData.reduce((acc: number, curr: any) => acc + (Number(curr.precio) || 0), 0);
        setTotalInventoryVolume(sumAll);
      }

    } catch (err) {
      console.error('Error fetching promotion settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Validate payment terms
    const sumPct = Number(contractPercentage) + Number(installmentPercentage) + Number(courtesyPercentage);
    if (sumPct > 100) {
      await showAlert({
        title: 'Error de Validación',
        message: 'La suma de los porcentajes de Firma, Cuotas y Cortesía no puede superar el 100%.'
      });
      setSaving(false);
      return;
    }

    // Validate billing milestones
    const sumBilling = Number(billingPctReservation) + Number(billingPctContract) + Number(billingPctDeed);
    if (sumBilling !== 100) {
      await showAlert({
        title: 'Error de Validación',
        message: 'La suma de los hitos de facturación (Reserva, Contrato y Escritura) debe sumar exactamente el 100%.'
      });
      setSaving(false);
      return;
    }

    try {
      const settingsPayload = [
        { key: 'promotion_name', value: promotionName },
        { key: 'promotion_location', value: location },
        { key: 'promotion_promoter', value: promoter },
        { key: 'promotion_builder', value: builder },
        { key: 'promotion_status', value: status },
        { key: 'promotion_reservation_amount', value: String(reservationAmount) },
        { key: 'promotion_contract_percentage', value: String(contractPercentage) },
        { key: 'promotion_installment_percentage', value: String(installmentPercentage) },
        { key: 'promotion_installment_count', value: String(installmentCount) },
        { key: 'promotion_courtesy_percentage', value: String(courtesyPercentage) },
        { key: 'promotion_commission_percentage', value: String(commissionPercentage) },
        { key: 'promotion_captador_commission_percentage', value: String(captadorCommissionPercentage) },
        { key: 'promotion_vendedor_commission_percentage', value: String(vendedorCommissionPercentage) },
        { key: 'promotion_billing_pct_reservation', value: String(billingPctReservation) },
        { key: 'promotion_billing_pct_contract', value: String(billingPctContract) },
        { key: 'promotion_billing_pct_deed', value: String(billingPctDeed) },
        { key: 'promotion_max_promoter_sales', value: String(maxPromoterSales) }
      ];

      const { error } = await (supabase as any)
        .from('settings')
        .upsert(settingsPayload, { onConflict: 'key' });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['settings'] });

      await showAlert({
        title: 'Éxito',
        message: 'Los datos de la promoción se han guardado correctamente.'
      });
    } catch (err) {
      console.error('Error saving promotion settings:', err);
      await showAlert({
        title: 'Error',
        message: 'No se pudo guardar la configuración de la promoción.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculations for display
  const deedPercentage = Math.max(0, 100 - (Number(contractPercentage) + Number(installmentPercentage) + Number(courtesyPercentage)));

  const formatEur = (num: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-altavik-600 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Cargando datos de la promoción...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      <div className="border-b pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="text-altavik-600" size={24} />
            Datos de la Promoción Inmobiliaria
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configura la información básica, condiciones de pago, comisiones e hitos de facturación.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Sección 1: Información General */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Building size={16} /> Información General
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Nombre de la Promoción *</label>
              <input
                type="text"
                required
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                placeholder="Ej. RESIDENCIAL ALTAVIK"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Ubicación</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                placeholder="Ej. Vallenova"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Promotor *</label>
              <input
                type="text"
                required
                value={promoter}
                onChange={(e) => setPromoter(e.target.value)}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                placeholder="Ej. RESIDENCIAL ALTAVIK, S.L."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Constructora</label>
              <input
                type="text"
                value={builder}
                onChange={(e) => setBuilder(e.target.value)}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                placeholder="Nombre de la constructora"
              />
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-600">Estado de la Promoción</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              >
                <option value="active">Activa (En comercialización)</option>
                <option value="inactive">Inactiva (Pausada)</option>
                <option value="completed">Completada (Entregada)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sección 2: Condiciones y Forma de Pago */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <DollarSign size={16} /> Condiciones de Compra y Forma de Pago
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Importe Reserva (€) *</label>
              <input
                type="number"
                required
                min="0"
                value={reservationAmount}
                onChange={(e) => setReservationAmount(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">% Firma Contrato *</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={contractPercentage}
                onChange={(e) => setContractPercentage(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">% En Cuotas *</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={installmentPercentage}
                onChange={(e) => setInstallmentPercentage(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Nº Cuotas Mensuales *</label>
              <input
                type="number"
                required
                min="1"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">% Visita Cortesía *</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={courtesyPercentage}
                onChange={(e) => setCourtesyPercentage(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">
                % Escrituración (Autocalculado)
              </label>
              <div className="w-full p-2.5 text-sm bg-slate-200 text-slate-600 font-bold border border-slate-300 rounded-xl cursor-not-allowed">
                {deedPercentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3: Datos Financieros / Comisiones */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Percent size={16} /> Datos Financieros y Comisiones
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                % Comisión Promotor (Venta Total) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                max="100"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                % Comisión para Captador *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                max="100"
                value={captadorCommissionPercentage}
                onChange={(e) => setCaptadorCommissionPercentage(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                % Comisión para Vendedor *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                max="100"
                value={vendedorCommissionPercentage}
                onChange={(e) => setVendedorCommissionPercentage(Number(e.target.value))}
                className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <BadgeCheck size={14} className="text-slate-500" /> Hitos de Facturación
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  % de cobro en Reserva *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  max="100"
                  value={billingPctReservation}
                  onChange={(e) => setBillingPctReservation(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  % de cobro en Contrato *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  max="100"
                  value={billingPctContract}
                  onChange={(e) => setBillingPctContract(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  % de cobro en Escritura *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  max="100"
                  value={billingPctDeed}
                  onChange={(e) => setBillingPctDeed(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  Cupo Máximo de Ventas del Promotor *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={maxPromoterSales}
                  onChange={(e) => setMaxPromoterSales(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border bg-white border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección 4: Resumen Financiero Acumulado */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <BadgeCheck size={16} className="text-altavik-600" /> Resumen Acumulado de la Promoción
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Ventas (Vendido/Reservado)</span>
              <span className="text-lg font-bold text-slate-800">{formatEur(totalSalesVolume)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Comisionamiento Acumulado</span>
              <span className="text-lg font-black text-altavik-600">
                {formatEur(totalSalesVolume * (commissionPercentage / 100))}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Total Inventario</span>
              <span className="text-lg font-bold text-slate-700">{formatEur(totalInventoryVolume)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Comisionamiento Potencial</span>
              <span className="text-lg font-bold text-slate-600">
                {formatEur(totalInventoryVolume * (commissionPercentage / 100))}
              </span>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-altavik-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-altavik-700 transition-all shadow-md shadow-altavik-200 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
