'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, memo, startTransition, useCallback } from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  BarChart3,
  LogOut,
  ShoppingBag,
  X,
  Trash2,
  User,
  FileText,
  Bell,
  Volume2,
  ShieldAlert,
  Phone,
  Contact,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeKey?: 'orders' | 'notifications' | 'customers' | 'reminders'
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Gösterge Paneli', icon: LayoutDashboard },
  { href: '/admin/urunler', label: 'Ürünler', icon: Package },
  { href: '/admin/musteriler', label: 'Müşteriler', icon: Users, badgeKey: 'customers' },
  { href: '/admin/siparisler', label: 'Siparişler', icon: ShoppingCart, badgeKey: 'orders' },
  { href: '/admin/tahsilat', label: 'Tahsilat', icon: CreditCard },
  { href: '/admin/takip', label: 'Aranacaklar', icon: Phone, badgeKey: 'reminders' },
  { href: '/admin/kontaklar', label: 'Kontaklar', icon: Contact },
  { href: '/admin/odeme-bildirimler', label: 'Ödeme Bildirimleri', icon: Bell, badgeKey: 'notifications' },
  { href: '/admin/cari-hesaplar', label: 'Cari Hesaplar', icon: FileText },
  { href: '/admin/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/admin/ekip', label: 'Ekip Yönetimi', icon: ShieldAlert },
  { href: '/admin/cop-kutusu', label: 'Çöp Kutusu', icon: Trash2 },
  { href: '/admin/profil', label: 'Profil Ayarları', icon: User },
]

interface BadgeCounts {
  orders: number
  notifications: number
  customers: number
  reminders: number
}

// Ses çalma fonksiyonu - Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = new AudioContextClass()
    if (audioContext.state === 'suspended') return

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
    setTimeout(() => { audioContext.close().catch(() => {}) }, 1000)
  } catch (error) {
    if ((error as any).name !== 'NotAllowedError') console.warn('Ses çalınamadı:', error)
  }
}

// Memoized individual link component to prevent unnecessary sidebar re-renders
const SidebarLink = memo(({ 
  item, 
  pathname, 
  pendingHref, 
  badgeCount, 
  onNavigate 
}: { 
  item: NavItem; 
  pathname: string; 
  pendingHref: string | null; 
  badgeCount: number;
  onNavigate: (href: string) => void;
}) => {
  const Icon = item.icon
  const isActive = (pendingHref || pathname) === item.href
  const formatBadge = (count: number) => {
    if (count > 99) return '99+'
    return count.toString()
  }

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={() => onNavigate(item.href)}
      className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]',
        isActive
          ? 'bg-blue-50 text-blue-700 shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {item.label}
      </div>
      {badgeCount > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-bold">
          {formatBadge(badgeCount)}
        </span>
      )}
    </Link>
  )
})

SidebarLink.displayName = 'SidebarLink'

export function AdminSidebar({ user, onClose }: { user: { name?: string; email?: string; role?: string }; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState<BadgeCounts>({ orders: 0, notifications: 0, customers: 0, reminders: 0 })
  const [seenCounts, setSeenCounts] = useState<BadgeCounts>({ orders: 0, notifications: 0, customers: 0, reminders: 0 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevCounts = useRef<BadgeCounts>({ orders: 0, notifications: 0, customers: 0, reminders: 0 })
  const soundEnabledRef = useRef(true)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const lastClickTime = useRef<number>(0)
  
  // Navigation handler with throttling
  // Navigasyonu sadece gerçek tıklamada (click) başlat
  const handleNavigate = useCallback((href: string) => {
    const now = Date.now()
    if (now - lastClickTime.current < 150) return
    lastClickTime.current = now
    
    // Tıklama anında görsel geri bildirimi ver
    startTransition(() => {
      setPendingHref(href)
    })
    
    if (onClose) {
      setTimeout(onClose, 50)
    }
  }, [onClose])

  // Clear pending state when navigated
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])
  
  useEffect(() => {
    const savedSeen = localStorage.getItem('seenCounts')
    if (savedSeen) setSeenCounts(JSON.parse(savedSeen))
    const savedCounts = localStorage.getItem('badgeCounts')
    if (savedCounts) {
      const parsedCounts = JSON.parse(savedCounts)
      setCounts(parsedCounts)
      prevCounts.current = parsedCounts
    }
  }, [])

  useEffect(() => {
    const currentSeen = { ...seenCounts }
    let updated = false
    if (pathname.startsWith('/admin/siparisler') && counts.orders > seenCounts.orders) { currentSeen.orders = counts.orders; updated = true; }
    if (pathname.startsWith('/admin/odeme-bildirimler') && counts.notifications > seenCounts.notifications) { currentSeen.notifications = counts.notifications; updated = true; }
    if (pathname.startsWith('/admin/musteriler') && counts.customers > seenCounts.customers) { currentSeen.customers = counts.customers; updated = true; }
    if (pathname.startsWith('/admin/takip')) { currentSeen.reminders = counts.reminders; updated = true; }
    if (seenCounts.orders > counts.orders) { currentSeen.orders = counts.orders; updated = true; }
    if (seenCounts.notifications > counts.notifications) { currentSeen.notifications = counts.notifications; updated = true; }
    if (seenCounts.customers > counts.customers) { currentSeen.customers = counts.customers; updated = true; }
    if (seenCounts.reminders > counts.reminders) { currentSeen.reminders = counts.reminders; updated = true; }
    if (updated) { setSeenCounts(currentSeen); localStorage.setItem('seenCounts', JSON.stringify(currentSeen)); }
  }, [pathname, counts])
  
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])

  useEffect(() => {
    let abortController = new AbortController()
    const connectStream = async () => {
      try {
        const response = await fetch('/api/admin/bildirim-stream', { credentials: 'include', signal: abortController.signal })
        if (!response.ok) return
        const reader = response.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const match = line.match(/^data: (.+)$/m)
            if (match) {
              try {
                const data: BadgeCounts = JSON.parse(match[1])
                if (!localStorage.getItem('seenCounts')) { setSeenCounts(data); localStorage.setItem('seenCounts', JSON.stringify(data)); }
                if ((data.orders > prevCounts.current.orders || data.notifications > prevCounts.current.notifications || data.customers > prevCounts.current.customers || data.reminders > prevCounts.current.reminders) && soundEnabledRef.current) {
                  playNotificationSound()
                }
                prevCounts.current = data; setCounts(data); localStorage.setItem('badgeCounts', JSON.stringify(data));
              } catch (e) {}
            }
          }
        }
      } catch (error: any) { if (error.name !== 'AbortError') console.error('Stream error:', error) }
    }
    connectStream()
    return () => { abortController.abort() }
  }, [])

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Satış Yönetim</h1>
              <p className="text-xs text-gray-500">{user?.role === 'SATICI' ? 'Satış Temsilcisi' : 'Admin Paneli'}</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1 rounded text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => {
          if (user?.role === 'SATICI') return ['/admin', '/admin/urunler', '/admin/musteriler', '/admin/kontaklar', '/admin/siparisler', '/admin/profil'].includes(item.href)
          return true
        }).map((item) => {
          const badgeCount = item.badgeKey ? Math.max(0, counts[item.badgeKey] - seenCounts[item.badgeKey]) : 0
          return <SidebarLink key={item.href} item={item} pathname={pathname} pendingHref={pendingHref} badgeCount={badgeCount} onNavigate={handleNavigate} />
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className={`flex-1 justify-center ${soundEnabled ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Sesli uyarı açık' : 'Sesli uyarı kapalı'}>
            <Volume2 className={`h-4 w-4 ${soundEnabled ? '' : 'line-through'}`} />
          </Button>
          <Button variant="ghost" className="flex-[2] justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => signOut({ callbackUrl: '/admin' })}>
            <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
          </Button>
        </div>
      </div>
    </aside>
  )
}
