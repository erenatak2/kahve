import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    // Body kontrolü
    const body = await req.json().catch(() => ({}))
    const { message, history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Mesaj içeriği boş olamaz.' }, { status: 400 })
    }

    // API Key Kontrolü (Handler içinde taze okuma)
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing in environment variables')
      return NextResponse.json({ error: 'AI anahtarı sunucuda bulunamadı. Lütfen ayarları kontrol edin.' }, { status: 500 })
    }

    // 1. CRM Bağlamını Topla (Analitik Veriler)
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      stats,
      thisMonthStats,
      lastMonthStats,
      paymentStats,
      pendingOverdue,
      atRiskSamples,
      totalCustomers
    ] = await Promise.all([
      // Genel Özet
      prisma.order.aggregate({
        _count: true,
        _sum: { totalAmount: true }
      }),
      // Bu Ayki Performans
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: firstDayOfMonth } }
      }),
      // Geçen Ayki Performans
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } }
      }),
      // Tahsilat Durumu
      prisma.payment.groupBy({
        by: ['status'],
        _sum: { amount: true }
      }),
      // Sadece en kritik 10 gecikmiş ödeme
      prisma.payment.findMany({
        where: { status: 'GECIKTI' },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: { order: { include: { customer: { include: { user: true } } } } }
      }),
      // Risk grubundan örnekler
      prisma.customer.findMany({
        where: { isActive: true },
        take: 50,
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 1 } }
      }),
      prisma.customer.count()
    ])

    // Tahsilat rakamlarını işle
    const paidAmount = paymentStats.find(p => p.status === 'ODENDI')?._sum.amount || 0
    const pendingAmount = paymentStats.find(p => p.status === 'BEKLIYOR')?._sum.amount || 0
    const overdueAmount = paymentStats.find(p => p.status === 'GECIKTI')?._sum.amount || 0
    const totalReceivable = pendingAmount + overdueAmount
    const collectionRate = paidAmount > 0 ? (paidAmount / (paidAmount + totalReceivable)) * 100 : 0

    // Riskli isimleri ayıkla (Akıllı mantık)
    const atRiskList = atRiskSamples
      .filter(c => {
        if (!c.orders || !c.orders[0]) return true // Hiç siparişi olmayanlar risklidir
        const lastOrder = new Date(c.orders[0].createdAt)
        const daysSince = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > (c.avgOrderDays || 30) * 1.2
      })
      .map(c => ({
        name: c.user?.name || 'Bilinmeyen',
        lastOrder: c.orders[0]?.createdAt.toLocaleDateString('tr-TR') || 'Yok',
        totalOrders: c.orders.length
      }))
      .slice(0, 8)

    const contextString = `
      Sen Erkan Bey'in (şirket sahibi) Stratejik Danışmanı ve Sağ Kolusun. 
      Sana "Erkan Bey" diye hitap etmeni istiyoruz. Tonun profesyonel, dürüst ve aksiyon odaklı olsun.
      
      GÖREVİN: Sadece soru cevaplamak değil, verileri yorumlayıp Erkan Bey'e akıllıca tavsiyeler vermektir.
      
      DÜKKAN FİNANSAL ANALİZİ:
      - Genel Durum: Toplam ${stats._count} siparişte ${Number(stats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL ciro yapıldı.
      - Aylık Performans: Bu ay ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL cirodasınız. Geçen ay toplam ${Number(lastMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL ciro yapılmıştı.
      - Tahsilat Gücü: Şu ana kadar ${Number(paidAmount).toLocaleString('tr-TR')} TL nakit toplandı. İçeride ${Number(totalReceivable).toLocaleString('tr-TR')} TL alacağınız var (bunun ${Number(overdueAmount).toLocaleString('tr-TR')} TL'si vadesi geçmiş!).
      - Tahsilat Oranı: %${collectionRate.toFixed(1)}. (Eğer %70 altındaysa Erkan Bey'i uyar!)
      
      KRİTİK MÜŞTERİLER/ALACAKLAR:
      ${pendingOverdue.map(p => `- ${p.order?.customer?.user?.name || 'Müşteri'}: ${Number(p.amount || 0).toLocaleString('tr-TR')} TL (Vadesi: ${p.dueDate?.toLocaleDateString('tr-TR')})`).join('\n')}
      
      UYUYAN/RİSKLİ MÜŞTERİLER (Siparişi kesenler):
      ${atRiskList.map(c => `- ${c.name}: Son sipariş ${c.lastOrder} tarihinde.`).join('\n')}
      
      ERKAN BEY İÇİN ÖNERİLER:
      1. Tahsilat oranı %70 altındaysa nakit akışı uyarısı yap.
      2. Geçen aya göre ciro düşük gidiyorsa satışları artırma önerisi sun.
      3. Uyuyan müşterileri tek tek sayıp "Bunları arayalım mı?" de.
      4. Eğer borçlu birini sorarsa sadece rakamı değil, "Yeni mal vermeden önce bu bakiyeyi kapatalım mı?" gibi stratejik fikirler ver.
    `

    // Gemini Başlatma
    const genAI = new GoogleGenerativeAI(apiKey)
    // Orijinal modele (gemini-1.5-flash) deprecate olduğu için gemini-2.5-flash'a geçiyoruz
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: contextString }] },
        { role: 'model', parts: [{ text: 'Anlaşıldı Erkan Bey! Ben hazırım. Dükkanın özet verileri elimde. Size nasıl yardımcı olabilirim? Hangi müşteriyi soracaksınız veya bugünkü planınızı mı yapalım?' }] },
        ...history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.content || '') }]
        }))
      ]
    })

    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ content: text })
  } catch (error: any) {
    console.error('Chat API Detailed Error:', error)
    
    // Daha açıklayıcı hata mesajları
    let errorMsg = 'AI şu an meşgul, lütfen birazdan tekrar deneyin.'
    const errorMessage = error?.message?.toLowerCase() || ''
    
    if (errorMessage.includes('api key') || errorMessage.includes('api_key_invalid')) {
      errorMsg = 'AI anahtarı (GEMINI_API_KEY) hatalı veya geçersiz. Lütfen ayarları kontrol edin.'
    } else if (errorMessage.includes('safety')) {
      errorMsg = 'Sorunuz güvenlik filtrelerine takıldı. Lütfen farklı şekilde sorun.'
    } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      errorMsg = 'AI kullanım kotası doldu. Lütfen biraz bekleyin.'
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorMsg = 'AI modeli (gemini-1.5-flash) bulunamadı. Lütfen sistemde bu modelin aktif olduğundan emin olun veya gemini-pro deneyin.'
    }

    return NextResponse.json({ 
      error: errorMsg,
      debug: error?.message, 
      type: error?.name || 'Error'
    }, { status: 500 })
  }
}
