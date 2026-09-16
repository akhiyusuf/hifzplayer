import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { clerkAppearance } from "@/lib/auth/appearance";
import { clerkBrowserReady } from "@/lib/auth/config";

/** Server ClerkProvider so post-sign-in pages get session state without a client-only wrap. */
export function AuthRoot({ children }: { children: ReactNode }) {
  if (!clerkBrowserReady()) return children;
  return (
    <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
