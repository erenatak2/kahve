'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { FileText, Search, Eye } from 'lucide-react'
import Link from 'next/link'

interface Customer {
  id: string
  user: { name: string; email: string }
  phone?: string
  city?: string
  _count?: { orders: number }
  orders?: { totalAmount: number; status: string }[]
}

interface CariHesaplarClientProps {
  initialCustomers: Customer[]
  session: any
}

export default function CariHesaplarClient({ initialCustomers, session }: CariHesaplarClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch] = useState('')

  // Her müşterinin borç bilgisini hesapla
  const getCustomerDebt = (c: Customer) => {
    if (!c.orders) return 0
    return c.orders.reduce((sum, o) => sum + o.totalAmount, 0)
  }

  const filtered = customers.filter(c =>
    c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cari Hesaplar</h1>
          <p className="text-gray-500 text-sm mt-1">Tüm müşteri cari hesap özetleri</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Müşteri ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Müşteri bulunamadı</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Müşteri</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Şehir</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Telefon</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Toplam Borç</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const debt = getCustomerDebt(c)
                    return (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{c.user.name}</p>
                            <p className="text-sm text-gray-500">{c.user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.city || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(debt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/admin/musteriler/${c.id}/cari`}>
                            <Button variant="ghost" size="sm" className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Eye className="h-4 w-4" />
                              Cari Hesap
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
