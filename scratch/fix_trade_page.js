
import fs from 'fs';

const filePath = 'src/app/trade/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const insertionPoint = '      {/* Mobile Page Indicator - Bottom Navigation */}';
const receiptModal = `
      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="bg-transparent border-none p-0 max-w-md shadow-none outline-none ring-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Recibo da Transação</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <TransactionReceipt 
              transaction={{
                id: receiptData.transactionId,
                amount: receiptData.amount,
                usdtAmount: receiptData.usdtAmount,
                date: receiptData.date,
                status: transactionHistory.find(t => t.id === receiptData.transactionId)?.status || "PENDING",
                type: receiptData.type,
                network: cryptoNetwork,
                address: cryptoAddress
              }}
              onClose={() => setShowReceipt(false)}
              language={language}
            />
          )}
        </DialogContent>
      </Dialog>
`;

const index = lines.findIndex(line => line.includes(insertionPoint));
if (index !== -1) {
    lines.splice(index, 0, receiptModal);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Restored Receipt modal in trade/page.tsx');
} else {
    console.log('Could not find insertion point');
}
