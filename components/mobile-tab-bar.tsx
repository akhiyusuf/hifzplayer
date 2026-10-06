"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { hideMobileTabs, mobileTabId, type MobileTabId } from "@/lib/tabs";

export function MobileTabBar() {
  const path = usePathname() || "/";
  if (hideMobileTabs(path)) return null;
  const on = mobileTabId(path);
  if (!on) return null;

  const tabs: { id: MobileTabId; href: string; label: string; icon: string }[] = [
    { id: "menu", href: "/home", label: "Menu", icon: "book-open" },
    { id: "practice", href: "/practice", label: "Practice", icon: "brackets" },
    { id: "playlists", href: "/listen", label: "Playlists", icon: "list" },
    { id: "settings", href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <nav className="mobile-tab-bar" aria-label="Main">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`mobile-tab${on === tab.id ? " on" : ""}`}
          aria-current={on === tab.id ? "page" : undefined}
        >
          <Icon name={tab.icon} size={20} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
