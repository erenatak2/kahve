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
    
    // Analiz talebi tespiti (Sadece bu kelimeler varsa derin verilere bakacak)
    const isAnalysisRequested = /analiz|durum|rapor|istatistik|finans|performans/.test(lowerMessage)

    // 1. TEMEL VERİLER (Her zaman lazım)
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
    
    // 2. DERİN VERİLER (Sadece analiz istendiğinde)
    if (isAnalysisRequested) {
      const [thisMonthStats, paymentStats, sellerStats] = await Promise.all([
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
        prisma.payment.groupBy({ by: ['status'], _sum: { amount: true } }),
        prisma.user.findMany({
          where: { role: { in: ['SATICI', 'ADMIN'] } },
          select: {
            name: true,
            sellerCustomers: {
              select: {
                orders: { select: { totalAmount: true } },
                paymentNotifications: { where: { status: 'ONAYLANDI' }, select: { amount: true } }
              }
            }
          }
        })
      ])

      const paid = paymentStats.find(p => p.status === 'ODENDI')?._sum.amount || 0
      const pending = (paymentStats.find(p => p.status === 'BEKLIYOR')?._sum.amount || 0) + (paymentStats.find(p => p.status === 'GECIKTI')?._sum.amount || 0)
      
      analysisContext = `
        ANALİTİK VERİLER (SADECE SORULURSA KULLAN):
        - Bu Ay Ciro: ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL
        - Tahsilat Başarısı: %${paid > 0 ? ((paid / (paid + pending)) * 100).toFixed(1) : 0}
        - Ekip Performansı: ${sellerStats.map(s => {
          const sales = s.sellerCustomers.reduce((sum, c) => sum + c.orders.reduce((os, o) => os + o.totalAmount, 0), 0)
          return `${s.name}: ${Number(sales).toLocaleString('tr-TR')} TL Satış`
        }).join(', ')}
      `
    }

    const contextString = `
      Sen Erkan Bey'in pratik asistanısın. Erkan Bey uzun raporlardan ve moral bozan uyarılardan Nefret Eder.
      
      TEMEL KURALLAR:
      1. KISA KONUŞ: Cevapların maksimum 1-2 cümle olsun.
      2. MORAL BOZMA: Erkan Bey sormadıkça kimsenin performansını eleştirme, "risk var" diye ders verme.
      3. ANLIK TAKİP: Erkan Bey bir olaydan (sipariş vs.) bahsederse önce aşağıdaki "SON İŞLEMLER"e bak. Oradaysa "Hangi müşteri?" diye sorma, bildiğini göster.
      
      SON İŞLEMLER (ANLIK):
      ${recentOrders.map(o => `- **${o.customer.user?.name}** için **${Number(o.totalAmount).toLocaleString('tr-TR')} TL** (Temsilci: ${o.customer.salesRep?.name || 'Yok'})`).join('\n')}
      
      ${analysisContext}
      
      MASTER DATA:
      - Müşteriler: ${JSON.stringify(allCustomersShort.map(c => ({ id: c.id, name: c.user?.name })))}
      - Ürünler: ${JSON.stringify(allProductsShort.map(p => ({ id: p.id, name: p.name, price: p.salePrice })))}
      
      TALİMAT: Sipariş hazırlarken eksik varsa tek cümleyle sor. Onay alırsan: [[CREATE_ORDER:{"customerId":"ID", "items":[{"productId":"ID", "quantity": ADET, "unitPrice": FİYAT}] }]]
    `

    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: contextString }] },
        { role: 'model', parts: [{ text: 'Anlaşıldı Erkan Bey, hazırım. Nasıl yardımcı olabilirim?' }] },
        ...history.slice(-10).map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.content || '') }]
        }))
      ]
    })

    const result = await chat.sendMessage(message)
    const text = (await result.response).text()

    return NextResponse.json({ content: text })
  } catch (error: any) {
    console.error('Chat Error:', error)
    return NextResponse.json({ error: 'Sistem şu an meşgul.' }, { status: 500 })
  }
}
