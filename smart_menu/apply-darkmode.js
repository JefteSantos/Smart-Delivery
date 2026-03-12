const fs = require('fs');
const path = require('path');

const colorMap = {
    'bg-white': 'dark:bg-gray-900',
    'bg-gray-50': 'dark:bg-gray-950',
    'bg-gray-100': 'dark:bg-gray-800',
    'bg-gray-200': 'dark:bg-gray-700',
    'text-gray-900': 'dark:text-gray-100',
    'text-gray-800': 'dark:text-gray-200',
    'text-gray-700': 'dark:text-gray-300',
    'text-gray-600': 'dark:text-gray-400',
    'text-gray-500': 'dark:text-gray-400',
    'text-gray-400': 'dark:text-gray-500',
    'text-gray-300': 'dark:text-gray-600',
    'border-gray-50': 'dark:border-gray-900',
    'border-gray-100': 'dark:border-gray-800',
    'border-gray-200': 'dark:border-gray-700',
    'border-gray-300': 'dark:border-gray-600',
};

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let originalContent = fs.readFileSync(fullPath, 'utf8');
            let content = originalContent;

            for (const key of Object.keys(colorMap).sort((a, b) => b.length - a.length)) {
                // match class exactly, separated by space or quotes
                // replacing ` ` back-ticks maybe. Just word boundary.
                const regex = new RegExp(`(?<=[\\s"'\\\`])${key}(?=[\\s"'\\\`])`, 'g');
                const replacement = colorMap[key];

                content = content.replace(regex, (match, offset, str) => {
                    // check if the replacement is already next
                    const endSearch = Math.min(str.length, offset + 100);
                    const vicinity = str.slice(offset, endSearch);
                    if (vicinity.includes(replacement)) {
                        return match;
                    }
                    return `${match} ${replacement}`;
                });
            }

            if (originalContent !== content) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

// Let's run it on components and app
processDir('c:/Users/Paulo/Desktop/Estudos/Smart-Delivery/smart_menu/app');
processDir('c:/Users/Paulo/Desktop/Estudos/Smart-Delivery/smart_menu/components');
