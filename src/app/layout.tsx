import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';
import { AudioProvider } from "@/components/audio/AudioProvider";
import AppLayout from "@/components/layout/AppLayout";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "4and.one Music | Dancesport Player",
  description: "The ultimate training tool for dancers and coaches. BPM control, AI vocal removal, and professional practice modes.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "4and.one Music",
  },
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
      <body className={inter.className}>
        <AuthProvider>
          <StudioProvider>
            <AudioProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </AudioProvider>
          </StudioProvider>
        </AuthProvider>
    </body>
  </html>
);
}
