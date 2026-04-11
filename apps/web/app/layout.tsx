import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checkpoint Varði",
  description:
    "Workplace safety management for Icelandic workplaces — checklists, risk assessments, and written safety plans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="is">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
