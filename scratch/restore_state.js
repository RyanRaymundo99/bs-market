
import fs from 'fs';

const filePath = 'src/app/admin/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const insertionPoint = 'const { toast } = useToast();';
const newState = `  const [transactionDetails, setTransactionDetails] = useState<Transaction | null>(null);
  const [rejectingTransaction, setRejectingTransaction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showConfirmPaymentDialog, setShowConfirmPaymentDialog] = useState(false);
  const [paymentConfirmationHash, setPaymentConfirmationHash] = useState("");
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [resendingReceipt, setResendingReceipt] = useState(false);

`;

if (content.includes(insertionPoint)) {
    content = content.replace(insertionPoint, newState + insertionPoint);
    fs.writeFileSync(filePath, content);
    console.log('Restored missing state in admin/page.tsx');
} else {
    console.log('Could not find insertion point');
}
