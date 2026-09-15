"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { KEYS } from "@/lib/constants";
import { focusPassageHref, isFocusReadQuery } from "@/lib/nav";
import { listSessions } from "@/lib/sessions";
import { getStore } from "@/lib/storage";

type TabId = "read" | "focus" | "listen" | "settings";

function focusHrefFromSessions() {
  const last = listSessions()[0];
  if (!last) return focusPassageHref(undefined, { back: "home" });
  return focusPassageHref(
    { chapter: last.chapter, from: last.from, to: last.to },
    { back: "home" },
  );
}

function readingIsFocus(path: string, search: string) {
  if (!path.startsWith("/read")) return false;
  if (isFocusReadQuery(search)) return true;
  return getStore<string>(KEYS.style) === "focus";
}

function activeTab(path: string, search: string): TabId | null {
  if (path.startsWith("/listen")) return "listen";
  if (path.startsWith("/settings") || path.startsWith("/account") || path.startsWith("/pricing")) {
    return "settings";
  }
  if (path.startsWith("/read")) {
    return readingIsFocus(path, search) ? "focus" : "read";
  }
  if (path === "/" || path.startsWith("/roadmap")) return "read";
  return null;
}

function shouldHide(path: string) {
  return (
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/privacy") ||
    path.startsWith("/credits")
  );
}

export function MobileTabBar() {
  const path = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";
  const [focusHref, setFocusHref] = useState(() => focusPassageHref(undefined, { back: "home" }));
  const [on, setOn] = useState<TabId | null>(() => activeTab(path, search));

  useEffect(() => {
    setFocusHref(focusHrefFromSessions());
    setOn(activeTab(path, search));
  }, [path, search]);

  if (shouldHide(path) || !on) return null;

  const tabs: { id: TabId; href: string; label: string; icon: string }[] = [
    { id: "read", href: "/", label: "Read", icon: "book-open" },
    { id: "focus", href: focusHref, label: "Focus", icon: "brackets" },
    { id: "listen", href: "/listen", label: "Listen", icon: "headphones" },
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
