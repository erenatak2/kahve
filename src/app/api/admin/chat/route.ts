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
      totalCustomers,
      topProducts,
      lowStockProducts,
      loyalCustomers
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
      // Kritik Gecikmiş Ödemeler
      prisma.payment.findMany({
        where: { status: 'GECIKTI' },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: { order: { include: { customer: { include: { user: true } } } } }
      }),
      // Riskli Müşteriler (Siparişi kesenler)
      prisma.customer.findMany({
        where: { isActive: true },
        take: 30,
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 3 } }
      }),
      prisma.customer.count(),
      // En Çok Satan Ürünler
      prisma.product.findMany({
        where: { isActive: true },
        take: 5,
        orderBy: { stock: 'desc' } // Örnek olarak stok üzerinden, normalde sipariş kalemlerinden sayılmalı
      }),
      // Kritik Stok Uyarıları
      prisma.product.findMany({
        where: { stock: { lte: 10 }, isActive: true },
        take: 5
      }),
      // Sadık ve Düzenli Müşteriler
      prisma.customer.findMany({
        where: { isActive: true, notes: { contains: 'VİP' } }, // Veya sipariş sayısına göre
        take: 5,
        include: { user: true }
      })
    ])

    // Tahsilat rakamlarını işle
    const paidAmount = paymentStats.find(p => p.status === 'ODENDI')?._sum.amount || 0
    const pendingAmount = paymentStats.find(p => p.status === 'BEKLIYOR')?._sum.amount || 0
    const overdueAmount = paymentStats.find(p => p.status === 'GECIKTI')?._sum.amount || 0
    const totalReceivable = pendingAmount + overdueAmount
    const collectionRate = paidAmount > 0 ? (paidAmount / (paidAmount + totalReceivable)) * 100 : 0

    // Riskli isimleri ayıkla
    const atRiskList = atRiskSamples
      .filter(c => {
        if (!c.orders || !c.orders[0]) return true
        const lastOrder = new Date(c.orders[0].createdAt)
        const daysSince = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > (c.avgOrderDays || 30) * 1.2
      })
      .map(c => ({ name: c.user?.name || 'Bilinmeyen', last: c.orders[0]?.createdAt.toLocaleDateString('tr-TR') || 'Yok' }))
      .slice(0, 5)

    const contextString = `
      Sen Erkan Bey'in (şirket sahibi) Senior Satış ve Operasyon Direktörüsün. 
      Sana "Erkan Bey" diye hitap edeceksin. Karşında çok tecrübeli bir iş adamı var, bu yüzden konuşman son derece kurumsal, vakur, dürüst ve vizyoner olmalı. 
      Lafı uzatmadan, doğrudan veriye dayalı stratejik analizler sunmalısın.
      
      GÖREVİN: Dükkanı Erkan Bey ile birlikte yönetmek. Sadece bilgi vermek yetmez; riskleri önceden sezmeli, stok krizlerini engellemeli ve satış artırıcı hamleler önermelisin.
      
      DÜKKAN VERİ ANALİZİ (GİZLİ PANEL):
      1. FİNANSAL:
         - Ciro: Bu ay ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL (Geçen ay: ${Number(lastMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL).
         - Tahsilat Gücü: Toplam ${Number(paidAmount).toLocaleString('tr-TR')} TL toplandı. Tahsilat oranımız %${collectionRate.toFixed(1)}.
         - Riskli Alacaklar: ${Number(overdueAmount).toLocaleString('tr-TR')} TL vadesi geçmiş borç var.
      
      2. STOK VE ÜRÜN:
         - Kritik Stok (Acil Tedarik Lazım): ${lowStockProducts.map(p => `${p.name} (${p.stock} ${p.unit})`).join(', ')}
         - Popüler Ürünler: ${topProducts.map(p => p.name).join(', ')}
      
      3. MÜŞTERİ PORTFÖYÜ:
         - Toplam Müşteri: ${totalCustomers}
         - Kritik Borçlular: ${pendingOverdue.map(p => `${p.order?.customer?.user?.name || 'Müşteri'} (${Number(p.amount || 0).toLocaleString('tr-TR')} TL)`).join(', ')}
         - Kaybedilmek Üzere Olanlar: ${atRiskList.map(c => `${c.name} (Son sipariş: ${c.last})`).join(', ')}
         - Sadık/VİP Müşteriler: ${loyalCustomers.map(c => c.user?.name).join(', ')}
      
      STRATEJİK TALİMATLAR:
      - Eğer tahsilat oranı düşükse Erkan Bey'e nakit akışı revizyonu öner.
      - Stokları bitmek üzere olan ürünler için "Satışları buralara yönlendirmeyelim veya acil alım yapalım" de.
      - Siparişi kesen müşteriler için "Bu hafta bizzat ziyaret edelim mi?" gibi saha önerileri ver.
      - Erkan Bey'e her zaman "Yol arkadaşı" gibi yaklaş ama hiyerarşiyi (Erkan Bey asıl patrondur) asla bozma.
      - Cevaplarında mutlaka Markdown kullan, önemli kısımları **kalın** yap.
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
