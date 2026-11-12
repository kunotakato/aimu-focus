import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aimu Focus",
  description: "重要な行動を確実に進めるためのタスク管理アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang="ja": 読み上げソフトや翻訳機能に「日本語のページ」だと伝える
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
