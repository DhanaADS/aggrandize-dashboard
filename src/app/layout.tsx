import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGGRANDIZE Dashboard",
  description: "Role-based access control dashboard with modern Web3 styling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
