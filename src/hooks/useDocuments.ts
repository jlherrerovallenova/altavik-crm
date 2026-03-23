// src/hooks/useDocuments.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const DOCUMENT_CATEGORIES = ['Documentos Olivo', 'Documentos Arce', 'Parcelas', 'Renders-Fotos'];

export interface SystemDocument {
    name: string;
    id: string;
    updated_at: string;
    category: string;
    fullPath: string;
    url?: string;
    metadata?: {
        size: number;
        mimetype: string;
    };
}

export function useDocuments() {
    return useQuery({
        queryKey: ['system_documents'],
        queryFn: async () => {
            let allDocs: SystemDocument[] = [];

            // Listar TODO en el bucket 'documents' de forma recursiva (si es posible)
            const foldersToList = ['', 'General', ...DOCUMENT_CATEGORIES];
            
            for (const folder of foldersToList) {
                const { data, error } = await supabase.storage.from('documents').list(folder);
                if (error) {
                    console.error(`Error listando ${folder || 'raíz'}:`, error);
                    continue;
                }

                if (data) {
                    const validFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder' && f.name !== '.emptyFolder' && f.id);
                    const docsWithMeta = validFiles.map(doc => {
                        const path = folder ? `${folder}/${doc.name}` : doc.name;
                        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
                        return {
                            ...doc,
                            category: 'General', // Ya no usamos categorías específicas
                            fullPath: path,
                            url: publicUrl
                        };
                    });

                    // @ts-ignore
                    allDocs = [...allDocs, ...docsWithMeta];
                }
            }

            // Eliminar duplicados si los hay (por si un archivo sale en raíz y carpeta, aunque raro)
            const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.fullPath, item])).values());

            return uniqueDocs;
        },
        staleTime: 1000 * 60 * 5,
        retry: 1
    });
}

