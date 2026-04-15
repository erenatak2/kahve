'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrainCircuit, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AIAssistantWidgetProps {
  segments: {
    atRisk: any[]
    vip: any[]
  }
  pendingPayments: any[]
}

export function AIAssistantWidget({ segments, pendingPayments }: AIAssistantWidgetProps) {
  // Insight üretimi
  const insights = []

  // 1. Churn Risk Analizi
  if (segments.atRisk && segments.atRisk.length > 0) {
    const topRisk = segments.atRisk[0]
    insights.push({
      id: 'risk-1',
      type: 'WARNING',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
      title: 'Müşteri Kaybı Riski!',
      message: `${topRisk.name} normalde ${topRisk.avgDays} günde bir sipariş verirdi ama ${topRisk.daysSinceLastOrder} gündür ses yok. ${segments.atRisk.length > 1 ? `Ayrica ${segments.atRisk.length - 1} riskli müşteri daha var.` : ''} Hemen bir 'Nasılsınız?' araması yapın.`,
      actionHref: `/admin/musteriler/${topRisk.id}/cari`,
      actionText: 'Cari Hesabı İncele'
    })
  }

  // 2. Fırsat Analizi (VIP Upsell)
  if (segments.vip && segments.vip.length > 0) {
    const topVip = segments.vip[0]
    insights.push({
      id: 'opp-1',
      type: 'OPPORTUNITY',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
      title: 'Satış Fırsatı (VIP)',
      message: `${topVip.name} sadık bir müşteriniz. Kendisi uzun zamandır sorunsuz çalışıyor. Yeni bir ürün veya fırsat sunmak için uygun bir zaman olabilir.`,
      actionHref: `/admin/musteriler/${topVip.id}/cari`,
      actionText: 'Özel Teklif Yap'
    })
  }

  // 3. Gecikmiş Tahsilat Analizi
  const overdue = pendingPayments?.filter(p => p.status === 'GECIKTI') || []
  if (overdue.length > 0) {
    const totalOverdue = overdue.reduce((sum, p) => sum + p.amount, 0)
    insights.push({
      id: 'fin-1',
      type: 'WARNING',
      icon: BrainCircuit,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      title: 'Tahsilat Sızıntısı',
      message: `Toplam ${formatCurrency(totalOverdue)} tutarında gecikmiş tahsilatınız bekliyor. Nakit akışını hızlandırmak için bugün tahsilatlara öncelik verin.`,
      actionHref: `/admin/tahsilat`,
      actionText: 'Tahsilatları Yönet'
    })
  }

  // Eğer hiçbir insight yoksa
  if (insights.length === 0) {
    insights.push({
      id: 'all-good',
      type: 'INFO',
      icon: Sparkles,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      title: 'Sistem Durumu Harika',
      message: 'Şu anlık alarm veren bir müşteri veya ödeme yok. Satışlara odaklanmaya devam!',
    })
  }

  return (
    <Card className="border-indigo-100 overflow-hidden relative shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-bl-full opacity-5 pointer-events-none" />
      <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-white pb-3 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base text-indigo-900 font-bold">
          <div className="bg-indigo-600 outline outline-4 outline-indigo-100 p-1.5 rounded-lg">
            <BrainCircuit className="h-4 w-4 text-white" />
          </div>
          Yapay Zeka Satış Asistanı
          <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black tracking-widest">
            {insights.length} ANALİZ
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:px-6 space-y-3 bg-white">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <div key={insight.id} className={`flex items-start gap-4 p-3.5 sm:p-4 rounded-xl border ${insight.bgColor} ${insight.borderColor} transition-all hover:shadow-md`}>
              <div className={`p-2 rounded-lg bg-white shadow-sm shrink-0 ${insight.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold ${insight.color} mb-1`}>{insight.title}</h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
                  {insight.message}
                </p>
                {insight.actionHref && (
                  <a 
                    href={insight.actionHref} 
                    className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-md bg-white border ${insight.borderColor} ${insight.color} hover:bg-slate-50 transition-colors shadow-sm`}
                  >
                    {insight.actionText}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
