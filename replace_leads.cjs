const fs = require('fs');
const { execSync } = require('child_process');

const replacements = [
    ['Mis Leads', 'Mis Clientes'],
    ['Nuevo Lead', 'Nuevo Cliente'],
    ['Importar Leads', 'Importar Clientes'],
    ['Exportar Leads', 'Exportar Clientes'],
    ['Detalles del Lead', 'Detalles del Cliente'],
    ['No hay leads', 'No hay clientes'],
    ['Buscar leads', 'Buscar clientes'],
    ['Lead guardado', 'Cliente guardado'],
    ['Lead eliminado', 'Cliente eliminado'],
    ['Lead actualizado', 'Cliente actualizado'],
    ['perfil del lead', 'perfil del cliente'],
    ['Pipeline de Leads', 'Pipeline de Clientes'],
    ['Leads Recientes', 'Clientes Recientes'],
    ['buscando leads', 'buscando clientes'],
    ['Los leads han', 'Los clientes han'],
    ['el lead', 'el cliente'],
    ['El lead', 'El cliente'],
    ['al lead', 'al cliente'],
    ['El nuevo lead', 'El nuevo cliente'],
    ['Gestión de Leads', 'Gestión de Clientes'],
    ['>Leads<', '>Clientes<'],
    ['>Lead<', '>Cliente<'],
    ['"Leads"', '"Clientes"'],
    ['"Lead"', '"Cliente"'],
    ["'Leads'", "'Clientes'"],
    ["'Lead'", "'Cliente'"],
    ['Total Leads', 'Total Clientes'],
    ['un lead', 'un cliente'],
    ['Un lead', 'Un cliente'],
    ['sobre el lead', 'sobre el cliente'],
    ['asociado al lead', 'asociado al cliente'],
    ['Asociar Lead', 'Asociar Cliente'],
    ['Seleccionar Lead', 'Seleccionar Cliente'],
    ['Seleccionar lead', 'Seleccionar cliente'],
    ['Vincular Lead', 'Vincular Cliente'],
    ['Vincular con lead', 'Vincular con cliente'],
    ['Reunión con lead', 'Reunión con cliente'],
    ['Llamada a lead', 'Llamada a cliente'],
    ['Enviar email a lead', 'Enviar email a cliente'],
    ['Revisar lead', 'Revisar cliente'],
    ['lead-card', 'lead-card'], // this is code, we shouldn't replace it, but just leaving it for doc
];

try {
    const files = execSync('git ls-files src/**/*.tsx src/**/*.ts').toString().trim().split('\n');
    for (const file of files) {
        if (!file) continue;
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        // Exact text replacements
        for (const [search, replace] of replacements) {
            if (search === 'lead-card') continue; // Skip intentional non-replace
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            content = content.replace(regex, replace);
        }

        // One more general replacement for properties in form definition labels using specific syntax
        content = content.replace(/label="Lead"/g, 'label="Cliente"');
        content = content.replace(/label="Leads"/g, 'label="Clientes"');
        content = content.replace(/placeholder=".*?lead.*?"/gi, (match) => {
            let r = match.replace(/lead/g, 'cliente');
            r = r.replace(/Lead/g, 'Cliente');
            return r;
        });

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    }
} catch (e) { console.error(e) }
