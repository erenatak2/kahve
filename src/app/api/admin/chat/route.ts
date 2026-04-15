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
      regionalDistribution,
      sellerStats,
      upcomingCashFlow
    ] = await Promise.all([
      // Genel ve Aylık Özetler
      prisma.order.aggregate({ _count: true, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: firstDayOfMonth } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } } }),
      
      // Tahsilat Durumu (Genel)
      prisma.payment.groupBy({ by: ['status'], _sum: { amount: true } }),
      
      // Kritik Alacaklılar ve Müşteri Detaylı Özet
      prisma.payment.findMany({
        where: { status: 'GECIKTI' },
        take: 12,
        orderBy: { dueDate: 'asc' },
        include: { 
          order: { 
            include: { 
              customer: { 
                include: { 
                  user: { select: { name: true } },
                  orders: { select: { totalAmount: true } },
                  paymentNotifications: { where: { status: 'ONAYLANDI' }, select: { amount: true } }
                } 
              } 
            } 
          } 
        }
      }),
      
      // Riskli Müşteriler
      prisma.customer.findMany({
        where: { isActive: true },
        take: 20,
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 1 } }
      }),
      
      prisma.customer.count(),
      
      // Ürün Bilgileri
      prisma.product.findMany({ where: { isActive: true }, take: 5, orderBy: { stock: 'desc' } }),
      prisma.product.findMany({ where: { stock: { lte: 10 }, isActive: true }, take: 5 }),
      
      // Müşteri Segmentleri (VİP)
      prisma.customer.findMany({ 
        where: { isActive: true, notes: { contains: 'VİP' } }, 
        take: 5, 
        include: { user: { select: { name: true } } } 
      }),
      
      // CRM
      prisma.callLog.findMany({ take: 5, orderBy: { calledAt: 'desc' }, include: { customer: { include: { user: true } } } }),
      prisma.order.findMany({ 
        where: { reminderAt: { gte: now } }, 
        take: 5, 
        orderBy: { reminderAt: 'asc' }, 
        include: { customer: { include: { user: true } } } 
      }),
      
      // Bölgesel
      prisma.customer.groupBy({ by: ['region'], _count: { id: true }, where: { isActive: true } }),
      
      // 4. Ekip Performansı (Plasiyer/Satıcı bazlı)
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
      }),
      
      // 5. Nakit Akışı Tahmini (Önümüzdeki 7 gün vadesi dolanlar)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { 
          status: 'BEKLIYOR',
          dueDate: { 
            gte: now, 
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) 
          }
        }
      })
    ])

    // 5. Çapraz Satış ve Ürün Analizi (Ürün bazlı ilgi)
    const orderItemsSample = await prisma.orderItem.findMany({
      take: 50,
      orderBy: { id: 'desc' },
      select: { product: { select: { name: true, category: true } } }
    })

    const productAffinity = orderItemsSample.reduce((acc: any, item) => {
      const name = item.product.name
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})

    // Finansal rakamları temizle
    const paidAmount = paymentStats.find(p => p.status === 'ODENDI')?._sum.amount || 0
    const pendingAmount = paymentStats.find(p => p.status === 'BEKLIYOR')?._sum.amount || 0
    const overdueAmount = paymentStats.find(p => p.status === 'GECIKTI')?._sum.amount || 0
    const totalReceivable = pendingAmount + overdueAmount
    const collectionRate = paidAmount > 0 ? (paidAmount / (paidAmount + totalReceivable)) * 100 : 0

    // Müşteri bazlı özetleri hazırla (Ömer Faruk gibi sorular için + GÜVEN SKORU)
    const criticalCustomerSummaries = pendingOverdue.map(p => {
      const cust = p.order?.customer
      const totalBought = cust?.orders.reduce((sum, o) => sum + o.totalAmount, 0) || 0
      const totalPaid = cust?.paymentNotifications.reduce((sum, pn) => sum + pn.amount, 0) || 0
      const balance = totalBought - totalPaid
      
      // Güven Skoru Hesaplama (Basit Algoritma)
      let score = 'B'
      if (totalPaid > totalBought * 0.8) score = 'A+'
      else if (totalPaid > totalBought * 0.5) score = 'B+'
      else if (totalPaid < totalBought * 0.2) score = 'C-'

      return {
        name: cust?.user?.name || 'Bilinmeyen',
        outstanding: p.amount,
        dueDate: p.dueDate?.toLocaleDateString('tr-TR'),
        totalBought,
        totalPaid,
        balance,
        score
      }
    })

    // Ekip performansını işle
    const teamReport = sellerStats.map(s => {
      const totalSales = s.sellerCustomers.reduce((sum, c) => sum + c.orders.reduce((os, o) => os + o.totalAmount, 0), 0)
      const totalCollected = s.sellerCustomers.reduce((sum, c) => sum + c.paymentNotifications.reduce((ps, p) => ps + p.amount, 0), 0)
      const rate = totalSales > 0 ? (totalCollected / totalSales) * 100 : 0
      return `${s.name}: ${Number(totalSales).toLocaleString('tr-TR')} TL Satış (Tahsilat Başarısı: %${rate.toFixed(0)})`
    }).join(', ')

    // 6. MASTER DATA: Müşteriler ve Ürünler (Sipariş hazırlama için)
    const allCustomersShort = await prisma.customer.findMany({
      select: { id: true, user: { select: { name: true } }, discountRate: true }
    })
    const allProductsShort = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: { id: true, name: true, salePrice: true, code: true, stock: true, unit: true }
    })

    const contextString = `
      Sen Erkan Bey'in (şirket sahibi) "Nihai İş Ortağı" ve "Yapay Zeka Beyni"sin.
      Sana "Erkan Bey" diye hitap edeceksin. Karşında vizyoner bir lider var, bu yüzden konuşman stratejik, proaktif ve **aksiyon bitirici** olmalı. 
      
      GÖREVLERİN:
      1. ANALİZ: Verileri oku ve dükkanın geleceğini tahmin et.
      2. AKSİYON: Erkan Bey'e "Şunu yapalım" demekle kalma, "Şunu kopyalayıp gönderin" diyerek hazır mesaj taslakları ver.
      3. SİPARİŞ HAZIRLAMA (PROAKTİF): Erkan Bey bir sipariş komutu verdiğinde;
         - **Netleştir:** Eğer müşteri tam belli değilse, hangi üründen kaç adet olduğu yazılmadıysa ASLA taslak oluşturma. Nazikçe "Hangi ürün Erkan Bey?" veya "Kaç adet hazırlıyoruz?" diye sor.
         - **Öneride Bulun:** Eğer miktar söylenmediyse müşterinin geçmiş ortalama alımına bakıp "Genelde 10 koli alırdı, yine 10 koli mi yapalım?" diye zekice sormayı dene.
         - **Sadece her şey NET olduğunda** cevabın en sonuna gizli JSON bloğunu ekle.
      
      MASTER DATA (HAFIZAN):
      - Müşteriler: ${JSON.stringify(allCustomersShort.map(c => ({ id: c.id, name: c.user?.name })))}
      - Ürünler: ${JSON.stringify(allProductsShort.map(p => ({ id: p.id, name: p.name, price: p.salePrice, code: p.code })))}
      
      DÜKKAN RÖNTGENİ (ULTIMATE BI):
      - Mali: Ciro ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL. Tahsilat Oranı: %${collectionRate.toFixed(1)}.
      - Nakit Akışı: 7 günlük beklenen giriş: ${Number(upcomingCashFlow._sum?.amount || 0).toLocaleString('tr-TR')} TL.
      
      MÜŞTERİ RİSK ANALİZİ:
      ${criticalCustomerSummaries.map(c => `- **${c.name}**: Borç: **${Number(c.balance).toLocaleString('tr-TR')} TL**. Puan: **[${c.score}]**.`).join('\n')}
      
      "İŞ BİTİRİCİ" TALİMATLARI:
      - SİPARİŞ KOMUTU: Her şey (Müşteri, Ürün, Adet) netleşmeden taslak OLUŞTURMA. Önceliğin hatasız işlem yapmaktır.
      - Onay aldığında EN SONA şu formatı ekle: [[CREATE_ORDER:{"customerId":"ID", "items":[{"productId":"ID", "quantity": ADET, "unitPrice": FİYAT}] }]]
      - RAPOR TALEBİ: Markdown TABLOSU kullan. 
      - Tahsilat için WhatsApp taslağı vermeyi asla unutma.
      - Her zaman Markdown kullan. Önemli her şeyi **kalın** yaz. 
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
