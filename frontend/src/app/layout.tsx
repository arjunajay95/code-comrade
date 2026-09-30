import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  // Pages set their own title, and it appears as "Sign in | CodeComrade".
  title: { default: "CodeComrade", template: "%s | CodeComrade" },
  description:
    "Post your code for review, review other developers' code, and earn karma for every review you write.",
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
          "font-mono",
        )}
      >
        <body className="min-h-full flex flex-col">
          <Providers>
            <SiteHeader />
            <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
              {children}
            </main>
            <SiteFooter />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
