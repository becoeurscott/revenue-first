import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vaulten Admin",
  description: "Operate everything in the Vaulten app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
