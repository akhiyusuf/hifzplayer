"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

export function Sheet({
  title,
  onClose,
  children,
  maxHeight,
  icon,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string | number;
  icon?: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>("button, [href], input, select, [tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const nodes = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      prevFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={sheetRef}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <span className="sheet-title-row">
            {icon}
            <h3>{title}</h3>
          </span>
          <button className="icon-btn borderless tap" onClick={onClose} aria-label="Close">
            <Icon name="x" size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
