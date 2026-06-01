import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans } from "next/font/google";
import { Toaster } from "@/components/shared/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { NextAuthSessionProvider } from "@/components/shared/auth/session-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSansHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-heading"
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TIQRI Assets",
  description: "The asset management application for TIQRI corporation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistMono.variable, notoSansHeading.variable, "font-sans", notoSans.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthSessionProvider>
            {children}
          </NextAuthSessionProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
