import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Network Tagging — OSM Private Map",
  description:
    "Tagging infrastruktur jaringan (ODP/FAT, ODC/FDT, Tiang, Kabel) di atas peta OpenStreetMap. Data 100% lokal di browser Anda, tanpa akun, tanpa server.",
  keywords: [
    "OpenStreetMap",
    "ODP",
    "FAT",
    "ODC",
    "FDT",
    "Tiang",
    "Kabel Fiber",
    "Network Tagging",
    "Provider",
  ],
  authors: [{ name: "Network Tagging" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
