"use client";

import { cn } from "@/lib/utils";

const spinnerSizes = {
  sm: "h-4 w-4 border-2",
  default: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

/** Inline spinner – use in buttons, tables, or small areas. */
export function Spinner({
  size = "default",
  className,
}: {
  size?: keyof typeof spinnerSizes;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-full border-primary border-t-transparent animate-spin",
        spinnerSizes[size],
        className
      )}
    />
  );
}

/** Loading state for buttons: spinner + optional label. Use className="text-primary-foreground" when inside a primary Button. */
export function ButtonLoader({
  label = "Loading...",
  size = "sm",
  className,
}: {
  label?: string;
  size?: keyof typeof spinnerSizes;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)}>
      <span
        className={cn(
          "rounded-full border-2 border-current border-t-transparent animate-spin",
          spinnerSizes[size]
        )}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}

/** Full-page loader – use while a page or major section is loading. */
export function PageLoader({
  message,
  className,
  showSpinner = true,
}: {
  message?: string;
  className?: string;
  showSpinner?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 min-h-[12rem]",
        className
      )}
    >
      {showSpinner && <Spinner size="lg" />}
      {message && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
}

/** Skeleton pulse bar – for placeholder content. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-md bg-muted animate-pulse", className)}
      aria-hidden
    />
  );
}
