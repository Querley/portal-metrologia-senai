import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site'),
  title: 'Portal de Metrologia SENAI',
  description: 'Serviços de metrologia, orçamentos e gestão do conhecimento em uma única plataforma.',
  openGraph: {
    title: 'Portal de Metrologia',
    description: 'Precisão que gera conhecimento.',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: '/og-portal-metrologia.png', width: 1200, height: 630, alt: 'Portal de Metrologia — precisão que gera conhecimento' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portal de Metrologia SENAI',
    description: 'Precisão que gera conhecimento.',
    images: ['/og-portal-metrologia.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
