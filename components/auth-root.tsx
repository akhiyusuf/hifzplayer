"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { clerkAppearance } from "@/lib/auth/appearance";
import { clerkBrowserReady } from "@/lib/auth/config";

export function AuthRoot({ children }: { children: ReactNode }) {
  if (!clerkBrowserReady()) return children;
  return (
    <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
