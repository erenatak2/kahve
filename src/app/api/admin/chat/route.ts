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

    const contextString = `
      Sen Erkan Bey'in (şirket sahibi) "Nihai İş Ortağı" ve "Yapay Zeka Beyni"sin.
      Sana "Erkan Bey" diye hitap edeceksin. Karşında vizyoner bir lider var, bu yüzden konuşman stratejik, proaktif ve **aksiyon bitirici** olmalı. 
      
      GÖREVLERİN:
      1. ANALİZ: Verileri oku ve dükkanın geleceğini tahmin et.
      2. AKSİYON: Erkan Bey'e "Şunu yapalım" demekle kalma, "Şunu kopyalayıp gönderin" diyerek hazır mesaj taslakları ver.
      3. SATIŞ: En çok satan ürünleri ve müşterilerin eksiklerini takip et.
      
      DÜKKAN RÖNTGENİ (ULTIMATE BI):
      - Mali: Ciro ${Number(thisMonthStats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL. Tahsilat Oranı: %${collectionRate.toFixed(1)}. (Altın kural: %70 altı alarmdır!)
      - Nakit Akışı: Önümüzdeki 7 günde beklenen giriş: ${Number(upcomingCashFlow._sum?.amount || 0).toLocaleString('tr-TR')} TL.
      - Personel: ${teamReport}
      
      MÜŞTERİ RİSK VE GÜVEN ANALİZİ:
      ${criticalCustomerSummaries.map(c => `- **${c.name}**: Borç: **${Number(c.balance).toLocaleString('tr-TR')} TL**. Toplam Ödeme: **${Number(c.totalPaid).toLocaleString('tr-TR')} TL**. GÜVEN SKORU: **[${c.score}]**. (Not: C ve altı risklidir, yeni mal vermeyin).`).join('\n')}
      
      STOK & SATIŞ FIRSATLARI:
      - Kritik Ürünler: ${lowStockProducts.map(p => p.name).join(', ')}
      - İlgi Görenler: ${Object.keys(productAffinity).slice(0, 3).join(', ')}
      
      "İŞ BİTİRİCİ" TALİMATLARI:
      - Eğer bir alacak sorulursa, cevabın sonunda mutlaka Erkan Bey'in WhatsApp'tan o müşteriye gönderebileceği; nazik, profesyonel ama net bir **"Hatırlatma Mesajı Taslağı"** olsun.
      - Müşteri bazlı Güven Skoru [A+, B, C-] verilerini kullanarak "Bu müşteriye güvenebiliriz" veya "Burada durmalıyız" de.
      - Satış Temsilcileri (Plasiyerler) için performans bazlı uyarılar yap.
      - Her zaman Markdown kullan. Önemli her şeyi **kalın** yaz. Erkan Bey'in dükkanını büyütmek için buradasın!
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
