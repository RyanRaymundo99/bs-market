"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSDTAmount } from "@/lib/format-currency";

export interface ChartDataPoint {
  date: string;
  BRL: number;
  USDT: number;
  timestamp: number;
}

type ChartRange = "7d" | "30d" | "90d" | "all";

function ChartTooltipBody({
  active,
  payload,
  language,
  t,
  onHighlight,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  language: "pt" | "en";
  t: (key: string) => string;
  onHighlight: (point: ChartDataPoint | null) => void;
}) {
  const point = payload?.[0]?.payload;

  useEffect(() => {
    if (active && point) {
      onHighlight(point);
    } else if (!active) {
      onHighlight(null);
    }
  }, [active, point, onHighlight]);

  const formatAmount = (value: number) => formatUSDTAmount(value, language);

  if (!active || !point) {
    return null;
  }

  const dateLine = new Date(point.timestamp).toLocaleDateString(
    language === "pt" ? "pt-BR" : "en-US",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <div className="rounded-xl border border-primary/40 bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("date")}
      </p>
      <p className="text-sm font-semibold text-foreground">{dateLine}</p>
      <div className="mt-2 border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground">{t("balance")}</p>
        <p className="text-base font-bold text-primary">
          U$ {formatAmount(point.USDT)}
        </p>
        <p className="text-[10px] text-muted-foreground">USDT</p>
      </div>
    </div>
  );
}

export function DashboardChart({
  data,
  primaryHex,
  t,
  language,
}: {
  data: ChartDataPoint[];
  primaryHex: string;
  t: (key: string) => string;
  language: "pt" | "en";
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `areaGrad-${uid}`;
  const glowId = `lineGlow-${uid}`;

  const [range, setRange] = useState<ChartRange>("7d");
  const [highlighted, setHighlighted] = useState<ChartDataPoint | null>(null);

  const onHighlight = useCallback((p: ChartDataPoint | null) => {
    setHighlighted(p);
  }, []);

  const sliced = useMemo(() => {
    if (!data.length) return [];
    if (range === "all") return data;
    const n = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    return data.slice(-Math.min(n, data.length));
  }, [data, range]);

  useEffect(() => {
    setHighlighted(null);
  }, [range, data]);

  const displayPoint =
    highlighted ?? (sliced.length ? sliced[sliced.length - 1] : null);

  const formatAmount = (value: number) => formatUSDTAmount(value, language);

  const formatTick = useCallback(
    (dayId: string) => {
      const parts = dayId.split("-").map(Number);
      const y = parts[0];
      const m = parts[1];
      const d = parts[2];
      if (!y || !m || !d) return dayId;
      const dt = new Date(y, m - 1, d);
      const opts: Intl.DateTimeFormatOptions =
        sliced.length > 120
          ? { month: "short", day: "numeric", year: "2-digit" }
          : { month: "short", day: "numeric" };
      return dt.toLocaleDateString(
        language === "pt" ? "pt-BR" : "en-US",
        opts
      );
    },
    [language, sliced.length]
  );

  const firstVal = sliced[0]?.USDT ?? 0;
  const displayVal = displayPoint?.USDT ?? 0;
  const change = displayVal - firstVal;
  const changePercent =
    firstVal > 0 ? ((change / firstVal) * 100).toFixed(1) : "0";
  const isPositive = change >= 0;

  const yDomain = useMemo((): [number, number] => {
    const vals = sliced.map((d) => d.USDT);
    if (!vals.length) return [0, 1];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (hi <= 0) return [0, 1];
    if (lo === hi) {
      const base = Math.max(lo, 0.01);
      return [Math.max(0, base * 0.92), base * 1.08];
    }
    const pad = (hi - lo) * 0.12;
    return [Math.max(0, lo - pad), hi + pad];
  }, [sliced]);

  const ranges: { id: ChartRange; labelKey: string }[] = [
    { id: "7d", labelKey: "chartRange7d" },
    { id: "30d", labelKey: "chartRange30d" },
    { id: "90d", labelKey: "chartRange90d" },
    { id: "all", labelKey: "chartRangeAll" },
  ];

  if (!data.length) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {t("balanceEvolution")}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("balanceChartSubtitle")}
          </p>
        </div>
        <div
          className="flex shrink-0 flex-wrap gap-1 rounded-xl border border-border/80 bg-muted/30 p-1"
          role="tablist"
          aria-label={t("balanceEvolution")}
        >
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                range === r.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-64 w-full sm:h-80">
        <div className="absolute right-2 top-2 z-10 max-w-[160px] rounded-xl border border-primary/30 bg-card/90 px-2.5 py-2 shadow-xl backdrop-blur-sm md:hidden">
          <div className="text-[10px] text-muted-foreground">{t("balance")}</div>
          <div className="text-sm font-bold text-primary">
            U$ {displayPoint ? formatAmount(displayPoint.USDT) : "—"}
          </div>
          {sliced.length >= 2 && displayPoint && (
            <div className="mt-1 flex items-center gap-1 border-t border-border pt-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-primary" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isPositive ? "text-primary" : "text-destructive"
                )}
              >
                {isPositive ? "+" : ""}
                {changePercent}%{" "}
                <span className="font-normal text-muted-foreground">
                  {t("chartChangePeriod")}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="absolute left-3 top-3 z-10 hidden min-w-[150px] rounded-xl border border-primary/30 bg-card/90 p-3 shadow-xl backdrop-blur-sm md:block">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              {t("date")}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {displayPoint
                ? new Date(displayPoint.timestamp).toLocaleDateString(
                    language === "pt" ? "pt-BR" : "en-US",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )
                : "—"}
            </div>
            <div className="border-t border-border pt-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {t("balance")}
              </div>
              <div className="text-base font-bold text-primary">
                U${" "}
                {displayPoint ? formatAmount(displayPoint.USDT) : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">USDT</div>
            </div>
            {sliced.length >= 2 && displayPoint && (
              <div className="border-t border-border pt-2">
                <div className="flex items-center gap-1.5">
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isPositive ? "text-primary" : "text-destructive"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {changePercent}%{" "}
                    <span className="font-normal text-muted-foreground">
                      {t("chartChangePeriod")}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sliced}
            margin={{ top: 16, right: 8, left: 4, bottom: 8 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryHex} stopOpacity={0.45} />
                <stop offset="45%" stopColor={primaryHex} stopOpacity={0.18} />
                <stop offset="100%" stopColor={primaryHex} stopOpacity={0} />
              </linearGradient>
              <filter
                id={glowId}
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="hsl(var(--border))"
              vertical={false}
              opacity={0.6}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatTick}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={yDomain}
              width={52}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(v)
              }
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
            />
            <Tooltip
              cursor={{
                stroke: primaryHex,
                strokeWidth: 1,
                strokeDasharray: "4 4",
                opacity: 0.85,
              }}
              content={(props) => (
                <ChartTooltipBody
                  {...props}
                  language={language}
                  t={t}
                  onHighlight={onHighlight}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="USDT"
              stroke={primaryHex}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              filter={`url(#${glowId})`}
              dot={false}
              activeDot={{
                r: 6,
                fill: primaryHex,
                strokeWidth: 2,
                stroke: "hsl(var(--background))",
              }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
