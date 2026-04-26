
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const stack = [];
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') {
        stack.push({char: '{', pos: i, line: content.slice(0, i).split('\n').length});
    } else if (char === '}') {
        const last = stack.pop();
        if (!last || last.char !== '{') {
            console.log(`Mismatch: found } but last was ${last?.char} at line ${content.slice(0, i).split('\n').length}`);
        }
    } else if (char === '(') {
        stack.push({char: '(', pos: i, line: content.slice(0, i).split('\n').length});
    } else if (char === ')') {
        const last = stack.pop();
        if (!last || last.char !== '(') {
            console.log(`Mismatch: found ) but last was ${last?.char} at line ${content.slice(0, i).split('\n').length}`);
        }
    }
}

console.log('Final stack count:', stack.length);
if (stack.length > 0) {
    console.log('Remaining on stack (top 10):', stack.slice(-10));
}
