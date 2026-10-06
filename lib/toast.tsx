"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Tone = "info" | "success" | "error";
type Toast = { msg: string; tone: Tone; id: number };

const ToastContext = createContext({ showToast: (_msg: string, _tone?: Tone) => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, tone: Tone = "info") => {
    setToast({ msg, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="toast-region"
        role="status"
        aria-live={toast?.tone === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {toast ? (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            {toast.msg}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
