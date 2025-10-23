import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";
import "../styles/modern-design-system.css";
import Head from "next/head";

export const metadata: Metadata = {
  title: "AGGRANDIZE Dashboard",
  description: "Role-based access control dashboard with modern Web3 styling",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AGGRANDIZE TeamHub",
    startupImage: [
      {
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
        url: "/logo1.png"
      },
      {
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
        url: "/logo1.png"
      },
      {
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
        url: "/logo1.png"
      }
    ]
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "AGGRANDIZE TeamHub",
    "msapplication-TileColor": "#2a2a2a",
    "theme-color": "#2a2a2a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"/>
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
