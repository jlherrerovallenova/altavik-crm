import { useState } from 'react';
import { Mail, MailOpen, Star, Trash, Wand2, Search, Filter, MoreVertical, Reply, CheckCircle2, AlertCircle } from 'lucide-react';
import { extractLeadDataFromEmail, type GeminiExtractedLead } from '../services/geminiService';

const MOCK_EMAILS = [
  {
    id: 1,
    subject: "Ref: 948271 - Interés en Ático de 3 habitaciones",
    sender: "Idealista.com",
    senderEmail: "leads@idealista.com",
    date: "10:45 AM",
    preview: "Hola Altavik Residencial, hay un nuevo usuario interesado...",
    body: "Hola Altavik Residencial,\n\nHay un nuevo usuario interesado en su propiedad 'Ático de lujo con vistas al mar (Ref: 948271)'.\n\nDatos de contacto suministrados por el usuario:\nNombre: Rosina Martínez\nTeléfono: 600 123 456\nEmail: ro.martinez88@gmail.com\n\nMensaje adicional: 'Hola, quería saber si este ático tiene plaza de garaje grande, mi coche es un SUV amplio. Me gustaría hacer una visita el viernes por la tarde si fuese posible. Cuento con capital ahorrado y me urge.'\n\nPor favor, contacte con el usuario a la mayor brevedad posible.",
    unread: true,
    tags: ["Idealista", "Escaneable IA"]
  },
  {
    id: 2,
    subject: "Nuevo contacto desde formulario Web",
    sender: "Web Corporativa",
    senderEmail: "no-reply@altavik.com",
    date: "Ayer",
    preview: "Tienes una nueva consulta en la sección de contacto...",
    body: "Detalles del formulario:\n\nNombre: Francisco Javier\nTeléfono: 655998877\nConsulta: Quería información sobre las condiciones de financiación y si quedan bajos con jardín disponibles. Gracias.",
    unread: true,
    tags: ["Web", "Escaneable IA"]
  },
  {
    id: 3,
    subject: "Re: Dossier Informativo Promoción Mirapinos",
    sender: "carlos.gomez@empresa.com",
    senderEmail: "carlos.gomez@empresa.com",
    date: "Hace 2 días",
    preview: "Muchas gracias por la información, lo he estado revisando...",
    body: "Hola,\n\nMuchas gracias por la información, lo he estado revisando con mi mujer y nos gusta mucho la distribución del piso piloto. Nos pasamos el sábado por la mañana por la caseta de ventas para verlo en persona si os va bien.\n\nSaludos,\nCarlos.",
    unread: false,
    tags: ["Cliente Registrado"]
  }
];

export default function Inbox() {
  const [selectedMail, setSelectedMail] = useState<typeof MOCK_EMAILS[0] | null>(MOCK_EMAILS[0]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<GeminiExtractedLead | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const extractWithGemini = async () => {
    if (!selectedMail) return;
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const data = await extractLeadDataFromEmail(selectedMail.body, selectedMail.sender);
      setExtractionResult(data);
    } catch (err: any) {
      setExtractionError(err.message || 'Error desconocido al conectar con Gemini.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* LEFT COLUMN: Lista de Correos */}
      <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-slate-200 flex flex-col bg-slate-50/50">
        
        {/* Header Lista */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Bandeja de Entrada</h2>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Filter size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar correos o leads..." 
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none text-slate-700"
            />
          </div>
        </div>

        {/* Lista continua */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {MOCK_EMAILS.map((mail) => (
            <div 
              key={mail.id}
              onClick={() => {
                setSelectedMail(mail);
                setExtractionResult(null); // reseteamos visuales de IA
              }}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${selectedMail?.id === mail.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  {mail.unread ? (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  ) : null}
                  <span className={`text-sm ${mail.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{mail.sender}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{mail.date}</span>
              </div>
              <h3 className={`text-xs mb-1.5 line-clamp-1 ${mail.unread ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{mail.subject}</h3>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{mail.preview}</p>
              
              <div className="flex gap-2 mt-3">
                {mail.tags.map(t => (
                  <span key={t} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${t === 'Escaneable IA' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {t === 'Escaneable IA' && <Wand2 size={10} className="inline mr-1" />}
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Visor de Correo y Copilot */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedMail ? (
          <>
            {/* Header Email Viewer */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div>
                <h1 className="text-xl font-black text-slate-800 mb-2">{selectedMail.subject}</h1>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                    {selectedMail.sender.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedMail.sender}</p>
                    <p className="text-xs text-slate-500 font-medium">De: {selectedMail.senderEmail}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Reply size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Star size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical size={18} /></button>
              </div>
            </div>

            {/* Content & Copilot Layout */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Mail Body */}
              <div className="flex-1 p-8 overflow-y-auto prose prose-sm max-w-none prose-slate text-slate-600">
                <div className="whitespace-pre-wrap">{selectedMail.body}</div>
                
                {/* Reply box mockup */}
                <div className="mt-12 border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest mb-3">
                    <Reply size={14} /> Responder
                  </div>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                    placeholder="Escribe tu respuesta aquí..."
                    rows={4}
                  />
                  <div className="flex justify-end mt-3">
                    <button className="bg-[#1e293b] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-md">
                      Enviar
                    </button>
                  </div>
                </div>
              </div>

              {/* Control Mágico IA (Sidebar Derecha Opcional) */}
              {selectedMail.tags.includes('Escaneable IA') && (
                <div className="w-80 bg-slate-50 border-l border-slate-200 p-6 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-6">
                    <Wand2 size={16} /> Altavik Copilot
                  </div>

                  {!extractionResult ? (
                    <div className="bg-white border text-center border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <MailOpen size={24} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Lead Detectado</h3>
                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        Parece que hay datos de un cliente potencial en este correo. ¿Quieres que la inteligencia artificial extraiga la información y cree la ficha?
                      </p>
                      {extractionError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                          {extractionError}
                        </div>
                      )}
                      <button 
                        onClick={extractWithGemini}
                        disabled={isExtracting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:scale-100 active:scale-95"
                      >
                        {isExtracting ? (
                          <>Procesando datos<span className="animate-pulse">...</span></>
                        ) : (
                          <><Wand2 size={14} /> Extraer con Gemini</>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border text-left border-indigo-100 rounded-2xl p-5 shadow-md shadow-indigo-100/50 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-4">
                        <CheckCircle2 size={14} /> Extracción Exitosa
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre</label>
                          <p className="text-sm font-bold text-slate-800">{extractionResult.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teléfono</label>
                            <p className="text-sm font-bold text-slate-800">{extractionResult.phone}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</label>
                            <p className="text-sm font-bold text-indigo-600">{extractionResult.source}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                          <p className="text-sm font-medium text-slate-600 truncate">{extractionResult.email || 'No proporcionado'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Resumen (Notas)</label>
                          <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">{extractionResult.notes}</p>
                        </div>
                      </div>

                      <button className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                        Aprobar y Crear Ficha
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Mail size={48} className="mb-4 text-slate-200" strokeWidth={1} />
            <p className="text-sm font-bold tracking-tight">Selecciona un correo para leerlo</p>
          </div>
        )}
      </div>

    </div>
  );
}
