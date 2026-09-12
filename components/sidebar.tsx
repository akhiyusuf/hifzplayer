"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountEntry } from "./account-entry";
import { Icon } from "./icon";
import { APP_NAME, PLUS_NAME } from "@/lib/brand";

const ITEMS = [
  { href: "/", label: "Read", icon: "book-open", match: (p: string) => p === "/" || p.startsWith("/read") },
  { href: "/listen", label: "Listen", icon: "headphones", match: (p: string) => p === "/listen" },
  { href: "/settings", label: "Settings", icon: "settings", match: (p: string) => p.startsWith("/settings") },
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
          <b>{APP_NAME}</b>
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
      <div className="as-foot">
        <Link href="/pricing">{PLUS_NAME}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy">Privacy</Link>
        <p>Quran content is always free to access</p>
      </div>
    </nav>
  );
}
