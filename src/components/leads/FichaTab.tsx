import React from 'react';
import {
  MessageCircle, Globe, Smartphone, Users, MapPin, 
  FileText, Bell, Heart, Star, Send, Mail, Zap, CalendarIcon, 
  Plus, Pencil, X, Clock, Check, CheckCircle2, ChevronUp, ChevronDown, Trash2, Loader2, StickyNote, Home, Phone
} from 'lucide-react';
import { CustomSelect } from '../Shared';

interface FichaTabProps {
  formData: any;
  setFormData: any;
  handleChange: any;
  whatsappUrl: string;
  SOURCE_CONFIG: any;
  STATUS_CONFIG: any;
  setEmailModalMethod: any;
  setIsEmailModalOpen: any;
  setFirstContactTemplateActive: any;
  setIsFeedbackModalOpen: any;
  lead: any;
  tasks: any[];
  editingTaskId: number | null;
  setEditingTaskId: any;
  newTask: any;
  setNewTask: any;
  saveTask: any;
  toggleTaskStatus: any;
  renderEmailTrackingBadge: any;
  expandedTasks: any;
  toggleExpand: any;
  parseTaskTitle: any;
  startEditingTask: any;
  deleteTask: any;
  loading: boolean;
  waData: any;
}

export function FichaTab({
  formData, setFormData, handleChange, whatsappUrl, SOURCE_CONFIG, STATUS_CONFIG,
  setEmailModalMethod, setIsEmailModalOpen, setFirstContactTemplateActive, setIsFeedbackModalOpen,
  lead, tasks, editingTaskId, setEditingTaskId, newTask, setNewTask, saveTask, toggleTaskStatus,
  renderEmailTrackingBadge, expandedTasks, toggleExpand, parseTaskTitle, startEditingTask, deleteTask, loading, waData
}: FichaTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
      {/* COLUMNA IZQUIERDA */}
      <div className="lg:col-start-1 lg:col-end-8 lg:row-start-1 lg:row-span-2 flex flex-col gap-3">
        {/* DATOS DEL LEAD */}
        <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-2 text-slate-500 uppercase tracking-widest">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={16} /></div> DATOS DEL CONTACTO
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-12 gap-y-1.5">
            <div className="space-y-1 group sm:col-span-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Nombre Completo</label>
              <input name="name" value={formData.name} onChange={handleChange} className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
            </div>
            <div className="space-y-1 group sm:col-span-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Teléfono</label>
              <div className="relative w-full group/phone">
                <input 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="600 000 000"
                  className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-12 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" 
                />
                {formData.phone && (
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm active:scale-95"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle size={16} strokeWidth={3} />
                  </a>
                )}
              </div>
            </div>
            <div className="space-y-1 group sm:col-span-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Correo Electrónico</label>
              <input name="email" value={formData.email} onChange={handleChange} className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
            </div>
            <div className="space-y-1 group sm:col-span-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Origen del Contacto</label>
              <CustomSelect
                value={formData.source}
                onChange={(val) => setFormData({ ...formData, source: val })}
                options={SOURCE_CONFIG}
                className="w-full font-bold"
              />
            </div>
            <div className="space-y-1 sm:col-span-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Alta</label>
              <input type="date" name="created_at_date" value={formData.created_at_date} onChange={handleChange} className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
            </div>
            <div className="space-y-1 group sm:col-span-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Estado Actual</label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val as any })}
                className="w-full font-bold"
                options={Object.entries(STATUS_CONFIG).map(([id, cfg]: any) => ({
                  id,
                  label: cfg.label,
                  dotColor: cfg.dot
                }))}
              />
            </div>
            {/* MARKETING INTEGRADO */}
            <div className="sm:col-span-12 pt-2 border-t border-slate-50 mt-2">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Bell size={14} /></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Suscrito a Comunicaciones</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.is_subscribed}
                    onChange={(e) => setFormData({ ...formData, is_subscribed: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* INTERÉS Y CALIDAD */}
        <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* INTERÉS */}
            <div>
              <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-xl"><Heart size={16} /></div> INTERÉS
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Dormitorios</label>
                  <div className="flex flex-wrap gap-2">
                    {['1', '2', '3', '4'].map(bed => {
                      const isSelected = formData.interest_bedrooms.includes(bed);
                      return (
                        <button
                          key={bed}
                          onClick={() => {
                            const current = formData.interest_bedrooms;
                            setFormData({ ...formData, interest_bedrooms: isSelected ? current.filter((v: string) => v !== bed) : [...current, bed] });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border ${
                            isSelected 
                              ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-inner' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          {bed}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Altura</label>
                  <div className="flex flex-wrap gap-2">
                    {['Bajo', '1º-2º-3º', 'Atico'].map(floor => {
                      const isSelected = formData.interest_floor.includes(floor);
                      return (
                        <button
                          key={floor}
                          onClick={() => {
                            const current = formData.interest_floor;
                            setFormData({ ...formData, interest_floor: isSelected ? current.filter((v: string) => v !== floor) : [...current, floor] });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border ${
                            isSelected 
                              ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-inner' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          {floor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* CALIDAD DEL CLIENTE */}
            <div>
              <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                <div className="p-1.5 bg-amber-50 text-amber-500 rounded-xl"><Star size={16} fill="currentColor" /></div> CALIDAD DEL CLIENTE
              </h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Valoración</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setFormData({ ...formData, client_quality_rating: formData.client_quality_rating === rating ? 0 : rating })}
                      className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                        rating <= formData.client_quality_rating ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'
                      }`}
                    >
                      <Star size={28} fill={rating <= formData.client_quality_rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {formData.client_quality_rating === 0 ? 'Sin valorar' : `${formData.client_quality_rating} de 5 estrellas`}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* COLUMNA DERECHA */}
      <div className="lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:row-span-2 flex flex-col gap-4">
        {/* ACCIONES DE CONTACTO Y FEEDBACK */}
        <section>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
            
            {/* WhatsApp */}
            <button 
              onClick={() => { setEmailModalMethod('whatsapp'); setIsEmailModalOpen(true); }}
              className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all active:scale-[0.98] group"
            >
              <MessageCircle size={18} strokeWidth={2.5} />
              <span className="text-[9px] font-bold uppercase tracking-widest">WhatsApp</span>
            </button>

            {/* Email */}
            <button 
              onClick={() => { setEmailModalMethod('email'); setIsEmailModalOpen(true); }}
              className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-blue-50/50 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all active:scale-[0.98] group"
            >
              <Mail size={18} strokeWidth={2.5} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Email</span>
            </button>

            {/* Primer Contacto */}
            <button 
              onClick={() => { setEmailModalMethod('whatsapp'); setFirstContactTemplateActive(true); setIsEmailModalOpen(true); }}
              className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-amber-50/50 text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all active:scale-[0.98] group"
            >
              <Zap size={18} strokeWidth={2.5} />
              <span className="text-[9px] font-bold uppercase tracking-widest">1er Contacto</span>
            </button>

            {/* Opinión */}
            <button 
              onClick={() => setIsFeedbackModalOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 h-12 rounded-xl transition-all active:scale-[0.98] border border-transparent ${
                lead.feedback_rating
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : lead.feedback_sent 
                  ? 'bg-amber-50 text-amber-700 border-amber-100' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
              }`}
            >
              <Send size={18} strokeWidth={2.5} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Encuesta</span>
            </button>
          </div>
        </section>

        {/* AGENDA DE ACCIONES */}
        <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col">
          <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-2 text-slate-500 uppercase tracking-widest">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"><CalendarIcon size={16} /></div> AGENDA DE ACCIONES
          </h3>

          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 mt-2 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                {editingTaskId ? <Pencil size={12} className="text-amber-500" /> : <Plus size={12} className="text-blue-500" />}
                {editingTaskId ? 'Editar Acción' : 'Nueva Acción en Agenda'}
              </h4>
              {editingTaskId && (
                <button onClick={() => { setEditingTaskId(null); setNewTask({ ...newTask, title: '', comentario: '' }); }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Cancelar edición
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[1fr_135px_85px] gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                  <CustomSelect
                    value={newTask.type}
                    onChange={(val) => setNewTask({ ...newTask, type: val as any })}
                    className="w-full font-bold"
                    options={[
                      { id: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-blue-600' },
                      { id: 'WhatsApp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600' },
                      { id: 'Visita', label: 'Visita', icon: Home, color: 'text-purple-600' },
                      { id: 'Email', label: 'Email', icon: Mail, color: 'text-amber-600' },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</label>
                  <input
                    type="date"
                    value={newTask.date}
                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[13px] font-bold text-slate-700 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</label>
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[13px] font-bold text-slate-700 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-blue-500">Descripción</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={editingTaskId ? "Modificar descripción..." : "Ej: Llamar para confirmar visita"}
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 shadow-sm outline-none transition-all"
                  />
                  <button
                    onClick={() => saveTask()}
                    disabled={loading || !newTask.title}
                    className={`px-6 rounded-xl flex items-center justify-center gap-2 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale ${
                      editingTaskId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-altavik-600 hover:bg-altavik-700 shadow-altavik-200'
                    }`}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : editingTaskId ? <Save size={16} /> : <Plus size={16} />}
                    {editingTaskId ? 'Guardar' : 'Añadir'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LISTADO DE ACCIONES PENDIENTES */}
          {tasks.filter(t => !t.completed).length > 0 && (
            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock size={10} /> Acciones pendientes de realizar ({tasks.filter(t => !t.completed).length})
              </p>
              {tasks.filter(t => !t.completed).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleTaskStatus(task)}
                      className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center text-transparent hover:border-emerald-500 hover:text-emerald-500 transition-all"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          task.type === 'Llamada' ? 'bg-blue-50 text-blue-600' :
                          task.type === 'WhatsApp' ? 'bg-emerald-50 text-emerald-600' :
                          task.type === 'Email' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {task.type}
                        </span>
                        {renderEmailTrackingBadge(task)}
                        {(() => {
                          const { isDocSend, prefix, docs } = parseTaskTitle(task.title);
                          if (!isDocSend) {
                            return <h5 className="text-[12px] font-bold text-slate-700">{task.title}</h5>;
                          }
                          const isExpanded = !!expandedTasks[task.id];
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <h5 className="text-[12px] font-bold text-slate-700">{prefix}</h5>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(task.id);
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-all"
                                >
                                  <span>{docs.length} {docs.length === 1 ? 'documento' : 'documentos'}</span>
                                  {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="mt-1 pl-2 border-l-2 border-slate-100 flex flex-col gap-1">
                                  {docs.map((doc: any, idx: number) => (
                                    <span key={idx} className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                                      <FileText size={10} className="text-slate-400 shrink-0" />
                                      <span className="truncate max-w-[300px]">{doc}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(task.due_date).toLocaleDateString('es-ES')} a las {new Date(task.due_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditingTask(task)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={14} /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* PREFERENCIAS WHATSAPP */}
      {waData && (
        <section className="lg:col-span-12 lg:row-start-4 bg-white rounded-2xl p-3 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold flex items-center gap-2.5 text-slate-500 uppercase tracking-widest">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl"><MessageCircle size={16} /></div>
              Preferencias detectadas por WhatsApp
            </h3>
            <a
              href="/whatsapp"
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg transition-colors"
            >
              Ver conversación →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Tipo de vivienda */}
            <div className={`p-2 rounded-xl border-2 text-center ${
              waData.tipo_vivienda && waData.tipo_vivienda !== 'no_especificado'
                ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="text-xl mb-1">
                {waData.tipo_vivienda === 'bajo' ? '🏠' :
                 waData.tipo_vivienda === 'atico' ? '🏙️' :
                 waData.tipo_vivienda === 'planta_intermedia' ? '🏢' : '❓'}
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Tipo vivienda</p>
              <p className="text-xs font-bold text-slate-700 capitalize">
                {waData.tipo_vivienda === 'no_especificado' ? 'Sin especificar' :
                 waData.tipo_vivienda === 'planta_intermedia' ? 'Planta intermedia' :
                 waData.tipo_vivienda || '–'}
              </p>
            </div>
            {/* Dormitorios */}
            <div className={`p-2 rounded-xl border-2 text-center ${
              waData.dormitorios ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="text-xl mb-1">🛏️</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Dormitorios</p>
              <p className="text-xs font-bold text-slate-700">
                {waData.dormitorios ? `${waData.dormitorios} dorm.` : 'Sin especificar'}
              </p>
            </div>
            {/* Visita */}
            <div className={`p-2 rounded-xl border-2 text-center ${
              waData.quiere_visita === true  ? 'border-purple-200 bg-purple-50' :
              waData.quiere_visita === false ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="text-xl mb-1">
                {waData.quiere_visita === true ? '✅' : waData.quiere_visita === false ? '❌' : '❓'}
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Visita</p>
              <p className="text-xs font-bold text-slate-700">
                {waData.quiere_visita === true ? 'Quiere visita' :
                 waData.quiere_visita === false ? 'No por ahora' : 'Sin confirmar'}
              </p>
            </div>
          </div>
          {waData.summary && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">💬 Resumen</p>
              <p className="text-xs text-slate-600 italic">"{waData.summary}"</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {new Date(waData.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
