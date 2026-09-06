import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turbo Timmy Writer",
  description: "A focused, AI-assisted writing studio for Tim Benniks.",
  applicationName: "Turbo Timmy Writer",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#171717" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable}`}
    >
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
