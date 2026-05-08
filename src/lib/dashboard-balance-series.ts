/**
 * Build daily USDT balance points for the dashboard chart from ledger transactions.
 */

export interface BalanceChartTx {
  type: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface BalanceChartPoint {
  date: string;
  BRL: number;
  USDT: number;
  timestamp: number;
}

function affectsUsdtLedger(t: BalanceChartTx): boolean {
  return t.currency === "USDT" || !t.currency;
}

function isUsdtCredit(type: string): boolean {
  return (
    type === "DEPOSIT" ||
    type === "BUY_CRYPTO" ||
    type === "REFUND"
  );
}

function isUsdtDebit(type: string): boolean {
  return (
    type === "WITHDRAWAL" ||
    type === "WITHDRAW" ||
    type === "SELL" ||
    type === "SELL_CRYPTO" ||
    type === "FEE"
  );
}

function formatDayIdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getUsdtChartDaySpan(
  transactions: BalanceChartTx[],
  maxDays = 365,
  minDays = 7
): number {
  const relevant = transactions.filter(affectsUsdtLedger);
  if (relevant.length === 0) return minDays;
  const oldest = Math.min(
    ...relevant.map((t) => new Date(t.createdAt).getTime())
  );
  const msPerDay = 86400000;
  const days = Math.ceil((Date.now() - oldest) / msPerDay) + 1;
  return Math.min(maxDays, Math.max(minDays, days));
}

export function buildUsdtBalanceSeries(
  transactions: BalanceChartTx[],
  currentUsdtBalance: number,
  endDate: Date,
  dayCount: number
): BalanceChartPoint[] {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));
  start.setHours(0, 0, 0, 0);

  const relevant = transactions.filter((t) => {
    if (!affectsUsdtLedger(t)) return false;
    const d = new Date(t.createdAt);
    return d >= start && d <= end;
  });

  let balanceBeforeWindow = currentUsdtBalance;
  relevant.forEach((t) => {
    const amt = Number(t.amount);
    if (isUsdtCredit(t.type)) {
      balanceBeforeWindow -= amt;
    } else if (isUsdtDebit(t.type)) {
      balanceBeforeWindow += amt;
    }
  });
  balanceBeforeWindow = Math.max(0, balanceBeforeWindow);

  const byDay: Record<string, BalanceChartTx[]> = {};
  relevant.forEach((t) => {
    const key = formatDayIdLocal(new Date(t.createdAt));
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(t);
  });

  const result: BalanceChartPoint[] = [];
  let running = balanceBeforeWindow;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dayId = formatDayIdLocal(d);

    if (byDay[dayId]) {
      byDay[dayId].forEach((t) => {
        const amt = Number(t.amount);
        if (isUsdtCredit(t.type)) running += amt;
        else if (isUsdtDebit(t.type)) running -= amt;
      });
    }

    if (i === dayCount - 1) {
      running = currentUsdtBalance;
    }

    const noon = new Date(d);
    noon.setHours(12, 0, 0, 0);

    result.push({
      date: dayId,
      BRL: 0,
      USDT: Math.max(0, running),
      timestamp: noon.getTime(),
    });
  }

  return result;
}