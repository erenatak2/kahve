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
      loyalCustomers,
      recentCallLogs,
      upcomingReminders,
      regionalDistribution
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
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 1 } }
      }),
      prisma.customer.count(),
      // Ürün Bilgileri
      prisma.product.findMany({ where: { isActive: true }, take: 5, orderBy: { stock: 'desc' } }),
      prisma.product.findMany({ where: { stock: { lte: 10 }, isActive: true }, take: 5 }),
      // Müşteri Segmentleri
      prisma.customer.findMany({ where: { isActive: true, notes: { contains: 'VİP' } }, take: 5, include: { user: true } }),
      // CRM: Son 5 Görüşme Notu
      prisma.callLog.findMany({
        take: 5,
        orderBy: { calledAt: 'desc' },
        include: { customer: { include: { user: true } } }
      }),
      // CRM: Yaklaşan Hatırlatmalar
      prisma.order.findMany({
        where: { reminderAt: { gte: now } },
        take: 5,
        orderBy: { reminderAt: 'asc' },
        include: { customer: { include: { user: true } } }
      }),
      // Bölgesel Dağılım
      prisma.customer.groupBy({
        by: ['region'],
        _count: { id: true },
        where: { isActive: true }
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
      
      GÖREVİN: Dükkanı sadece rakamla değil, "İnsan İlişkileri" (CRM) ve "Operasyonel Hatırlatmalar" ile bütünsel yönetmek.
      
      DÜKKAN VERİ ANALİZİ (GİZLİ PANEL):
      1. FİNANSAL:
         - Ciro: Bu ay ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL (Geçen ay: ${Number(lastMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL).
         - Tahsilat Gücü: Toplam ${Number(paidAmount).toLocaleString('tr-TR')} TL toplandı. Tahsilat oranımız %${collectionRate.toFixed(1)}. Alacağın ${Number(overdueAmount).toLocaleString('tr-TR')} TL'si vadesi geçmiş!
      
      2. STOK DURUMU:
         - Acil Tedarik Lazım: ${lowStockProducts.map(p => `${p.name} (${p.stock} ${p.unit})`).join(', ')}
      
      3. CRM VE OPERASYON (YENİ!):
         - Son Görüşmeler: ${recentCallLogs.map(l => `${l.customer?.user?.name}: ${l.note} (${l.outcome})`).join('\n')}
         - Yaklaşan Randevular/Hatırlatmalar: ${upcomingReminders.map(r => `${r.customer?.user?.name}: ${r.reminderNote} (Tarih: ${r.reminderAt?.toLocaleDateString('tr-TR')})`).join('\n')}
         - Bölgesel Gücümüz: ${regionalDistribution.map(r => `${r.region || 'Bilinmeyen'}: ${r._count.id} Müşteri`).join(', ')}
      
      4. MÜŞTERİ RİSKLERİ:
         - Borçlu ve Kritik: ${pendingOverdue.map(p => `${p.order?.customer?.user?.name || 'Müşteri'} (${Number(p.amount || 0).toLocaleString('tr-TR')} TL)`).join(', ')}
         - Uyuyanlar: ${atRiskList.map(c => `${c.name} (Son sipariş: ${c.last})`).join(', ')}
      
      STRATEJİK TALİMATLAR:
      - Erkan Bey "Bugün ne yapalım?" derse, hem tahsilatları hem de yaklaşan randevuları (randevu listesindekileri) birleştirip bir "Günlük Plan" sun.
      - Son görüşmelerdeki negatif durumları (örneğin "ulaşılamadı") fark et ve "Bunu tekrar arayalım" de.
      - Bölgesel dağılıma bakarak, "Şu bölgede az müşterimiz var, oraya mı odaklansak?" gibi büyüme önerileri ver.
      - Cevaplarında mutlaka Markdown kullan, önemli kısımları **kalın** yap ve Erkan Bey'in vaktini çalmadan net konuş.
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
