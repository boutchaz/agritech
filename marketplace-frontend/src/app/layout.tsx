import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { QueryProvider } from "@/providers/QueryProvider";
import GoogleTagManager from "@/components/GTM";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Suspense } from 'react';
import { CodeExchanger } from '@/components/CodeExchanger';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://market.agritech.ma'),
  title: "AgriTech Marketplace - Produits Agricoles du Maroc",
  description: "Achetez et vendez des produits agricoles locaux. Fruits, legumes, cereales, machines agricoles et plus.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleTagManager />
         <NextIntlClientProvider locale={locale} messages={messages}>
           <QueryProvider>
             <AuthProvider>
               <Suspense fallback={null}>
                 <CodeExchanger />
               </Suspense>
               <CartProvider>
                 {children}
               </CartProvider>
             </AuthProvider>
           </QueryProvider>
         </NextIntlClientProvider>
      </body>
    </html>
  );
}
