// src/pages/FeedbackResponse.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, MessageSquareQuote, MessageCircle, Heart, HelpCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function FeedbackResponse() {
  const [searchParams] = useSearchParams();
  const [isRecording, setIsRecording] = useState(true);
  const rating = searchParams.get('rating') || 'positive';
  const name = searchParams.get('name') || 'cliente';
  const leadId = searchParams.get('leadId');

  useEffect(() => {
    async function recordFeedback() {
      if (!leadId) {
        setIsRecording(false);
        return;
      }

      try {
        const { error } = await supabase
          .from('leads')
          .update({
            feedback_rating: rating,
            feedback_responded_at: new Date().toISOString()
          })
          .eq('id', leadId);

        if (error) throw error;
      } catch (err) {
        console.error('Error recording feedback:', err);
      } finally {
        setIsRecording(false);
      }
    }

    recordFeedback();
  }, [leadId, rating]);

  const config = {
    positive: {
      icon: <Heart className="text-pink-500" size={48} />,
      bg: 'from-emerald-50 to-teal-50',
      title: '¡Nos alegra mucho!',
      subtitle: 'Gracias por tu valoración positiva. Estamos encantados de que la promoción te haya gustado.',
      waMessage: `Hola! Soy ${name}, acabo de ver la promoción y ¡me ha encantado! Me gustaría recibir más información.`
    },
    neutral: {
      icon: <HelpCircle className="text-amber-500" size={48} />,
      bg: 'from-amber-50 to-orange-50',
      title: 'Queremos ayudarte',
      subtitle: 'Entendemos que tengas dudas. ¿Hablamos y las resolvemos juntos?',
      waMessage: `Hola! Soy ${name}, tengo algunas dudas sobre la promoción que me gustaría comentar con vosotros.`
    },
    negative: {
      icon: <XCircle className="text-slate-400" size={48} />,
      bg: 'from-slate-50 to-slate-100',
      title: 'Gracias por tu sinceridad',
      subtitle: 'Sentimos que no encaje con lo que buscas. Tu opinión nos ayuda a ser más precisos en el futuro.',
      waMessage: `Hola! Soy ${name}, la promoción que he visto no encaja con lo que busco ahora mismo.`
    }
  }[rating as 'positive' | 'neutral' | 'negative'] || config.positive;

  const whatsappUrl = `https://wa.me/34600000000?text=${encodeURIComponent(config.waMessage)}`; // Usamos un placeholder, el usuario puede cambiarlo

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bg} flex items-center justify-center p-4 sm:p-6 font-['Inter']`}>
      <div className="bg-white max-w-lg w-full rounded-[32px] sm:rounded-[40px] shadow-2xl p-6 sm:p-10 text-center space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-500 border border-white/20">
        
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center mx-auto ring-8 ring-white/50 animate-bounce">
          {config.icon}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{config.title}</h1>
          <p className="text-slate-500 font-medium leading-relaxed px-4">
            Hola <span className="text-altavik-600 font-bold">{name}</span>, {config.subtitle}
          </p>
        </div>

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
            className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white w-full py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 transition-all active:scale-95 group"
          >
            <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
            HABLAR POR WHATSAPP
          </a>
        </div>

        <div className="pt-4 border-t border-slate-50">
          <div className="flex items-center justify-center gap-2 opacity-30 grayscale saturate-0">
             <span className="text-[10px] font-black tracking-widest">ALTAVIK • TERRAVALL</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">© {new Date().getFullYear()} Altavik Real Estate. Tu opinión es privada y segura.</p>
        </div>
      </div>
    </div>
  );
}
