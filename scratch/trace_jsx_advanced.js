
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Find all <TagName and </TagName>
    // This is a rough regex but should work for div, section, Dialog, etc.
    const tags = line.match(/<(div|section|Dialog|Card|main|Suspense|h1|p|Button|Badge|Input|CardContent|DropdownMenu|DropdownMenuTrigger|DropdownMenuContent|DropdownMenuLabel|SelectItem|Select|SelectContent|SelectTrigger|SelectValue|Textarea|Checkbox|label|HistoryTooltipContent|CustomTooltip|TransactionDetailsDialog)|<\/(div|section|Dialog|Card|main|Suspense|h1|p|Button|Badge|Input|CardContent|DropdownMenu|DropdownMenuTrigger|DropdownMenuContent|DropdownMenuLabel|SelectItem|Select|SelectContent|SelectTrigger|SelectValue|Textarea|Checkbox|label|HistoryTooltipContent|CustomTooltip|TransactionDetailsDialog)|<>/g);
    
    if (tags) {
        for (const tag of tags) {
            if (tag.startsWith('</')) {
                const closeTag = tag.slice(2);
                const last = stack.pop();
                if (!last || last.tag !== closeTag) {
                    // console.log(`Mismatch at line ${i+1}: found </${closeTag}> but last was <${last?.tag}>`);
                    // We'll ignore mismatches for now as my list might be incomplete
                    // But we'll track the balance of div
                    if (closeTag === 'div' && last?.tag !== 'div') {
                        // console.log(`Div mismatch at line ${i+1}`);
                    }
                }
            } else if (tag === '<>') {
                stack.push({tag: 'fragment', line: i+1});
            } else if (tag === '</>') {
                stack.pop();
            } else {
                const openTag = tag.slice(1);
                stack.push({tag: openTag, line: i+1});
            }
        }
    }
}

console.log('Remaining on stack:', stack.filter(s => s.line > 1700));
