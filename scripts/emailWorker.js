import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuración: Intervalo en milisegundos (ej. 5 minutos = 5 * 60 * 1000)
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '300000', 10);

console.log(`🚀 Iniciando Email Worker. Sincronizando cada ${SYNC_INTERVAL_MS / 1000 / 60} minutos.`);

async function runSync() {
    console.log(`\n[${new Date().toISOString()}] Ejecutando sincronización de emails...`);
    try {
        const { stdout, stderr } = await execAsync('node scripts/syncEmails.js');
        if (stdout) console.log(stdout);
        if (stderr) console.error('Advertencias durante sincronización:', stderr);
    } catch (error) {
        console.error(`💥 Error ejecutando syncEmails.js:`, error.message);
        if (error.stdout) console.log(error.stdout);
    }
}

// Ejecutar inmediatamente al arrancar
runSync();

// Programar ejecuciones periódicas
setInterval(runSync, SYNC_INTERVAL_MS);

// Mantener el proceso vivo
process.on('SIGINT', () => {
    console.log('Deteniendo Email Worker...');
    process.exit(0);
});
