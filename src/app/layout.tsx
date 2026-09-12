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
    // English (EN)
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
    "BPM control player",
    "Cha Cha Cha Listen music",
    "Cha Cha Cha music",
    "Samba Music Listen",
    "Samba dance music",
    "Rumba Music Listen",
    "Rumba dance music",
    "Paso Doble Music Listen",
    "Paso Doble dance music",
    "Jive Music Listen",
    "Jive dance music",
    "Slow Waltz Music Listen",
    "Tango Music Listen",
    "Viennese Waltz Music Listen",
    "Slow Foxtrot Music Listen",
    "Quickstep Music Listen",

    // Georgian (KA) - ქართული
    "სპორტული ცეკვების მუსიკა",
    "სამეჯლისო ცეკვების მუსიკა",
    "ჩა ჩა ჩა მუსიკა",
    "სამბა მუსიკა",
    "რუმბა მუსიკა",
    "პასოდობლე მუსიკა",
    "ჯაივი მუსიკა",
    "ნელი ვალსი მუსიკა",
    "ტანგო მუსიკა",
    "ვენური ვალსი მუსიკა",
    "ფოქსტროტი მუსიკა",
    "ქვიქსტეპი მუსიკა",

    // Spanish (ES) - ესპანური
    "Música de Baile Deportivo",
    "Reproductor de música Dancesport",
    "Música de baile de salón",
    "Música de Cha Cha Cha",
    "Música de Samba",
    "Música de Rumba",
    "Música de Pasodoble",
    "Música de Jive",
    "Música de Vals Lento",
    "Música de Tango",
    "Música de Vals Vienés",
    "Música de Foxtrot",
    "Música de Quickstep",

    // German (DE) - გერმანული
    "Tanzsport Musik",
    "Tanzsport Player",
    "Standard und Latein Tanzmusik",
    "Cha Cha Cha Musik",
    "Samba Musik",
    "Rumba Musik",
    "Paso Doble Musik",
    "Jive Musik",
    "Langsamer Walzer Musik",
    "Tango Musik",
    "Wiener Walzer Musik",
    "Slowfox Musik",
    "Quickstep Musik",

    // Italian (IT) - იტალიური
    "Musica da Danza Sportiva",
    "Player Musica Danza Sportiva",
    "Musica da Ballo da Sala",
    "Musica Cha Cha Cha",
    "Musica Samba",
    "Musica Rumba",
    "Musica Paso Doble",
    "Musica Jive",
    "Musica Valzer Lento",
    "Musica Tango",
    "Musica Valzer Viennese",
    "Musica Slow Foxtrot",
    "Musica Quickstep",

    // Chinese (ZH) - ჩინური
    "体育舞蹈音乐",
    "国标舞音乐",
    "拉丁舞音乐",
    "摩登舞音乐",
    "恰恰舞音乐",
    "桑巴舞音乐",
    "伦巴舞音乐",
    "斗牛舞音乐",
    "牛仔舞音乐",
    "慢华尔兹音乐",
    "探戈舞音乐",
    "维也纳华尔兹音乐",
    "狐步舞音乐",
    "快步舞音乐",

    // Japanese (JA) - იაპონური
    "競技ダンス音楽",
    "社交ダンス音楽",
    "ダンストレーニング音楽",
    "チャチャチャ音楽",
    "サンバ音楽",
    "ルンバ音楽",
    "パソドブレ音楽",
    "ジャイブ音楽",
    "ワルツ音楽",
    "タンゴ音楽",
    "ヴェニーズワルツ音楽",
    "スローフォックストロット音楽",
    "クイックステップ音楽",

    // Korean (KO) - კორეული
    "댄스스포츠 음악",
    "볼룸댄스 음악",
    "라틴댄스 음악",
    "모던댄스 음악",
    "차차차 음악",
    "삼바 음악",
    "룸바 음악",
    "파소도블레 음악",
    "자이브 음악",
    "왈츠 음악",
    "탱고 음악",
    "비엔나 왈츠 음악",
    "폭스트롯 음악",
    "퀵스텝 음악",

    // Russian (RU) - რუსული
    "Музыка для спортивных бальных танцев",
    "Музыка для бальных танцев",
    "Плеер для бальных танцев",
    "Музыка Ча Ча Ча",
    "Музыка Самба",
    "Музыка Румба",
    "Музыка Пасодобль",
    "Музыка Джайв",
    "Музыка Медленный Вальс",
    "Музыка Танго",
    "Музыка Венский Вальс",
    "Музыка Медленный Фокстрот",
    "Музыка Квикстеп",

    // Armenian (HY) - სომხური
    "Սպորտային պարային երաժշտություն",
    "Պարահանդեսային պարերի երաժշտություն",
    "Չա Չա Չա երաժշտություն",
    "Սամբա երաժշտություն",
    "Ռումբա երաժշտություն",
    "Պասո Դոբլե երաժշտություն",
    "Ջայվ երաժշտություն",
    "Վալս երաժշտություն",
    "Տանգո երաժշտություն",

    // Turkish (TR) - თურქული
    "Dans Sporu Müziği",
    "Dansspor Müzik Çalar",
    "Salon Dansları Müziği",
    "Latin Dans Müziği",
    "Cha Cha Cha Müziği",
    "Samba Müziği",
    "Rumba Müziği",
    "Paso Doble Müziği",
    "Jive Müziği",
    "Yavaş Vals Müziği",
    "Tango Müziği",
    "Viyana Valsi Müziği",
    "Foxtrot Müziği",
    "Quickstep Müziği",

    // Ukrainian (UK) - უკრაინული
    "Музика для спортивних бальних танців",
    "Музика для бальних танців",
    "Плеєр для бальних танців",
    "Музика Ча Ча Ча",
    "Музика Самба",
    "Музика Румба",
    "Музика Пасодобль",
    "Музика Джайв",
    "Музика Повільний Вальс",
    "Музика Танго",
    "Музика Віденський Вальс",
    "Музика Фокстрот",
    "Музика Квікстеп",

    // Lithuanian & Latvian (LT / LV) - ლიტვური & ლატვიური
    "Sportinių šokių muzika",
    "Pramoginių šokių muzika",
    "Cha Cha Cha muzika",
    "Samba muzika",
    "Rumba muzika",
    "Valso muzika",
    "Tango muzika",
    "Sporta deju mūzika",
    "Balles deju mūzika",
    "Cha Cha Cha mūzika",
    "Samba mūzika",
    "Rumba mūzika",
    "Valša mūzika",
    "Tango mūzika"
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
  verification: {
    google: "hmYQzKJ5eZK-N6rFBBDmqMyRCh3UtPeC8kjDeZyg-l4",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "google-site-verification": "hmYQzKJ5eZK-N6rFBBDmqMyRCh3UtPeC8kjDeZyg-l4"
  }
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        <meta name="google-site-verification" content="hmYQzKJ5eZK-N6rFBBDmqMyRCh3UtPeC8kjDeZyg-l4" />
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
                  document.documentElement.classList.add('pwa-standalone');
                }
                // NOTE: the --ios-bottom-gap visualViewport measurement used to
                // live here too. Moved to AppLayout.tsx's useEffect instead —
                // two separate rounds (the debug-badge DOM-node injection, and
                // this measurement silently reading visualViewport before it
                // had settled) both showed that a <head> script running
                // synchronously during HTML parsing is the wrong place for
                // anything beyond this single classList.add: it runs before
                // <body> exists, before layout/paint, and before
                // visualViewport has a real value, and a thrown error here can
                // silently abort the rest of this script. A React effect in a
                // mounted client component runs strictly after hydration and
                // first paint, which is both safe and measures real numbers.
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    names.forEach(function(name) {
                      if (name.indexOf('static-style-assets') !== -1 || name.indexOf('workbox-precache') !== -1) {
                        caches.delete(name);
                      }
                    });
                  });
                }
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(reg) { reg.update(); });
                  });
                }
              } catch (e) {}
            `,
          }}
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
