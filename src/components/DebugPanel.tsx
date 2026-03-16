import { useState, useEffect } from 'react';

export default function DebugPanel() {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const handleLog = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                setLogs(prev => [customEvent.detail, ...prev].slice(0, 50));
            }
        };

        window.addEventListener('supabase_mock_log', handleLog);
        return () => window.removeEventListener('supabase_mock_log', handleLog);
    }, []);

    if (logs.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-black text-green-400 font-mono text-xs p-4 rounded-lg shadow-2xl overflow-y-auto z-[99999] opacity-90 border border-green-800">
            <div className="flex justify-between items-center mb-2 border-b border-green-800 pb-2">
                <h3 className="font-bold">📡 Supabase Fetch Monitor</h3>
                <button onClick={() => setLogs([])} className="bg-green-800 text-black px-2 py-1 rounded">Limpiar</button>
            </div>
            <div className="space-y-1">
                {logs.map((log, i) => (
                    <div key={i} className="break-all">{log}</div>
                ))}
            </div>
        </div>
    );
}
