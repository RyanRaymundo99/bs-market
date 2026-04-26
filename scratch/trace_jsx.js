
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return (') && i > 1700) {
        startLine = i;
    }
    if (startLine !== -1 && lines[i].includes('export default function AdminDashboard()')) {
        endLine = i;
        break;
    }
}

if (startLine !== -1 && endLine !== -1) {
    const jsx = lines.slice(startLine, endLine).join('\n');
    const stack = [];
    
    // Find all <div, </div>, <>, </>
    // Use a loop to find them in order
    let pos = 0;
    while (pos < jsx.length) {
        if (jsx.startsWith('<div', pos)) {
            stack.push({tag: '<div>', line: startLine + jsx.slice(0, pos).split('\n').length});
            pos += 4;
        } else if (jsx.startsWith('</div>', pos)) {
            const last = stack.pop();
            if (!last || last.tag !== '<div>') {
                console.log(`Mismatch at line ${startLine + jsx.slice(0, pos).split('\n').length}: found </div> but last was ${last?.tag}`);
            }
            pos += 6;
        } else if (jsx.startsWith('<>', pos)) {
            stack.push({tag: '<>', line: startLine + jsx.slice(0, pos).split('\n').length});
            pos += 2;
        } else if (jsx.startsWith('</>', pos)) {
            const last = stack.pop();
            if (!last || last.tag !== '<>') {
                console.log(`Mismatch at line ${startLine + jsx.slice(0, pos).split('\n').length}: found </> but last was ${last?.tag}`);
            }
            pos += 3;
        } else {
            pos++;
        }
    }
    
    console.log('Remaining on stack:', stack);
}
