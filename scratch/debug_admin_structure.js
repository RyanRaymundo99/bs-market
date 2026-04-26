
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const stack = [];
let i = 0;
while (i < content.length) {
    if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
        const quote = content[i];
        i++;
        while (i < content.length && (content[i] !== quote || content[i-1] === '\\')) {
            i++;
        }
        i++;
    } else if (content.startsWith('//', i)) {
        i = content.indexOf('\n', i) + 1;
    } else if (content.startsWith('/*', i)) {
        i = content.indexOf('*/', i) + 2;
    } else if (content.startsWith('{', i)) {
        stack.push({type: 'brace', line: content.slice(0, i).split('\n').length});
        i++;
    } else if (content.startsWith('}', i)) {
        const last = stack.pop();
        if (!last || last.type !== 'brace') {
            console.log(`Unmatched } at line ${content.slice(0, i).split('\n').length}`);
        }
        i++;
    } else if (content.startsWith('<', i)) {
        if (content.startsWith('</', i)) {
            const end = content.indexOf('>', i);
            const tagName = content.slice(i + 2, end).trim();
            const last = stack.pop();
            // Simple tag check (ignoring some details)
            i = end + 1;
        } else {
            const end = content.indexOf('>', i);
            let tagContent = content.slice(i + 1, end).trim();
            if (!tagContent.endsWith('/') && !tagContent.startsWith('!')) {
                const tagName = tagContent.split(/\s/)[0];
                stack.push({type: 'tag', name: tagName, line: content.slice(0, i).split('\n').length});
            }
            i = end + 1;
        }
    } else {
        i++;
    }
}

console.log('Final stack:', stack.filter(s => s.line > 1150));
