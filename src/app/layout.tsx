import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 智能助手',
  description: 'AI 智能助手',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
