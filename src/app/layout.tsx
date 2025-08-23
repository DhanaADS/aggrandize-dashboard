import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGGRANDIZE Dashboard",
  description: "Role-based access control dashboard with modern Web3 styling",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AGGRANDIZE Team Hub",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "AGGRANDIZE Team Hub",
    "msapplication-TileColor": "#00ff88",
    "theme-color": "#00ff88",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
