'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate, PAYMENT_STATUS_COLOR, PAYMENT_METHOD } from '@/lib/utils'
import { CreditCard, Clock, CheckCircle, AlertCircle, Building2 } from 'lucide-react'
import { SIRKET_BILGILERI } from '@/lib/sirket-bilgileri'

export default function MusteriTahsilat() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('TUMU')

  useEffect(() => {
    fetch('/api/tahsilat')
      .then(r => r.json())
      .then(d => { setPayments(d); setLoading(false) })
  }, [])

  const filtered = statusFilter === 'TUMU' ? payments : payments.filter(p => p.status === statusFilter)

  const totalBekliyor = payments.filter(p => p.status === 'BEKLIYOR').reduce((s, p) => s + p.amount, 0)
  const totalOdendi = payments.filter(p => p.status === 'ODENDI').reduce((s, p) => s + p.amount, 0)
  const totalGecikti = payments.filter(p => p.status === 'GECIKTI').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ödemelerim</h1>
        <p className="text-gray-500 text-sm">Tüm tahsilat ve ödeme geçmişiniz</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-yellow-600" /><p className="text-xs text-yellow-700">Bekliyor</p></div>
              <p className="text-lg font-bold text-yellow-800">{formatCurrency(totalBekliyor)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-600" /><p className="text-xs text-green-700">Ödendi</p></div>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totalOdendi)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={totalGecikti > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50'}>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-xs text-red-600">Gecikti</p></div>
              <p className={`text-lg font-bold ${totalGecikti > 0 ? 'text-red-700' : 'text-gray-500'}`}>{formatCurrency(totalGecikti)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="TUMU">Tüm Ödemeler</option>
          <option value="BEKLIYOR">Bekliyor</option>
          <option value="ODENDI">Ödendi</option>
          <option value="GECIKTI">Gecikti</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Ödeme kaydı bulunamadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any) => (
            <Card key={p.id} className={p.status === 'GECIKTI' ? 'border-red-200 bg-red-50/30' : p.status === 'ODENDI' ? 'border-green-100' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {PAYMENT_METHOD[p.method] || p.method}
                      {p.dueDate && !p.paidAt && (
                        <>
                          {' • '}
                          <span className={new Date(p.dueDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {new Date(p.dueDate) < new Date() 
                              ? `${Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))} gün gecikti`
                              : `${Math.ceil((new Date(p.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün kaldı`
                            }
                          </span>
                        </>
                      )}
                      {p.paidAt && ` • Ödendi: ${formatDate(p.paidAt)}`}
                    </p>
                    {p.order?.id && <p className="text-xs text-gray-400 mt-0.5">Sipariş: {formatDate(p.order.createdAt)}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${PAYMENT_STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                    {p.status === 'ODENDI' ? 'Ödendi' : p.status === 'GECIKTI' ? 'Gecikti' : 'Bekliyor'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Banka Hesap Bilgileri */}
      <Card className="bg-blue-50 border-blue-200 mt-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Banka Hesap Bilgilerimiz</h3>
          </div>
          <div className="space-y-3">
            {SIRKET_BILGILERI.banka.map((banka, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-medium text-gray-900">{banka.banka} - {banka.subeAd}</p>
                <p className="text-xs text-gray-500">Hesap Sahibi: {banka.hesapAd}</p>
                <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-1 tracking-wider">{banka.iban}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-3">
            Havale/EFT yaparken açıklamaya sipariş numaranızı yazmayı unutmayın.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
