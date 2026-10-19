import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SITE_URL } from "@/lib/config";
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

const DESCRIPTION =
  "Post your code for review, review other developers' code, and earn karma for every review you write.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set their own title, and it appears as "Sign in | CodeComrade".
  title: { default: "CodeComrade", template: "%s | CodeComrade" },
  description: DESCRIPTION,
  // The share image comes from opengraph-image.png by file convention.
  openGraph: {
    type: "website",
    siteName: "CodeComrade",
    description: DESCRIPTION,
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
        // Clerk colors links with the primary token, which is tuned for button fills and is too dark to read as text on a dark card.
        // The addition green is the readable one
        elements: { footerActionLink: "text-addition hover:text-addition" },
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
            {/* Each page sets its own width through Container (D-40). */}
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <StackPickerHost />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
