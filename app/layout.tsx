import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PortGate — Pre-Shipment 3-Way Customs Compliance Engine",
  description: "Deterministic compliance auditing for India→US export shipments. Verify PO, Invoice, and Packing List against CBP rules in seconds.",
  icons: {
    icon: [
      { url: "/portgate.ico" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/portgate.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
