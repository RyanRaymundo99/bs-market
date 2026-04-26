
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const stack = [];
let i = 0;
while (i < content.length) {
    if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
        const quote = content[i];
        i++;
        while (i < content.length && content[i] !== quote) {
            if (content[i] === '\\') i++;
            i++;
        }
        i++;
    } else if (content.startsWith('<!--', i)) {
        i = content.indexOf('-->', i) + 3;
    } else if (content.startsWith('<', i)) {
        if (content.startsWith('</', i)) {
            const end = content.indexOf('>', i);
            let tagName = content.slice(i + 2, end).trim();
            if (tagName === '') tagName = 'fragment';
            const last = stack.pop();
            if (!last || last.tag !== tagName) {
                 console.log(`Mismatch at line ${content.slice(0, i).split('\n').length}: found </${tagName}> but last was <${last?.tag}>`);
            }
            i = end + 1;
        } else {
            const end = content.indexOf('>', i);
            let tagContent = content.slice(i + 1, end).trim();
            if (tagContent.endsWith('/')) {
                i = end + 1;
                continue;
            }
            let tagName = tagContent.split(/\s/)[0];
            if (tagName === '') tagName = 'fragment';
            if (tagName && !tagName.startsWith('!')) {
                stack.push({tag: tagName, line: content.slice(0, i).split('\n').length});
            }
            i = end + 1;
        }
    } else {
        i++;
    }
}

console.log('Remaining on stack:', stack.filter(s => s.line > 1700));
