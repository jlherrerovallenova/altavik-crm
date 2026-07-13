const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Match <button ... > tags, accounting for newlines
    const regex = /<button\b([^>]*?)>/gi;
    content = content.replace(regex, (match, attrs) => {
        // If it already has a type attribute, leave it alone
        if (/\btype\s*=\s*(['"])(button|submit|reset)\1/i.test(attrs) || /\btype\s*=\{/i.test(attrs)) {
            return match;
        }
        changed = true;
        return `<button type="button"${attrs}>`;
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated buttons in ${filePath}`);
    }
}

processDir(path.join(process.cwd(), 'src'));
