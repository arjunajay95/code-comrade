import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { StackPickerHost } from "@/components/stack/StackPickerHost";

// Three families (D-40). Only Geist is preloaded, since it sets the interface
// and body text. The other two load when a page uses them.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set their own title, and it appears as "Sign in | CodeComrade".
  title: { default: "CodeComrade", template: "%s | CodeComrade" },
  description: SITE_DESCRIPTION,
  // The share image comes from opengraph-image.png by file convention.
  openGraph: {
    type: "website",
    siteName: "CodeComrade",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The shadcn theme makes Clerk's screens read the app's CSS variables, so
    // sign-in matches the rest of the app in both dark and light mode.
    <ClerkProvider
      appearance={{
        theme: shadcn,
        // Puts Clerk's styles in a named CSS layer. globals.css declares that
        // layer before Tailwind's utilities, so classes like text-addition
        // below win over Clerk's own colors.
        cssLayerName: "clerk",
      }}
    >
      {/* suppressHydrationWarning: next-themes sets the theme class on <html>
          before React loads, so React would otherwise warn that the server
          and browser HTML differ. It silences that one element only. */}
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(
          "h-full",
          "antialiased",
          geistSans.variable,
          jetbrainsMono.variable,
          instrumentSerif.variable,
        )}
      >
        <body className="min-h-full flex flex-col">
          <Providers>
            <SiteHeader />
            {/* Each page sets its own width through Container (D-40). The
                minimum height is the screen below the header, so a page that
                fills in after loading never pulls the footer up into view and
                then pushes it back down (D-36). A page whose content is short
                and known opts out with a short Container. */}
            <main className="min-h-[calc(100svh-3.5rem)] flex-1 has-[[data-short-page]]:min-h-0">
              {children}
            </main>
            <SiteFooter />
            <StackPickerHost />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
