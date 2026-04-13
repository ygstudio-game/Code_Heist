import type { Metadata } from "next";
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
  title: "Code Heist",
  description: "A thrilling coding adventure awaits you in Code Heist! Join us on a journey through the world of programming, where you'll solve puzzles, crack codes, and outsmart challenges to become the ultimate code hacker. Are you ready to heist the code and unlock your full potential? Let's dive in and start the adventure!",
};

import Cursor from "@/components/Cursor";
import { Toaster } from 'sonner';
import { SocketProvider } from '@/context/SocketContext';

import { SystemProvider } from '@/context/SystemContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/30`}
      >
        <SocketProvider>
          <SystemProvider>
            <Cursor />
            <Toaster position="top-center" expand={false} richColors theme="dark" />
            {children}
          </SystemProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
