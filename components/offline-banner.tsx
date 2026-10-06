"use client";

import { useAppData } from "@/lib/app-data";
import { Icon } from "./icon";

export function OfflineBanner() {
  const { online } = useAppData();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <Icon name="cloud-off" size={16} style={{ color: "var(--state-warning)", flex: "none" }} />
      <span>You’re offline — showing cached text</span>
    </div>
  );
}
