import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { message, history = [] } = body
    if (!message) return NextResponse.json({ error: 'Mesaj boş olamaz.' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI anahtarı eksik.' }, { status: 500 })

    const now = new Date()
    const lowerMessage = message.toLowerCase()
    const isAnalysisRequested = /analiz|durum|rapor|istatistik|finans|performans/.test(lowerMessage)

    const [allCustomersShort, allProductsShort, recentOrders] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, user: { select: { name: true } }, discountRate: true } }),
      prisma.product.findMany({ where: { isActive: true, stock: { gt: 0 } }, select: { id: true, name: true, salePrice: true, code: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { include: { user: { select: { name: true } }, salesRep: { select: { name: true } } } } }
      })
    ])

    let analysisContext = ""
    if (isAnalysisRequested) {
      const [thisMonthStats, paymentStats] = await Promise.all([
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
        prisma.payment.groupBy({ by: ['status'], _sum: { amount: true } })
      ])
      const paid = paymentStats.find(p => p.status === 'ODENDI')?._sum.amount || 0
      const pending = (paymentStats.find(p => p.status === 'BEKLIYOR')?._sum.amount || 0) + (paymentStats.find(p => p.status === 'GECIKTI')?._sum.amount || 0)
      analysisContext = `CIRO: ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL, TAHSİLAT: %${paid > 0 ? ((paid / (paid + pending)) * 100).toFixed(1) : 0}`
    }

    const systemInstruction = `
      Sen Erkan Bey'in minimalist operasyon asistanısın. 
      KESİN KURALLAR:
      1. ASLA ama ASLA Erkan Bey'e finansal analiz, personel performansı veya risk uyarısı yapma (Analiz istenmedikçe).
      2. GEÇMİŞ HATALARI UNUT: Botun geçmişte yaptığı uzun, moral bozucu ve geveze konuşmaları ASLA taklit etme.
      3. CEVAP SINIRI: Cevabın maksimum 2-3 cümle olsun.
      
      GÖREVİN:
      - "Sipariş verdi" dendiğinde sadece "Hangi müşteriye kaç adet?" de.
      - Sipariş taslağı için gizemli kodu ekle: [[CREATE_ORDER:{...}]]
      
      GÜNCEL VERİLER:
      - Son Siparişler: ${recentOrders.map(o => `${o.customer.user?.name}: ${o.totalAmount} TL`).join(', ')}
      - Müşteriler: ${JSON.stringify(allCustomersShort.map(c => ({ id: c.id, name: c.user?.name })))}
      - Ürünler: ${JSON.stringify(allProductsShort.map(p => ({ id: p.id, name: p.name, fiyati: p.salePrice })))}
      ${analysisContext}
    `

    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction 
    })

    // TEMİZ GEÇMİŞ: Botun eski geveze halini görmemesi için sadece kullanıcı mesajlarını veya son 2 mesajı alıyoruz
    const cleanedHistory = history.slice(-4).filter((h: any) => h.role === 'user' || h.content.length < 200).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(h.content || '') }]
    }))

    const chat = geminiModel.startChat({ history: cleanedHistory })

    const result = await chat.sendMessage(message)
    const text = (await result.response).text()

    return NextResponse.json({ content: text })
  } catch (error: any) {
    console.error('Chat Error:', error)
    
    const errorMessage = error?.message?.toLowerCase() || ''
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return NextResponse.json({ error: 'AI hız sınırına takıldınız. Lütfen 1 dakika bekleyip tekrar deneyin.' }, { status: 429 })
    }
    
    return NextResponse.json({ error: 'Sistem şu an meşgul, lütfen birazdan tekrar deneyin.' }, { status: 500 })
  }
}
