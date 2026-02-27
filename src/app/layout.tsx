import type { Metadata, Viewport } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WISE Vision Training | 野球ビジョントレーニング',
  description:
    '野球選手のための科学的根拠に基づくビジョントレーニングアプリ。KVA動体視力・眼と手の協応・瞬間視を楽しいゲームで強化。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WISE Vision',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0d2240',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${notoSansJP.className} min-h-screen bg-navy`}>
        {children}
      </body>
    </html>
  );
}
