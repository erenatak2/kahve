import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from '@/components/ui/toaster'
import NextTopLoader from 'nextjs-toploader'

const inter = Inter({ subsets: ['latin'] })

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
          color="#3b82f6" 
          showSpinner={false} 
          height={2} 
          speed={200} 
          crawlSpeed={200}
        />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
