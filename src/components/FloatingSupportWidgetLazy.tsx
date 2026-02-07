"use client";

import dynamic from "next/dynamic";

export const FloatingSupportWidgetLazy = dynamic(
  () =>
    import("@/components/FloatingSupportWidget").then((m) => ({
      default: m.FloatingSupportWidget,
    })),
  { ssr: false }
);
