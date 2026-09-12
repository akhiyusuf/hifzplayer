import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Bricolage_Grotesque, Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppDataProvider } from "@/lib/app-data";
import { PlusProvider } from "@/lib/plus";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { AuthRoot } from "@/components/auth-root";
import { AppSidebar } from "@/components/sidebar";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display-loaded",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-loaded",
  display: "swap",
});
const numeral = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-numeral-loaded",
  display: "swap",
});
const arabic = Amiri_Quran({
  subsets: ["arabic", "latin"],
  weight: "400",
  variable: "--font-arabic-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "A mobile-first Quran reading and memorisation player with word-level audio timing, tajweed colouring, masked recall and relay practice.",
  appleWebApp: { capable: true, title: APP_NAME },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1712" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-palette="orange"
      className={`${display.variable} ${body.variable} ${numeral.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ThemeProvider>
          <ToastProvider>
            <AuthRoot>
              <PlusProvider>
                <AppDataProvider>
                  <AppSidebar />
                  {children}
                  <Analytics />
                </AppDataProvider>
              </PlusProvider>
            </AuthRoot>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
