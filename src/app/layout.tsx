import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

import NextTopLoader from 'nextjs-toploader'

export const metadata = {
  title: 'Satış Yönetim v4.1',
  description: 'Proje Giriş Paneli',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className} suppressHydrationWarning>
        <NextTopLoader 
          color="#2563eb" 
          showSpinner={false} 
          height={4} 
          speed={150} 
          crawlSpeed={150} 
          initialPosition={0.1}
        />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
