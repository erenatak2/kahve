import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Satış Yönetim v4.1',
  description: 'Proje Giriş Paneli',
  icons: {
    icon: [
      { url: '/favicon.ico?v=4.1', href: '/favicon.ico?v=4.1' },
    ],
  },
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
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
