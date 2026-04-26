
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const divCount = (content.match(/<div/g) || []).length;
const divCloseCount = (content.match(/<\/div>/g) || []).length;
const fragmentCount = (content.match(/<>/g) || []).length;
const fragmentCloseCount = (content.match(/<\/>/g) || []).length;

console.log(`<div>: ${divCount}, </div>: ${divCloseCount}`);
console.log(`<>: ${fragmentCount}, </>: ${fragmentCloseCount}`);

// Find the line that is causing the error
const lines = content.split('\n');
console.log('Last 10 lines:');
console.log(lines.slice(-15).join('\n'));
