import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenTech Advisor AI | Sustainable Electronics Assistant",
  description: "RAG-powered conversational assistant designed to make environmentally responsible electronics purchases and manage E-waste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
