import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck as CheckCircle2, MessageSquareQuote, MessageCircle, Heart, Circle as HelpCircle, Circle as XCircle, Loader as Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const optionsP1 = [
  { id: 'mas_info', text: 'Me interesa, quiero más información.' },
  { id: 'pensarlo', text: 'Me interesa, pero necesito tiempo para pensarlo.' },
  { id: 'no_encaja', text: 'No encaja con lo que estoy buscando actualmente.' },
  { id: 'encontrado', text: 'Ya he encontrado otra vivienda.' }
];

const optionsP2 = [
  { id: 'ubicacion', text: 'Ubicación.' },
  { id: 'precio', text: 'Precio/Presupuesto.' },
  { id: 'distribucion', text: 'Distribución o tamaño de la vivienda.' },
  { id: 'plazos', text: 'Plazos de entrega.' },
  { id: 'falta_servicio', text: 'Falta de algún servicio o característica (ej. terraza, garaje).' },
  { id: 'otro', text: 'Otro.' }
];

const optionsP3 = [
  { id: 'muy_clara', text: 'Muy clara y completa.' },
  { id: 'suficiente', text: 'Suficiente, pero me faltan algunos detalles.' },
  { id: 'poca_info', text: 'Poca información o difícil de entender.' }
];

const optionsP4 = [
  { id: 'si_llamada', text: 'Sí, por favor (llamadme).' },
  { id: 'si_whatsapp', text: 'Sí, prefiero que me escribáis por WhatsApp/Email.' },
  { id: 'no_mirar', text: 'No, prefiero seguir mirando por mi cuenta de momento.' }
];

export default function FeedbackResponse() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const name = searchParams.get('name') || 'cliente';
  const initialRating = searchParams.get('rating') || '';

  const [answers, setAnswers] = useState({
    pregunta_1: initialRating,
    pregunta_2: '',
    pregunta_3: '',
    pregunta_4: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const showP2 = answers.pregunta_1 === 'no_encaja' || answers.pregunta_1 === 'encontrado';

  const handleSubmit = async () => {
    if (!leadId) return;
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).rpc('submit_lead_survey', {
        p_lead_id: leadId,
        p_survey_data: answers
      });

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error recording survey:', err);
      alert('Hubo un error al enviar la encuesta. Por favor, inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = (question: keyof typeof answers, value: string) => {
    setAnswers(prev => {
      const next = { ...prev, [question]: value };
      // Reset p2 if p1 changes to a value that doesn't need p2
      if (question === 'pregunta_1' && value !== 'no_encaja' && value !== 'encontrado') {
        next.pregunta_2 = '';
      }
      return next;
    });
  };

  const OptionButton = ({ 
    selected, 
    onClick, 
    text 
  }: { 
    selected: boolean; 
    onClick: () => void; 
    text: string 
  }) => (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
        selected 
          ? 'border-altavik-600 bg-altavik-600/40 text-altavik-900 font-bold' 
          : 'border-slate-200 bg-white hover:border-altavik-300 hover:bg-slate-50 text-slate-600'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-altavik-600' : 'border-slate-300'
      }`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-altavik-600" />}
      </div>
      <span className="text-sm">{text}</span>
    </button>
  );

  if (isSubmitted) {
    const whatsappUrl = `https://wa.me/34600000000?text=${encodeURIComponent(`Hola! Soy ${name}, he completado la encuesta y me gustaría recibir más información.`)}`;
    return (
      <div className="min-h-screen bg-altavik-600/40 flex items-center justify-center p-4 sm:p-6 font-['Inter']">
        <div className="bg-white max-w-lg w-full rounded-[32px] sm:rounded-[40px] shadow-2xl p-6 sm:p-10 text-center space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-500 border border-white/20">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-altavik-100 shadow-xl flex items-center justify-center mx-auto ring-8 ring-white/50 animate-bounce">
            <CheckCircle2 className="text-altavik-600" size={48} />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">¡Gracias por tu tiempo!</h1>
            <p className="text-slate-500 font-medium leading-relaxed px-4">
              Hemos guardado tus respuestas correctamente. Tu opinión nos ayuda a ofrecerte el mejor servicio.
            </p>
          </div>
          {!showP2 && (
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 justify-center text-altavik-600 mb-2">
                <MessageSquareQuote size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Atención Personalizada</span>
              </div>
              <p className="text-xs text-slate-400 font-bold leading-tight">
                ¿Prefieres hablar directamente con un asesor para agilizar el proceso?
              </p>
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-altavik-600 hover:bg-altavik-700 text-white w-full py-4 rounded-2xl font-black text-sm shadow-xl shadow-altavik-200 transition-all active:scale-95 group"
              >
                <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
                HABLAR POR WHATSAPP
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 font-['Inter']">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-white border-b-4 border-altavik-600 p-8 text-center flex flex-col items-center">
          <img src="/logo-altavik.png" alt="Altavik Logo" className="h-16 mb-4 object-contain" />
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Breve Encuesta de Opinión</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Hola {name}, nos tomará menos de 30 segundos.</p>
        </div>

        <div className="p-6 sm:p-10 space-y-10">
          
          {/* Pregunta 1 */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-black text-slate-800">
              ¿Qué te ha parecido la promoción?
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {optionsP1.map(opt => (
                <OptionButton 
                  key={opt.id}
                  text={opt.text}
                  selected={answers.pregunta_1 === opt.id}
                  onClick={() => handleSelect('pregunta_1', opt.id)}
                />
              ))}
            </div>
          </div>

          {/* Pregunta 2 (Condicional) */}
          {showP2 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-lg font-black text-slate-800">
                Si no encaja con lo que buscas, ¿cuál es el motivo principal?
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {optionsP2.map(opt => (
                  <OptionButton 
                    key={opt.id}
                    text={opt.text}
                    selected={answers.pregunta_2 === opt.id}
                    onClick={() => handleSelect('pregunta_2', opt.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pregunta 3 */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <h3 className="text-lg font-black text-slate-800">
              ¿Cómo calificarías la información comercial recibida?
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {optionsP3.map(opt => (
                <OptionButton 
                  key={opt.id}
                  text={opt.text}
                  selected={answers.pregunta_3 === opt.id}
                  onClick={() => handleSelect('pregunta_3', opt.id)}
                />
              ))}
            </div>
          </div>

          {/* Pregunta 4 (Condicional) */}
          {!showP2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <h3 className="text-lg font-black text-slate-800">
                ¿Te gustaría que nuestro equipo comercial contacte contigo para resolver dudas?
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {optionsP4.map(opt => (
                  <OptionButton 
                    key={opt.id}
                    text={opt.text}
                    selected={answers.pregunta_4 === opt.id}
                    onClick={() => handleSelect('pregunta_4', opt.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !answers.pregunta_1 || (showP2 && !answers.pregunta_2) || !answers.pregunta_3 || (!showP2 && !answers.pregunta_4)}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Enviar Respuestas
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
              TUS RESPUESTAS SON CONFIDENCIALES Y SEGURAS
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
