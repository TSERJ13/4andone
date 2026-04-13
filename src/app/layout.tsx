import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';
import { AudioProvider } from "@/components/audio/AudioProvider";
import AppLayout from "@/components/layout/AppLayout";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";
import Script from "next/script";

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'] 
});

export const metadata: Metadata = {
  title: "4and.one Music | Dancesport Player",
  description: "The ultimate tool for dancers and coaches. High-fidelity BPM control and professional practice modes.",
  manifest: "/manifest.json?v=3",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png?v=3" },
    ],
    apple: "/apple-icon.png?v=3",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "4and.one Music",
    startupImage: "/icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  }
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { StudioProvider } from "@/components/admin/StudioProvider";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <StudioProvider>
            <AudioProvider>
              <AnalyticsTracker />
              <AppLayout>
                {children}
              </AppLayout>
            </AudioProvider>
          </StudioProvider>
        </AuthProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YP8Z77FGX1"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-YP8Z77FGX1');
          `}
        </Script>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
);
}
