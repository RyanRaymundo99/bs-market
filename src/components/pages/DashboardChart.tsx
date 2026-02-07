"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface ChartDataPoint {
  date: string;
  BRL: number;
  USDT: number;
}

export function DashboardChart({
  data,
  primaryHex,
}: {
  data: ChartDataPoint[];
  primaryHex: string;
}) {
  if (!data.length) return null;

  const lastDataPoint = data[data.length - 1];
  const firstDataPoint = data[0];
  const change = lastDataPoint.USDT - firstDataPoint.USDT;
  const changePercent =
    firstDataPoint.USDT > 0
      ? ((change / firstDataPoint.USDT) * 100).toFixed(1)
      : "0";
  const isPositive = change >= 0;

  const formatUSDT = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  return (
    <div className="h-64 sm:h-80 w-full relative">
      <div className="md:hidden absolute top-2 right-2 z-10 bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg px-2.5 py-1.5 shadow-xl">
        <div className="text-xs text-primary font-bold">
          U$ {lastDataPoint.USDT.toFixed(2)}
        </div>
      </div>

      <div className="hidden md:block absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-3 shadow-xl min-w-[140px]">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Data</div>
          <div className="text-sm text-foreground font-semibold">
            {lastDataPoint.date}
          </div>
          <div className="border-t border-border pt-2">
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Saldo
            </div>
            <div className="text-base text-primary font-bold">
              U$ {formatUSDT(lastDataPoint.USDT).replace(" USDT", "")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">USDT</div>
          </div>
          {data.length >= 2 && (
            <div className="border-t border-border pt-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp
                  className={`w-3 h-3 ${
                    isPositive
                      ? "text-primary"
                      : "text-destructive rotate-180"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isPositive ? "text-primary" : "text-destructive"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {changePercent}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="areaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={primaryHex}
                stopOpacity={0.3}
              />
              <stop
                offset="50%"
                stopColor={primaryHex}
                stopOpacity={0.15}
              />
              <stop
                offset="100%"
                stopColor={primaryHex}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="2 2"
            stroke="#1f2937"
            vertical={false}
            horizontal={true}
          />
          <XAxis hide />
          <YAxis hide />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const value = payload[0].value as number;
                const formattedDate =
                  typeof label === "string"
                    ? label
                    : (() => {
                        if (!label) return "";
                        const date = new Date(label);
                        const day = String(date.getDate()).padStart(2, "0");
                        const month = String(date.getMonth() + 1).padStart(
                          2,
                          "0"
                        );
                        return `${day}/${month}`;
                      })();

                return (
                  <div className="bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-3 shadow-xl">
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium">
                        Data
                      </div>
                      <div className="text-sm text-foreground font-semibold">
                        {formattedDate}
                      </div>
                      <div className="border-t border-border pt-2">
                        <div className="text-xs text-muted-foreground font-medium mb-1">
                          Saldo
                        </div>
                        <div className="text-base text-primary font-bold">
                          U$ {formatUSDT(value).replace(" USDT", "")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          USDT
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="USDT"
            stroke={primaryHex}
            strokeWidth={2.5}
            fill="url(#areaGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: primaryHex,
              strokeWidth: 2,
              stroke: "#000",
            }}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
