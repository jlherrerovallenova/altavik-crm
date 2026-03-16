import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Solo monitorizamos la conexión a nivel de hardware/navegador
    const handleOnline = () => {
      setIsOnline(true);
      // Mantenemos el mensaje verde de "Conexión restaurada" visible por 3 segundos
      setTimeout(() => {
        setShowAlert(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Estado inicial
    setIsOnline(navigator.onLine);
    setShowAlert(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Si estamos online y no hay que mostrar la alerta temporal, ocultamos la barra
  if (isOnline && !showAlert) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ease-in-out">
      <div className={`w-full py-3 px-4 flex items-center justify-center gap-3 text-sm font-medium shadow-md ${
        isOnline
          ? 'bg-altavik-50 text-altavik-700 border-b border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-b border-rose-200'
      }`}>
        {isOnline ? (
          <>
            <Wifi size={18} className="animate-pulse" />
            Conexión de red restaurada
          </>
        ) : (
          <>
            <WifiOff size={18} className="animate-bounce" />
            Conexión de red perdida. Revisando internet...
          </>
        )}
      </div>
    </div>
  );
};