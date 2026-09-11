export function clerkPublishableKey() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
}

export function clerkSecretKey() {
  return process.env.CLERK_SECRET_KEY || "";
}

/** Both keys must be present before we treat accounts as live. */
export function clerkConfigured() {
  return Boolean(clerkPublishableKey() && clerkSecretKey());
}

export function clerkBrowserReady() {
  return Boolean(clerkPublishableKey());
}
