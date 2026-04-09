import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import PWARegister from "@/components/ui/PWARegister";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZeroCrush",
  description: "ZeroCrush operations dashboard",
  applicationName: "ZeroCrush",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZeroCrush",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.svg", type: "image/svg+xml", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background text-foreground antialiased transition-colors`}
      >
        <AuthSessionProvider>
          <PWARegister />
          <Toaster
            richColors
            expand
            closeButton
            position="top-center"
            toastOptions={{
              className: 'rounded-2xl border border-slate-300/80 dark:border-slate-700/80',
            }}
          />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
