// src/components/leads/SaleTab.tsx
// Pestaña de gestión del proceso de compra-venta de una vivienda
import React, { useState, useEffect } from 'react';
import {
  Home, User, Users, FileText, Receipt, PenLine,
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Loader2, Save, CalendarDays, BadgeEuro, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generarReservaPdf, generarReservaDocx, type DatosReserva } from '../../utils/generarReserva';
import { CustomSelect } from '../Shared';
import type { Database } from '../../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type InventoryRow = Database['public']['Tables']['inventory']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];
type Installment = Database['public']['Tables']['installments']['Row'];

const CIVIL_STATUS_OPTIONS = [
  'Soltero/a',
  'Casado/a en régimen de gananciales',
  'Casado/a en régimen de separación de bienes',
  'Casado/a en régimen de participación',
  'Pareja de hecho',
  'Divorciado/a',
  'Separado/a legalmente',
  'Viudo/a',
];

const SALE_STEPS = [
  { key: 'reserva',        label: '1. Reserva',              icon: FileText },
  { key: 'contrato',       label: '2. Contrato de Compraventa', icon: PenLine },
  { key: 'mensualidades',  label: '3. Mensualidades (24)',   icon: Receipt },
  { key: 'escrituracion',  label: '4. Escrituración',        icon: Home },
] as const;

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

interface Props {
  lead: Lead;
  onLeadUpdate: (updates: Partial<Lead>) => Promise<void>;
}

export default function SaleTab({ lead, onLeadUpdate }: Props) {
  const [properties, setProperties] = useState<InventoryRow[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);

  // Formulario datos personales
  const [personalForm, setPersonalForm] = useState({
    dni: lead.dni || '',
    civil_status: lead.civil_status || '',
    address: lead.address || '',
    postal_code: lead.postal_code || '',
    city: lead.city || '',
    nationality: lead.nationality || 'Española',
    occupation: lead.occupation || '',
    property_id: lead.property_id || '',
    province: lead.province || '',
    // Cotitular
    joint_buyer_name: lead.joint_buyer_name || '',
    joint_buyer_dni: lead.joint_buyer_dni || '',
    joint_buyer_email: lead.joint_buyer_email || '',
    joint_buyer_phone: lead.joint_buyer_phone || '',
  });
  const [hasJointBuyer, setHasJointBuyer] = useState(!!lead.joint_buyer_name);

  useEffect(() => {
    fetchProperties();
    fetchSale();
  }, [lead.id]);

  async function fetchProperties() {
    const { data } = await supabase
      .from('inventory')
      .select('*');
      
    if (data) {
      // Ordenar numéricamente por n_orden (1, 2, 3... en lugar de 1, 10, 11...)
      const sorted = ((data as InventoryRow[]) || []).sort((a, b) => {
        const valA = a.n_orden || '';
        const valB = b.n_orden || '';
        const numA = parseInt(valA) || 0;
        const numB = parseInt(valB) || 0;
        if (numA !== numB) return numA - numB;
        // Si los números son iguales (o ambos 0), comparamos como string por si acaso (natural sort)
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setProperties(sorted);
    }
  }

  async function fetchSale() {
    const { data } = await (supabase as any)
      .from('sales')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setSale(data);
      fetchInstallments(data.id);
    }
  }

  async function fetchInstallments(saleId: string) {
    const { data } = await (supabase as any)
      .from('installments')
      .select('*')
      .eq('sale_id', saleId)
      .order('installment_number');
    if (data) setInstallments(data);
  }

  const selectedProperty = properties.find(p => p.id === personalForm.property_id)
    || (lead.property_id ? null : null);
  const precio = selectedProperty?.precio || sale?.sale_price || 0;
  const iva = 0.10;
  const reservation = 6000;
  const totalWithIva = precio * (1 + iva);
  const contractPayment = precio * iva + precio * iva * iva - reservation; // 10% + IVA - 6000€
  const monthlyTotal = precio * iva * (1 + iva); // 10% precio + 10% IVA sobre ese 10%
  const monthlyAmount = monthlyTotal / 24;
  const escrituraPayment = precio * 0.80 * (1 + iva);

  async function savePersonalData() {
    setSavingPersonal(true);
    await onLeadUpdate({
      ...personalForm,
      property_id: personalForm.property_id || null,
      joint_buyer_name: hasJointBuyer ? personalForm.joint_buyer_name : null,
      joint_buyer_dni: hasJointBuyer ? personalForm.joint_buyer_dni : null,
      joint_buyer_email: hasJointBuyer ? personalForm.joint_buyer_email : null,
      joint_buyer_phone: hasJointBuyer ? personalForm.joint_buyer_phone : null,
    });
    setSavingPersonal(false);
  }

  async function formalizarReserva() {
    if (!personalForm.property_id || !precio) return;
    setLoading(true);
    const { data, error } = await (supabase as any).from('sales').insert([{
      lead_id: lead.id,
      property_id: personalForm.property_id,
      sale_status: 'reserva',
      sale_price: precio,
      iva_percentage: 10,
      reservation_amount: reservation,
      reservation_date: new Date().toISOString().slice(0, 10),
    }]).select().single();
    if (!error && data) {
      setSale(data);
      await onLeadUpdate({ sale_status: 'reserva', property_id: personalForm.property_id });
      setShowDocModal(true); // Mostrar modal para descargar documentos
    }
    setLoading(false);
  }

  async function advanceSaleStatus(newStatus: Sale['sale_status']) {
    if (!sale) return;
    setLoading(true);

    if (newStatus === 'mensualidades' && installments.length === 0) {
      // Generar 24 recibos
      const startDate = new Date();
      startDate.setDate(1);
      startDate.setMonth(startDate.getMonth() + 1);
      const rows = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        return {
          sale_id: sale.id,
          installment_number: i + 1,
          due_date: d.toISOString().slice(0, 10),
          amount: parseFloat(monthlyAmount.toFixed(2)),
          paid: false,
        };
      });
      await (supabase as any).from('installments').insert(rows);
      fetchInstallments(sale.id);
    }

    await (supabase as any).from('sales').update({ sale_status: newStatus }).eq('id', sale.id);
    await onLeadUpdate({ sale_status: newStatus });
    setSale(prev => prev ? { ...prev, sale_status: newStatus } : null);
    setLoading(false);
  }

  async function toggleInstallment(inst: Installment) {
    const newPaid = !inst.paid;
    await (supabase as any).from('installments').update({
      paid: newPaid,
      paid_date: newPaid ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', inst.id);
    setInstallments(prev => prev.map(i => i.id === inst.id ? { ...i, paid: newPaid, paid_date: newPaid ? new Date().toISOString().slice(0,10) : null } : i));
  }

  const currentStepIdx = SALE_STEPS.findIndex(s => s.key === sale?.sale_status);
  const paidCount = installments.filter(i => i.paid).length;

  const inputCls = 'w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-lg outline-none text-sm text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all';
  const labelCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5';

  /** Construye el objeto DatosReserva con los datos actuales del estado */
  function buildDatos(): DatosReserva | null {
    if (!selectedProperty) return null;
    const today = new Date();
    const fechaReserva = today.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return {
      nombre: lead.name,
      dni: personalForm.dni || '_______________',
      estadoCivil: personalForm.civil_status || '_______________',
      domicilio: personalForm.address || '_______________',
      localidad: personalForm.city || '_______________',
      codigoPostal: personalForm.postal_code || '_______________',
      nacionalidad: personalForm.nationality || 'Española',
      provincia: personalForm.province || '_______________',
      email: lead.email || '',
      telefono: lead.phone || '',
      nombreCotitular: hasJointBuyer ? personalForm.joint_buyer_name || undefined : undefined,
      dniCotitular: hasJointBuyer ? personalForm.joint_buyer_dni || undefined : undefined,
      nOrden: selectedProperty.n_orden,
      portal: selectedProperty.portal,
      planta: selectedProperty.planta,
      letra: selectedProperty.letra,
      dormitorios: selectedProperty.dormitorios,
      banos: selectedProperty.banos,
      supUtil: selectedProperty.sup_util,
      supConst: selectedProperty.sup_construida || 0,
      supTerrazas: selectedProperty.sup_terrazas || 0,
      supPorche: selectedProperty.sup_porche || 0,
      garaje: selectedProperty.garaje || 'No incluido',
      trastero: selectedProperty.trastero || 'No incluido',
      precio: selectedProperty.precio,
      fechaReserva,
      importeReserva: reservation,
    };
  }

  return (
    <div className="space-y-5 overflow-y-auto pr-1">

      {/* ── SECCIÓN 1: Datos personales del comprador ── */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
          <User size={14} className="text-altavik-600" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-altavik-600">Datos del Comprador</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-3">
          <div className="xl:col-span-1">
            <label className={labelCls}>DNI / NIE / Pasaporte</label>
            <input className={inputCls} value={personalForm.dni} onChange={e => setPersonalForm(f => ({...f, dni: e.target.value}))} placeholder="12345678A" />
          </div>
          <div className="xl:col-span-2">
            <label className={labelCls}>Estado Civil</label>
            <CustomSelect
              className="mt-1"
              value={personalForm.civil_status}
              onChange={(val) => setPersonalForm(f => ({...f, civil_status: val}))}
              options={CIVIL_STATUS_OPTIONS.map(s => ({ id: s, label: s }))}
            />
          </div>
          <div>
            <label className={labelCls}>Nacionalidad</label>
            <input className={inputCls} value={personalForm.nationality} onChange={e => setPersonalForm(f => ({...f, nationality: e.target.value}))} />
          </div>
          <div className="xl:col-span-3">
            <label className={labelCls}>Profesión</label>
            <input className={inputCls} value={personalForm.occupation} onChange={e => setPersonalForm(f => ({...f, occupation: e.target.value}))} placeholder="Empleado/a por cuenta ajena" />
          </div>

          <div className="xl:col-span-2">
            <label className={labelCls}>Domicilio</label>
            <input className={inputCls} value={personalForm.address} onChange={e => setPersonalForm(f => ({...f, address: e.target.value}))} placeholder="Calle, número, piso..." />
          </div>
          <div className="xl:col-span-1">
            <label className={labelCls}>Código Postal</label>
            <input className={inputCls} value={personalForm.postal_code} onChange={e => setPersonalForm(f => ({...f, postal_code: e.target.value}))} placeholder="03001" />
          </div>
          <div className="xl:col-span-2">
            <label className={labelCls}>Localidad</label>
            <input className={inputCls} value={personalForm.city} onChange={e => setPersonalForm(f => ({...f, city: e.target.value}))} placeholder="Alicante" />
          </div>
          <div className="xl:col-span-1">
            <label className={labelCls}>Provincia</label>
            <input className={inputCls} value={personalForm.province} onChange={e => setPersonalForm(f => ({...f, province: e.target.value}))} placeholder="Alicante" />
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 2: Cotitular ── */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-purple-600" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-purple-600">Cotitular (Compra Conjunta)</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[11px] text-slate-500">Activar</span>
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={hasJointBuyer} onChange={e => setHasJointBuyer(e.target.checked)} />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </div>
          </label>
        </div>
        {hasJointBuyer && (
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre Completo</label>
              <input className={inputCls} value={personalForm.joint_buyer_name} onChange={e => setPersonalForm(f => ({...f, joint_buyer_name: e.target.value}))} />
            </div>
            <div>
              <label className={labelCls}>DNI / NIE</label>
              <input className={inputCls} value={personalForm.joint_buyer_dni} onChange={e => setPersonalForm(f => ({...f, joint_buyer_dni: e.target.value}))} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={personalForm.joint_buyer_email} onChange={e => setPersonalForm(f => ({...f, joint_buyer_email: e.target.value}))} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={personalForm.joint_buyer_phone} onChange={e => setPersonalForm(f => ({...f, joint_buyer_phone: e.target.value}))} />
            </div>
          </div>
        )}
      </section>

      {/* ── SECCIÓN 3: Vivienda vinculada ── */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
          <Home size={14} className="text-cyan-600" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-600">Vivienda</h3>
        </div>
        <div className="p-5">
          <CustomSelect
            label="Vivienda seleccionada"
            value={personalForm.property_id}
            onChange={(val) => setPersonalForm(f => ({...f, property_id: val}))}
            options={[
              { id: '', label: '-- Seleccionar vivienda --' },
              ...properties.map(p => ({
                id: p.id,
                label: `Nº ${p.n_orden} | Portal ${p.portal} | Planta ${p.planta}${p.letra} — ${fmt(p.precio)} [${p.estado_vivienda || 'Sin estado'}]`,
                icon: Home,
                color: p.estado_vivienda === 'Libre' ? 'text-green-500' : 'text-slate-400'
              }))
            ]}
          />
          {selectedProperty && (
            <div className="mt-4 p-4 bg-altavik-50/50 rounded-2xl border border-altavik-100/50 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-altavik-500 animate-pulse" />
                <h4 className="text-[10px] font-black text-altavik-700 uppercase tracking-widest">Información de la Propiedad Seleccionada</h4>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-altavik-100 shadow-sm text-center">
                  <div className="text-slate-400 font-bold mb-1 uppercase tracking-tighter text-[9px]">Precio base</div>
                  <div className="font-black text-slate-800 text-sm italic">{fmt(precio)}</div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-altavik-100 shadow-sm text-center">
                  <div className="text-altavik-600 font-bold mb-1 uppercase tracking-tighter text-[9px]">Total + IVA 10%</div>
                  <div className="font-black text-altavik-800 text-sm italic">{fmt(totalWithIva)}</div>
                </div>
                <div className="bg-altavik-600 rounded-xl p-3 shadow-lg shadow-altavik-200 text-center">
                  <div className="text-altavik-100 font-bold mb-1 uppercase tracking-tighter text-[9px]">Reserva</div>
                  <div className="font-black text-white text-sm italic">{fmt(reservation)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Botón guardar datos */}
      <button
        onClick={savePersonalData}
        disabled={savingPersonal}
        className="w-full py-2.5 bg-altavik-600 hover:bg-altavik-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
      >
        {savingPersonal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Guardar datos del comprador
      </button>

      {/* ── SECCIÓN 4: Estado del proceso de venta ── */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
          <BadgeEuro size={14} className="text-amber-600" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Proceso de Venta</h3>
        </div>
        <div className="p-5 space-y-3">
          {/* Línea de progreso */}
          <div className="flex items-center gap-1 mb-4">
            {SALE_STEPS.map((step, idx) => {
              const done = currentStepIdx >= idx;
              const current = currentStepIdx === idx;
              return (
                <React.Fragment key={step.key}>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    done ? current ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-100 text-amber-700'
                         : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    <span className="hidden md:inline">{step.label}</span>
                  </div>
                  {idx < SALE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded ${done && currentStepIdx > idx ? 'bg-amber-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Desglose financiero */}
          {precio > 0 && (
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700">1</span>
                  Reserva
                </div>
                <span className="text-sm font-bold text-slate-800">{fmt(reservation)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700">2</span>
                  Contrato (10% + 10% IVA − 6.000€)
                </div>
                <span className="text-sm font-bold text-slate-800">{fmt(contractPayment)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700">3</span>
                  24 mensualidades × {fmt(monthlyAmount)}
                </div>
                <span className="text-sm font-bold text-slate-800">{fmt(monthlyTotal)}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 rounded-lg px-4 py-2.5 border border-amber-100">
                <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                  <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-800">4</span>
                  Escrituración (80% + 10% IVA)
                </div>
                <span className="text-sm font-bold text-amber-700">{fmt(escrituraPayment)}</span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-2">
            {!sale && (
              <button
                onClick={formalizarReserva}
                disabled={loading || !personalForm.property_id}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Formalizar Reserva
              </button>
            )}
            {sale?.sale_status === 'reserva' && (
              <button
                onClick={() => advanceSaleStatus('contrato')}
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                Confirmar Contrato Firmado
              </button>
            )}
            {sale?.sale_status === 'contrato' && (
              <button
                onClick={() => advanceSaleStatus('mensualidades')}
                disabled={loading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                Activar Plan de Mensualidades
              </button>
            )}
            {sale?.sale_status === 'mensualidades' && (
              <button
                onClick={() => advanceSaleStatus('escrituracion')}
                disabled={loading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Home size={16} />}
                Confirmar Escrituración
              </button>
            )}
            {sale?.sale_status === 'escrituracion' && (
              <button
                onClick={() => advanceSaleStatus('completada')}
                disabled={loading}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Marcar Venta como Completada
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5: Recibos mensuales ── */}
      {installments.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowInstallments(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-purple-600" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-purple-600">
                Recibos Mensuales — {paidCount}/{installments.length} pagados
              </h3>
            </div>
            {showInstallments ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showInstallments && (
            <div className="p-4">
              {/* Barra de progreso */}
              <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(paidCount / installments.length) * 100}%` }}
                />
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {installments.map(inst => (
                  <div
                    key={inst.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                      inst.paid ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => toggleInstallment(inst)} className={`shrink-0 transition-transform hover:scale-110 ${inst.paid ? 'text-green-500' : 'text-slate-300 hover:text-purple-500'}`}>
                        {inst.paid ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div>
                        <span className="text-xs font-bold text-slate-700">Cuota {inst.installment_number}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{new Date(inst.due_date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${inst.paid ? 'text-green-600' : 'text-slate-700'}`}>{fmt(inst.amount)}</div>
                      {inst.paid && inst.paid_date && (
                        <div className="text-[9px] text-green-500">Pagado: {new Date(inst.paid_date).toLocaleDateString('es-ES')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs font-bold">
                <span className="text-slate-600">Total cobrado</span>
                <span className="text-green-600">{fmt(paidCount * monthlyAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Pendiente</span>
                <span className="text-purple-600">{fmt((installments.length - paidCount) * monthlyAmount)}</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── MODAL: Descargar documento de reserva ── */}
      {showDocModal && selectedProperty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">¡Reserva formalizada!</h3>
                <p className="text-xs text-slate-500">Descarga el contrato de reserva</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Comprador</span>
                <span className="font-bold text-slate-700">{lead.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vivienda</span>
                <span className="font-bold text-slate-700">
                  Nº {selectedProperty.n_orden} — Portal {selectedProperty.portal} — Planta {selectedProperty.planta}{selectedProperty.letra}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reserva</span>
                <span className="font-bold text-amber-600">{fmt(reservation)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                disabled={generatingDoc}
                onClick={async () => {
                  setGeneratingDoc(true);
                  const d = buildDatos();
                  if (d) await generarReservaPdf(d);
                  setGeneratingDoc(false);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm"
              >
                {generatingDoc ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Descargar PDF
              </button>
              <button
                disabled={generatingDoc}
                onClick={async () => {
                  setGeneratingDoc(true);
                  const d = buildDatos();
                  if (d) await generarReservaDocx(d);
                  setGeneratingDoc(false);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm"
              >
                {generatingDoc ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Descargar DOCX
              </button>
            </div>

            <button
              onClick={() => setShowDocModal(false)}
              className="w-full py-2 text-slate-500 text-xs hover:text-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Botón de re-descarga si ya hay reserva y vivienda asociada */}
      {sale?.sale_status !== undefined && selectedProperty && !showDocModal && (
        <button
          onClick={() => setShowDocModal(true)}
          className="w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-amber-600 border border-dashed border-slate-200 hover:border-amber-300 rounded-xl transition-all"
        >
          <Download size={13} /> Descargar contrato de reserva
        </button>
      )}
    </div>
  );
}

