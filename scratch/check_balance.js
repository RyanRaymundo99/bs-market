
import fs from 'fs';

const content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
    }
    if (braceCount < 0 || parenCount < 0) {
        console.log(`Imbalance at line ${i + 1}: Braces=${braceCount}, Parens=${parenCount}`);
        // Reset to avoid noise? No, let's see where it first goes negative.
    }
}

console.log(`Final counts: Braces=${braceCount}, Parens=${parenCount}`);
