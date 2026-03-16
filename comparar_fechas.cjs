// comparar_fechas.cjs
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
// Asegúrate de tener instalado dotenv: npm install dotenv
require('dotenv').config(); 

// 1. Configura tu conexión a Supabase (usa las variables de tu .env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para convertir la fecha de serie de Excel a fecha de Javascript
// Excel considera erróneamente 1900 como año bisiesto, por eso se resta 25569 días en lugar de 25568 hasta 1970
function excelToJSDate(serial) {
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    return date_info;
}

// Función para comprobar si dos fechas son el mismo día (ignorando horas)
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

async function compararDatos() {
    console.log('Obteniendo leads de Supabase...');
    const { data: leadsDb, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, created_at');

    if (error) {
        console.error('Error obteniendo datos de Supabase:', error);
        return;
    }

    console.log(`Se han encontrado ${leadsDb.length} leads en Supabase.\n`);

    // Leer el archivo CSV
    // Asegúrate de que el nombre del archivo coincide con el tuyo
    const csvContent = fs.readFileSync('DATOS IDEALISTA.xls - estadísticas.csv', 'utf-8');
    const lineas = csvContent.split('\n').filter(line => line.trim() !== '');
    
    // Quitar la cabecera
    const cabecera = lineas.shift();

    const discrepancias = [];

    lineas.forEach((linea) => {
        // Separar por comas teniendo en cuenta posibles formatos
        const [usuario, email, telefono, fechaExcel] = linea.split(',');
        
        if (!fechaExcel || isNaN(parseFloat(fechaExcel))) return;

        const emailLimpio = email ? email.trim() : '';
        const telefonoLimpio = telefono ? telefono.trim() : '';
        
        // Buscar el lead en la base de datos (por email o por teléfono)
        const leadEncontrado = leadsDb.find(lead => 
            (emailLimpio && lead.email === emailLimpio) || 
            (telefonoLimpio && lead.phone === telefonoLimpio)
        );

        if (leadEncontrado) {
            const fechaCsvJS = excelToJSDate(parseFloat(fechaExcel));
            const fechaDbJS = new Date(leadEncontrado.created_at);

            // Comparamos si es el mismo día
            if (!isSameDay(fechaCsvJS, fechaDbJS)) {
                discrepancias.push({
                    id_supabase: leadEncontrado.id,
                    nombre_supabase: leadEncontrado.name,
                    email: emailLimpio || leadEncontrado.email,
                    telefono: telefonoLimpio || leadEncontrado.phone,
                    fecha_correcta_csv: fechaCsvJS.toISOString().split('T')[0],
                    fecha_erronea_db: fechaDbJS.toISOString().split('T')[0]
                });
            }
        }
    });

    console.log('--- REPORTE DE FECHAS INCORRECTAS ---');
    if (discrepancias.length === 0) {
        console.log('¡Todas las fechas de los clientes del CSV coinciden perfectamente en la base de datos!');
    } else {
        console.log(`Se han encontrado ${discrepancias.length} clientes con fechas diferentes:\n`);
        console.table(discrepancias);
    }
}

compararDatos();