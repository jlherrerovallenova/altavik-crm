import React from 'react';
import { FileText, Upload, Eye, Download, Trash2, Loader2 } from 'lucide-react';
import type { Database } from '../../types/supabase';

type Sale = Database['public']['Tables']['sales']['Row'];

interface Props {
  sale: Sale;
  documents: any[];
  hasJointBuyer: boolean;
  uploadingSlot: string | null;
  deletingId: string | null;
  loadingPreview: boolean;
  previewName: string | null;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => Promise<void>;
  handleDownload: (filePath: string, name: string) => Promise<void>;
  handlePreview: (filePath: string, name: string) => Promise<void>;
  handleDelete: (docId: string, filePath: string) => Promise<void>;
}

export default function SaleDocumentDossier({
  sale,
  documents,
  hasJointBuyer,
  uploadingSlot,
  deletingId,
  loadingPreview,
  previewName,
  handleUpload,
  handleDownload,
  handlePreview,
  handleDelete
}: Props) {
  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 rounded-t-xl">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-emerald-600" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Expediente Digital (Documentos Firmados)</h3>
        </div>
        <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
          {documents.filter(d => d.document_type !== 'otros').length} de {hasJointBuyer ? 5 : 4} obligatorios
        </span>
      </div>
      
      <div className="p-5 space-y-5">
        <p className="text-[11px] text-slate-400 -mt-2 leading-relaxed">
          Sube y gestiona los documentos oficiales firmados para formalizar esta operación inmobiliaria. Los archivos se almacenan en un repositorio privado seguro.
        </p>

        {/* Slots principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
            {
              type: 'dni_comprador',
              title: 'DNI / NIE Comprador',
              description: 'Copia legible del documento de identidad del comprador (ambas caras).',
            },
            ...(hasJointBuyer ? [{
              type: 'dni_cotitular',
              title: 'DNI / NIE Cotitular',
              description: 'Copia legible del documento del cotitular (ambas caras).',
            }] : []),
            {
              type: 'reserva',
              title: 'Documento de Reserva Firmado',
              description: 'El documento de reserva firmado digital o físicamente por el comprador.',
            },
            {
              type: 'contrato',
              title: 'Contrato de Compraventa Firmado',
              description: 'Copia oficial del contrato de compraventa firmado por todas las partes.',
            },
            {
              type: 'banco',
              title: 'Certificados / Justificantes Bancarios',
              description: 'Certificados de transferencias, avales bancarios o justificantes de pago inicial.',
            },
          ].map(slot => {
            const doc = documents.find(d => d.document_type === slot.type);
            const isUploading = uploadingSlot === slot.type;
            const isDeleting = doc ? deletingId === doc.id : false;

            return (
              <div
                key={slot.type}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  doc
                    ? 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-200/80 shadow-sm shadow-emerald-50/10'
                    : 'bg-slate-50/50 border-slate-100 hover:border-slate-200/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${
                    doc 
                      ? 'bg-emerald-100/60 border-emerald-200/50 text-emerald-700' 
                      : 'bg-white border-slate-100 text-slate-400'
                  }`}>
                    {doc ? <FileText size={16} /> : <Upload size={16} />}
                  </div>
                  
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate">{slot.title}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        doc
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-100 text-slate-400 border-slate-200/60'
                      }`}>
                        {doc ? 'Subido' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {doc ? doc.name : slot.description}
                    </p>
                    {doc && (
                      <p className="text-[9px] text-emerald-600/80 font-bold mt-1">
                        {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dashed border-slate-200/60 flex justify-end gap-2">
                  {doc ? (
                    <>
                      <button type="button"
                        disabled={isDeleting || (loadingPreview && previewName !== doc.name)}
                        onClick={() => handlePreview(doc.file_path, doc.name)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg transition-all active:scale-95 shadow-sm"
                      >
                        {loadingPreview && previewName === doc.name ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Eye size={11} />
                        )}
                        Ver
                      </button>
                      <button type="button"
                        disabled={isDeleting}
                        onClick={() => handleDownload(doc.file_path, doc.name)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg transition-all active:scale-95 shadow-sm"
                      >
                        <Download size={11} /> Descargar
                      </button>
                      <button type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-600 border border-red-100 rounded-lg transition-all active:scale-95 shadow-sm"
                      >
                        {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Eliminar
                      </button>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="sr-only"
                        disabled={isUploading}
                        onChange={(e) => handleUpload(e, slot.type)}
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      />
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 bg-altavik-600 hover:bg-altavik-700 text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm border border-altavik-700/10 ${
                        isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}>
                        {isUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} Subir Documento
                      </span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Documentos Adicionales */}
        <div className="pt-4 border-t border-slate-100/80">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Documentación Adicional</h4>
              <p className="text-[9px] text-slate-400">Sube cualquier otro documento relevante (escrituras, comprobantes extras, etc.)</p>
            </div>
            <label className="cursor-pointer shrink-0">
              <input
                type="file"
                className="sr-only"
                disabled={uploadingSlot === 'otros'}
                onChange={(e) => handleUpload(e, 'otros')}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />
              <span className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all active:scale-95 border border-slate-200 shadow-sm ${
                uploadingSlot === 'otros' ? 'opacity-50 cursor-not-allowed' : ''
              }`}>
                {uploadingSlot === 'otros' ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} Subir Archivo Extra
              </span>
            </label>
          </div>

          {documents.filter(d => d.document_type === 'otros').length === 0 ? (
            <div className="text-center py-6 bg-slate-50/20 rounded-xl border border-dashed border-slate-200/80">
              <FileText size={18} className="text-slate-300 mx-auto mb-1.5" />
              <p className="text-[10px] text-slate-400 font-medium">No se han adjuntado documentos adicionales.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {documents.filter(d => d.document_type === 'otros').map(doc => {
                const isDeleting = deletingId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-slate-200/80 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7.5 h-7.5 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100 text-slate-400 shadow-sm">
                        <FileText size={13} />
                      </div>
                      <div className="truncate">
                        <div className="text-[11px] font-bold text-slate-700 truncate">{doc.name}</div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button"
                        disabled={isDeleting || (loadingPreview && previewName !== doc.name)}
                        onClick={() => handlePreview(doc.file_path, doc.name)}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-md border border-slate-200 transition-all active:scale-95 shadow-sm"
                        title="Ver"
                      >
                        {loadingPreview && previewName === doc.name ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Eye size={12} />
                        )}
                      </button>
                      <button type="button"
                        disabled={isDeleting}
                        onClick={() => handleDownload(doc.file_path, doc.name)}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-md border border-slate-200 transition-all active:scale-95 shadow-sm"
                        title="Descargar"
                      >
                        <Download size={12} />
                      </button>
                      <button type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-md border border-red-100 transition-all active:scale-95 shadow-sm"
                        title="Eliminar"
                      >
                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
