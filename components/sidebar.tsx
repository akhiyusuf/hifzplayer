"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountEntry } from "./account-entry";
import { Icon } from "./icon";

const ITEMS = [
  { href: "/", label: "Read", icon: "book-open", match: (p: string) => p === "/" || p.startsWith("/read") },
  { href: "/pricing", label: "Hifz Plus", icon: "sparkles", match: (p: string) => p.startsWith("/pricing") },
  { href: "/account", label: "Account", icon: "user", match: (p: string) => p.startsWith("/account") || p.startsWith("/sign-in") || p.startsWith("/sign-up") },
  { href: "/settings", label: "Settings", icon: "settings-2", match: (p: string) => p === "/settings" },
  { href: "/credits", label: "Data & attributions", icon: "shield-check", match: (p: string) => p === "/credits" },
  { href: "/privacy", label: "Privacy", icon: "info", match: (p: string) => p === "/privacy" },
];

export function AppSidebar() {
  const path = usePathname() || "/";
  return (
    <nav className="app-sidebar" aria-label="Main">
      <div className="as-brand">
        <span className="as-mark">
          <Icon name="book-open" size={19} />
        </span>
        <span className="as-name">
          <b>Hifz</b>
          <span>Quran study</span>
        </span>
      </div>
      <div className="as-items">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={`as-item${item.match(path) ? " on" : ""}`}>
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        ))}
      </div>
      <div className="as-account">
        <AccountEntry />
      </div>
      <span className="as-foot">Quran content is always free to access</span>
    </nav>
  );
}
