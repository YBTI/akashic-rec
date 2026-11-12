import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: { default: 'Akashic REC(アカシックレコード)', template: '%s | Akashic REC' },
  description: 'あなたを救ってくれた存在との経験を、インタビュー形式で記録して残す場所。',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@600;700&family=Space+Grotesk:wght@600;700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
