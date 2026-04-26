
import fs from 'fs';

const filePath = 'src/app/trade/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove helpers moved to trade-utils
content = content.replace(/const getWhatsAppUrlForLargeDeposit = \([\s\S]*?\};/g, '');
content = content.replace(/const formatBRL = \(value: number\) => \{[\s\S]*?\};/g, '');
content = content.replace(/const formatUSDT = \(value: number\) => \{[\s\S]*?\};/g, '');

// 2. Add imports
if (!content.includes('import { PixPaymentDialog }')) {
    content = content.replace('import { TransactionReceipt } from "@/components/TransactionReceipt";', 
        'import { TransactionReceipt } from "@/components/TransactionReceipt";\nimport { PixPaymentDialog } from "@/components/trade/PixPaymentDialog";');
}

// 3. Update trade-utils import to include new helpers
content = content.replace('import { formatUSDTInput, parseUSDTInput } from "../../lib/trade-utils";',
    'import { formatUSDTInput, parseUSDTInput, formatBRL, formatUSDT, getWhatsAppUrlForLargeDeposit } from "../../lib/trade-utils";');

// 4. Replace PIX Modal using multi-line detection
const lines = content.split('\n');
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<Dialog') && lines[i+1] && lines[i+1].includes('open={showPixModal}')) {
        startLine = i;
    }
    if (startLine !== -1 && lines[i].includes('</Dialog>')) {
        endLine = i;
        break;
    }
}

if (startLine !== -1 && endLine !== -1) {
    const newDialog = `      <PixPaymentDialog
        open={showPixModal}
        onOpenChange={(open) => {
          setShowPixModal(open);
          if (!open && pixData) {
            // Check if there are still pending transactions that need loading states
            setLoadingTransactions((prev) => {
              const newSet = new Set(prev);
              newSet.add(pixData.transactionId);
              // Small delay to allow polling to catch up
              setTimeout(() => {
                setLoadingTransactions((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(pixData.transactionId);
                  return newSet;
                });
                fetchTransactionHistory();
              }, 8000);
              return newSet;
            });
          }
        }}
        pixData={pixData}
        copied={copied}
        copyPixCode={copyPixCode}
        language={language}
        handleSimulatePixPayment={handleSimulatePixPayment}
        isSimulating={isSimulating}
      />`;
    
    const newLines = [
        ...lines.slice(0, startLine),
        newDialog,
        ...lines.slice(endLine + 1)
    ];
    
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`Successfully replaced PIX Modal in trade/page.tsx at lines ${startLine + 1} to ${endLine + 1}`);
} else {
    fs.writeFileSync(filePath, content);
    console.log(`Markers not found for PIX Modal, but helpers removed and imports added.`);
}
