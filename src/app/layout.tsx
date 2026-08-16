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

import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "4and.one - Free Web Music Player | Dancesport & Ballroom Music",
  description: "Free powerful web music player for Dancesport and Ballroom dancers. Listen to Cha Cha Cha, Samba, Rumba, Paso Doble, Jive, Slow Waltz, Tango, Viennese Waltz, Slow Foxtrot, and Quickstep music with BPM tempo control.",
  keywords: [
    "4and.one",
    "Dancesport",
    "Dancesport player",
    "Dancesport music",
    "Dancesport web music player",
    "Ballroom dance music",
    "Ballroom music player",
    "Latin dance music",
    "Standard dance music",
    "Free web music player",
    "Web music player",
    "Free music player",
    "Telegram music player",
    "Music tempo control",
    "BPM control player",
    "Dance practice player",
    "Cha Cha Cha Listen music",
    "Cha Cha Cha music",
    "Cha Cha Cha dance music",
    "Listen Cha Cha Cha music online",
    "Samba Music Listen",
    "Samba dance music",
    "Samba music player",
    "Listen Samba music online",
    "Rumba Music Listen",
    "Rumba dance music",
    "Rumba music player",
    "Listen Rumba music online",
    "Paso Doble Music Listen",
    "Paso Doble dance music",
    "Paso Doble music player",
    "Listen Paso Doble music online",
    "Jive Music Listen",
    "Jive dance music",
    "Jive music player",
    "Listen Jive music online",
    "Slow Waltz Music Listen",
    "Waltz Music Listen",
    "Slow Waltz dance music",
    "Slow Waltz music player",
    "Listen Slow Waltz music online",
    "Tango Music Listen",
    "Ballroom Tango dance music",
    "Tango music player",
    "Listen Tango music online",
    "Viennese Waltz Music Listen",
    "Viennese Waltz dance music",
    "Viennese Waltz music player",
    "Listen Viennese Waltz music online",
    "Slow Foxtrot Music Listen",
    "Foxtrot Music Listen",
    "Slow Foxtrot dance music",
    "Slow Foxtrot music player",
    "Listen Slow Foxtrot music online",
    "Quickstep Music Listen",
    "Quickstep dance music",
    "Quickstep music player",
    "Listen Quickstep music online"
  ],
  metadataBase: new URL("https://4and.one"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "4and.one - Free Web Music Player | Dancesport & Ballroom Music",
    description: "Free powerful web music player for Dancesport and Ballroom dancers. Listen to Cha Cha Cha, Samba, Rumba, Paso Doble, Jive, Slow Waltz, Tango, Viennese Waltz, Slow Foxtrot, and Quickstep music with BPM tempo control.",
    url: "https://4and.one",
    siteName: "4and.one Music",
    images: [
      {
        url: "https://4and.one/icon.png",
        width: 512,
        height: 512,
        alt: "4and.one music player logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "4and.one - Free Web Music Player | Dancesport & Ballroom Music",
    description: "Free powerful web music player for Dancesport and Ballroom dancers. Listen to Cha Cha Cha, Samba, Rumba, Paso Doble, Jive, Slow Waltz, Tango, Viennese Waltz, Slow Foxtrot, and Quickstep music with BPM tempo control.",
    images: ["https://4and.one/icon.png"],
  },
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "4and.one",
  "url": "https://4and.one",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "All",
  "description": "Free powerful web music player for Dancesport and Ballroom dancers. Listen to Cha Cha Cha, Samba, Rumba, Paso Doble, Jive, Slow Waltz, Tango, Viennese Waltz, Slow Foxtrot, and Quickstep music with BPM tempo control.",
  "genre": "Dancesport, Ballroom Music, Latin Dance Music, Standard Dance Music",
  "browserRequirements": "Requires JavaScript. Requires HTML5.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "1250"
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';
  const isHome = pathname === '/';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
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
        {isHome && (
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2697205988789699"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
);
}
