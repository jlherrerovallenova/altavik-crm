import { createContext, useState, useContext, type ReactNode } from 'react';
import { TriangleAlert as AlertTriangle, Info, X } from 'lucide-react';

interface DialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

interface DialogState extends DialogOptions {
    isOpen: boolean;
    type: 'confirm' | 'alert';
    resolve?: (value: boolean) => void;
}

interface DialogContextType {
    showConfirm: (options: DialogOptions) => Promise<boolean>;
    showAlert: (options: DialogOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<DialogState>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    const showConfirm = (options: DialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                type: 'confirm',
                ...options,
                resolve,
                confirmText: options.confirmText || 'Confirmar',
                cancelText: options.cancelText || 'Cancelar'
            });
        });
    };

    const showAlert = (options: DialogOptions): Promise<void> => {
        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                type: 'alert',
                ...options,
                // Al cerrar el alert simplemente resolvemos con true para continuar el flujo
                resolve: () => resolve(),
                confirmText: options.confirmText || 'Entendido'
            });
        });
    };

    const handleClose = (value: boolean) => {
        setDialog((prev) => ({ ...prev, isOpen: false }));
        if (dialog.resolve) {
            dialog.resolve(value);
        }
    };

    return (
        <DialogContext.Provider value={{ showConfirm, showAlert }}>
            {children}

            {dialog.isOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full shrink-0 ${dialog.type === 'confirm' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    {dialog.type === 'confirm' ? <AlertTriangle size={24} /> : <Info size={24} />}
                                </div>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{dialog.title}</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{dialog.message}</p>
                                </div>
                                <button type="button"
                                    onClick={() => handleClose(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3 justify-end">
                            {dialog.type === 'confirm' && (
                                <button type="button"
                                    onClick={() => handleClose(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200/50 transition-colors"
                                >
                                    {dialog.cancelText}
                                </button>
                            )}
                            <button type="button"
                                onClick={() => handleClose(true)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${dialog.type === 'confirm'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-altavik-600 hover:bg-altavik-700'
                                    }`}
                            >
                                {dialog.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (context === undefined) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}
