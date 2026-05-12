import { useState } from 'react';
import { 
  X, 
  Download, 
  Info, 
  Home, 
  Calendar, 
  TrendingUp, 
  FileText,
  BadgeCheck,
  Building2,
  CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import MortgageSimulatorModal from './MortgageSimulatorModal';
import { generatePropertyPDFBlob } from '../../utils/fichasVivienda';
import type { MortgageParams } from '../../utils/fichasVivienda';

interface Property {
  id: string;
  n_orden: string;
  planta: string;
  portal: string;
  letra: string;
  orientacion: string;
  dormitorios: number;
  banos: number;
  sup_util: number;
  sup_construida: number;
  sup_terrazas: number;
  sup_porche: number;
  garaje: string;
  trastero: string;
  precio: number;
  estado_vivienda?: string;
  ficha_url?: string;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export default function PaymentFormModal({ isOpen, onClose, property }: PaymentFormModalProps) {
  const [showSimulator, setShowSimulator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const basePrice = property.precio;
  const iva = basePrice * 0.1;
  const ajd = basePrice * 0.015;
  const totalWithIVA = basePrice + iva;
  const reserva = 6000;
  const tenPercent = totalWithIVA * 0.1;
  const firmaContrato = tenPercent - reserva;
  const monthlyQuotaTotal = totalWithIVA * 0.1;
  const monthlyAmount = monthlyQuotaTotal / 24;
  const eightyPercent = totalWithIVA * 0.8;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num).replace('€', '€').trim();
  };

  const handleGenerateWithParams = async (params: MortgageParams) => {
    setIsGenerating(true);
    try {
      const blob = await generatePropertyPDFBlob(property, params);
      const fileName = `Portal ${property.portal}_Planta ${property.planta}_Letra ${property.letra}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      saveAs(blob, fileName);
      setShowSimulator(false);
    } catch (e) {
      console.error('Error generando PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header - Premium Apple Style */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <img src="/logo-altavik.png" alt="Altavik Logo" className="h-10 w-auto" />
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">FORMA DE PAGO</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Two Columns */}
        <div className="flex-1 p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Property Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-900 shadow-sm relative overflow-hidden group">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-altavik-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-altavik-500/10 transition-all duration-700"></div>
                
                <h3 className="text-altavik-600 font-bold uppercase tracking-widest text-[10px] mb-4">Activo Seleccionado</h3>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-3xl font-bold mb-1 text-slate-900">P{property.portal} · {property.planta} - {property.letra}</div>
                    <div className="text-slate-500 font-medium text-lg flex items-center gap-2">
                      <Building2 size={18} className="text-altavik-500" />
                      Residencial Altavik
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-sm font-medium">Sup. útil</span>
                    <div className="text-base font-bold text-slate-800">{property.sup_util.toFixed(2)} m²</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-sm font-medium">Habitaciones</span>
                    <div className="text-base font-bold text-slate-800">{property.dormitorios} Dorm.</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-sm font-medium">Nº Baños</span>
                    <div className="text-base font-bold text-slate-800">{property.banos} Baños</div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-slate-400 text-sm font-black uppercase">Precio Base</span>
                    <div className="text-3xl font-black text-altavik-600">
                      {formatCurrency(property.precio)}
                    </div>
                  </div>
                  <div className="flex justify-between items-end p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 text-xs font-bold uppercase">Importe Total</span>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block leading-none mb-1">10% IVA INCLUIDO</span>
                      <div className="text-lg font-bold text-slate-700">
                        {formatCurrency(totalWithIVA)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fila AJD */}
                <div className="mt-4 p-4 rounded-2xl bg-white/50 border border-altavik-100 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-altavik-100 text-altavik-600 flex items-center justify-center font-bold text-[10px]">AJD</div>
                     <span className="text-xs font-bold text-slate-700">Impuesto AJD (1,5%)</span>
                   </div>
                   <div className="text-sm font-black text-slate-800">{formatCurrency(ajd)}</div>
                </div>

              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-sm">
                  <Info size={16} className="text-altavik-600" />
                  Notas Importantes
                </h3>
                <div className="space-y-2">
                  {[
                    "Cantidades avaladas por entidad bancaria.",
                    "Personalización de acabados disponible."
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 text-xs font-medium">
                      <CheckCircle2 size={16} className="text-altavik-500 mt-0.5" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Payment Breakdown */}
            <div className="lg:col-span-7">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <TrendingUp size={22} className="text-altavik-600" />
                Planificación de Pagos
              </h3>

              <div className="space-y-4">
                {[
                  { icon: Home, title: "1. Reserva", date: "Inmediato", amount: reserva, desc: "Bloqueo de la unidad" },
                  { icon: FileText, title: "2. Firma Contrato", date: "-", amount: firmaContrato, desc: "A la firma de la compraventa" },
                  { icon: Calendar, title: "3. Cuotas Mensuales", date: "24 mensualidades", amount: monthlyQuotaTotal, desc: `24 cuotas de ${formatCurrency(monthlyAmount)}` },
                  { icon: BadgeCheck, title: "4. Escrituración", date: "Entrega de llaves", amount: eightyPercent, desc: "Mediante préstamo hipotecario" }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4 group hover:translate-x-1 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-altavik-200 group-hover:text-altavik-600 transition-colors shadow-sm">
                      <step.icon size={20} />
                    </div>
                    <div className="flex-1 flex items-center justify-between py-1 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">{step.desc}</p>
                      </div>
                      <div className="text-right">
                        {idx !== 0 && (
                          <>
                            <div className="text-[10px] text-slate-400 font-medium">B: {formatCurrency(step.amount / 1.1)}</div>
                            <div className="text-[10px] text-slate-400 font-medium">I: {formatCurrency(step.amount - (step.amount / 1.1))}</div>
                          </>
                        )}
                        <div className="font-black text-slate-900 text-sm mt-0.5">{formatCurrency(step.amount)}</div>
                        <div className="text-[8px] text-altavik-500 uppercase font-black tracking-widest mt-1">{step.date}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Footer */}
                <div className="mt-6 p-5 rounded-2xl bg-altavik-50/50 border border-altavik-100 flex items-center justify-between">
                  <div>
                    <span className="text-altavik-600 font-black uppercase tracking-tighter text-xs">Inversión Final</span>
                    <p className="text-slate-500 text-[10px] font-medium">Incluye impuestos vigentes</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-altavik-700">{formatCurrency(totalWithIVA)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm"
            >
              Cerrar Preview
            </button>
            <button 
              onClick={() => setShowSimulator(true)}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-200 hover:bg-slate-800 hover:shadow-altavik-100 active:scale-95 transition-all flex items-center gap-2 text-sm"
            >
              <Download size={18} />
              <span>Generar Documento PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <MortgageSimulatorModal
      isOpen={showSimulator}
      onClose={() => setShowSimulator(false)}
      property={property}
      onGenerate={handleGenerateWithParams}
      isGenerating={isGenerating}
    />
    </>
  );
}
