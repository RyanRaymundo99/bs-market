
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const startTag = '        {/* Transaction Details Dialog */}';
const endTag = '        {/* Recent Activity Summary */}';

let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(startTag)) {
        startLine = i;
    }
    if (startLine !== -1 && lines[i].includes(endTag)) {
        endLine = i;
        break;
    }
}

if (startLine !== -1 && endLine !== -1) {
    const newDialog = `        <TransactionDetailsDialog
          transactionDetails={transactionDetails}
          onClose={() => setTransactionDetails(null)}
          markingCompleted={markingCompleted}
          rejectingTransaction={rejectingTransaction}
          handleMarkAsCompleted={handleMarkAsCompleted}
          setShowRejectionDialog={setShowRejectionDialog}
          handleSyncStatus={handleSyncStatus}
          syncingStatus={syncingStatus}
          resendingReceipt={resendingReceipt}
          handleResendReceipt={handleResendReceipt}
          language={language}
        />`;
    
    // Replace lines from startLine to endLine (exclusive of endLine)
    const newLines = [
        ...lines.slice(0, startLine),
        newDialog,
        ...lines.slice(endLine)
    ];
    
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`Successfully replaced lines ${startLine + 1} to ${endLine} with TransactionDetailsDialog`);
} else {
    console.log(`Could not find markers: startLine=${startLine}, endLine=${endLine}`);
}
