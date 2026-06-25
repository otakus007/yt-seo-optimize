import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antigravity YT SEO",
  description: "AI-powered YouTube SEO Optimization Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
