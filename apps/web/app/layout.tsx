import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { getRequestAppLanguage } from "@/lib/i18n/requestAppLanguage.server";

export const metadata: Metadata = {
  title: "Checkpoint Vardi",
  description:
    "Scaffold baseline for the Checkpoint Vardi workplace safety platform.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const language = await getRequestAppLanguage();

  return (
    <html lang={language}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
