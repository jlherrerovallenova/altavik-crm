const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    const files = execSync('git ls-files src/**/*.tsx').toString().trim().split('\n');

    for (const file of files) {
        if (!file) continue;
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        let hasMatch = false;
        lines.forEach((line, i) => {
            // Basic skips for noise
            if (line.trim().startsWith('import') || line.trim().startsWith('//')) return;
            if (line.includes('className=')) {
                // Check if lead is outside className
                const withoutClassName = line.replace(/className=(["']).*?\1/, '');
                if (!withoutClassName.match(/\blead\b/i) && !withoutClassName.match(/\bleads\b/i)) return;
            }
            if (line.includes('from(\'leads\')') || line.includes('from("leads")') || line.includes("`lead-card-${")) return;

            // Look for lead or leads as whole words inside >...< or '...' or "..." or `...`
            const matchTextNode = line.match(/>[^<]*\b(lead|leads|Lead|Leads)\b[^<]*</);
            const matchString = line.match(/(?<!=)(['"`])[^\1]*\b(lead|leads|Lead|Leads)\b[^\1]*\1/);

            if (matchTextNode || matchString) {
                // Skip common code-only strings
                if (line.includes('/leads') || line.includes('leads.') || line.includes('lead.') || line.includes('lead: ') || line.match(/lead(s)? as/)) {
                    // Still check text node since variables might be there, but let's be careful
                    if (!matchTextNode) return;
                }
                console.log(`${file}:${i + 1}: ${line.trim()}`);
                hasMatch = true;
            }
        });
        if (hasMatch) console.log('---');
    }
} catch (e) {
    console.error("Error:", e);
}
