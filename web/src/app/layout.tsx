import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletContextProvider } from '@/components/WalletContextProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '赛博判官（Cyber Judge） | 怒燃资金',
  description: '基于 Solana 的铁血 AI 强执托管对赌协议',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 min-h-screen selection:bg-red-500/30`}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
