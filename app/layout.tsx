import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Digital KunkunShi",
  description: "Pop melody to Okinawan sanshin Kunkunshi"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
