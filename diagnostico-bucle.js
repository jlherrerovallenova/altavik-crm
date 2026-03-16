import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    console.log('🚀 Lanzando Puppeteer para diagnosticar el bucle de red...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const requestCount = new Map();
    let totalRequests = 0;

    // Interceptamos todas las peticiones
    page.on('request', request => {
        const url = request.url();
        if (url.includes('supabase') || url.includes('localhost')) {
            totalRequests++;
            const shortUrl = url.split('?')[0]; // Ignorar query params para agrupar
            requestCount.set(shortUrl, (requestCount.get(shortUrl) || 0) + 1);
        }
    });

    page.on('console', msg => console.log('💻 Consola del Navegador:', msg.text()));
    page.on('pageerror', error => console.error('❌ Error no capturado en el navegador:', error.message));

    console.log('Navegando a http://localhost:5173 ...');
    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) {
        console.log('Timeout al cargar, pero seguimos escuchando...');
    }

    console.log('Esperando 15 segundos para ver si se forma un bucle...');
    await new Promise(r => setTimeout(r, 15000));

    console.log('\n📊 REPORTE DE PETICIONES (Top 10):');
    const sorted = [...requestCount.entries()].sort((a, b) => b[1] - a[1]);
    for (const [url, count] of sorted.slice(0, 10)) {
        console.log(`- ${count} peticiones: ${url}`);
    }

    console.log(`\nTotal de peticiones monitoreadas en la sesión: ${totalRequests}`);

    await browser.close();
    console.log('✅ Diagnóstico finalizado.');
})();
