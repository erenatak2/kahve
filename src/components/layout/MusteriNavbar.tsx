'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PlusCircle,
  CreditCard,
  LogOut,
  ShoppingBag,
  X,
  User,
  ShoppingBasket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/musteri', label: 'Gösterge Paneli', icon: LayoutDashboard },
  { href: '/musteri/yeni-siparis', label: 'Ürünler', icon: Package },
  { href: '/musteri/sepet', label: 'Sepetim', icon: ShoppingBasket },
  { href: '/musteri/siparisler', label: 'Siparişlerim', icon: ShoppingCart },
  { href: '/musteri/tahsilat', label: 'Ödemelerim', icon: CreditCard },
  { href: '/musteri/profil', label: 'Profilim', icon: User },
]

export function MusteriNavbar({ user, onClose }: { user: { name?: string; email?: string }; onClose?: () => void }) {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      const total = cart.reduce((sum: number, item: any) => sum + item.quantity, 0)
      setCartCount(total)
    }

    updateCartCount()
    window.addEventListener('storage', updateCartCount)
    
    const interval = setInterval(updateCartCount, 500)

    return () => {
      window.removeEventListener('storage', updateCartCount)
      clearInterval(interval)
    }
  }, [])

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Sipariş Portalı</h1>
              <p className="text-xs text-gray-500">Müşteri Paneli</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1 rounded text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const isSepet = item.href === '/musteri/sepet'
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {isSepet && cartCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </aside>
  )
}
