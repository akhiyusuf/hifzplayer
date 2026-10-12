"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountEntry } from "./account-entry";
import { BrandLogo } from "./brand-logo";
import { Icon } from "./icon";
import { PLUS_NAME } from "@/lib/brand";
import { plusOnLabel } from "@/lib/plus-presence";
import { usePlus } from "@/lib/plus";

const ITEMS = [
  { href: "/home", label: "Menu", icon: "book-open", match: (p: string) => p === "/home" || p.startsWith("/roadmap") },
  { href: "/practice", label: "Practice", icon: "biceps-flexed", match: (p: string) => p.startsWith("/practice") },
  { href: "/listen", label: "Playlists", icon: "list", match: (p: string) => p === "/listen" },
  { href: "/settings", label: "Settings", icon: "settings", match: (p: string) => p.startsWith("/settings") },
];

export function AppSidebar() {
  const path = usePathname() || "/";
  const { plus } = usePlus();
  return (
    <nav className="app-sidebar" aria-label="Main">
      <Link href="/home" className="as-brand" aria-label="Diras home">
        <BrandLogo variant="lockup" height={28} />
      </Link>
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
        <Link href={plus ? "/settings" : "/pricing"}>{plus ? plusOnLabel() : PLUS_NAME}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/roadmap">What&apos;s coming</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/tos">Terms</Link>
        <p>Quran content is always free to access</p>
      </div>
    </nav>
  );
}
