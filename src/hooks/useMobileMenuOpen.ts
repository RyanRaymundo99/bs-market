"use client";

import { useState, useEffect } from "react";

const BODY_CLASS = "mobile-menu-open";
const EVENT_NAME = "mobilemenuchange";

export function useMobileMenuOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ open: boolean }>;
      setOpen(Boolean(customEvent.detail?.open));
    };

    setOpen(document.body.classList.contains(BODY_CLASS));
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  return open;
}

export function syncMobileMenuToBody(open: boolean): void {
  if (open) {
    document.body.classList.add(BODY_CLASS);
  } else {
    document.body.classList.remove(BODY_CLASS);
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { open } }));
}
