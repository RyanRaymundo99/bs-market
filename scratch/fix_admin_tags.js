
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// 1. Ensure fragment at 1710
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return (') && i > 1700) {
        lines[i+1] = '    <>';
        break;
    }
}

// 2. Find export default function AdminDashboard()
let lastLineIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('export default function AdminDashboard()')) {
        lastLineIndex = i;
        break;
    }
}

if (lastLineIndex !== -1) {
    let beforeLines = lines.slice(0, lastLineIndex);
    while (beforeLines.length > 0 && beforeLines[beforeLines.length - 1].trim() === '') {
        beforeLines.pop();
    }
    
    // Set to 2 Dialog closures and 3 Div closures and 1 fragment closure
    const newEnd = [
        '          </DialogContent>',
        '        </Dialog>',
        '      </div>',
        '    </div>',
        '  </div>',
        '    </>',
        '  );',
        '}',
        ''
    ];
    
    const correctedLines = [
        ...beforeLines.slice(0, beforeLines.length - 6), 
        ...newEnd,
        ...lines.slice(lastLineIndex)
    ];
    
    fs.writeFileSync(filePath, correctedLines.join('\n'));
    console.log('Fixed JSX structure with 3 divs and fragment in admin/page.tsx');
}
