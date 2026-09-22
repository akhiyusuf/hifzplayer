export type MobileTabId = "menu" | "practice" | "playlists" | "settings";

export function mobileTabId(path: string): MobileTabId | null {
  if (path.startsWith("/practice")) return "practice";
  if (path.startsWith("/listen")) return "playlists";
  if (path.startsWith("/settings") || path.startsWith("/account") || path.startsWith("/pricing")) {
    return "settings";
  }
  if (path === "/home" || path.startsWith("/roadmap")) return "menu";
  return null;
}

/** Hide on marketing landing, auth/legal, and while a surah is open. */
export function hideMobileTabs(path: string) {
  if (path === "/" || path.startsWith("/read")) return true;
  return (
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/privacy") ||
    path.startsWith("/credits")
  );
}
