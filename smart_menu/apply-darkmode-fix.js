const fs = require('fs');
const path = require('path');

const colorMap = {
    'dark:text-gray-500': 'dark:text-gray-300',
    'dark:text-gray-400': 'dark:text-gray-200',
    'dark:text-gray-300': 'dark:text-gray-100',
    'dark:text-gray-200': 'dark:text-white',
    'dark:text-gray-100': 'dark:text-white',
    'dark:text-gray-600': 'dark:text-gray-400',
    'dark:bg-gray-900': 'dark:bg-gray-800',
    'dark:bg-gray-950': 'dark:bg-gray-900',
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

            for (const [key, value] of Object.entries(colorMap)) {
                content = content.split(key).join(value);
            }

            if (originalContent !== content) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDir('c:/Users/Paulo/Desktop/Estudos/Smart-Delivery/smart_menu/app');
processDir('c:/Users/Paulo/Desktop/Estudos/Smart-Delivery/smart_menu/components');
